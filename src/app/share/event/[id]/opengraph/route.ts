import { NextResponse } from "next/server";
import { RESOURCE_URL } from "@/constants";
import { capitalizeFLetter } from "@/utils/capitalizeLetter";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://test-api.chasescroll.com";
    const apiBaseUrl = rawBaseUrl.replace(/\/+$/, "");
    const url = new URL(request.url);
    const affiliateID = url.searchParams.get("affiliateID");
    const fallbackLogo = `${url.origin}/logo.png`;

    const redirectPath = `/share/event/${id}${
        affiliateID ? `?affiliateID=${encodeURIComponent(affiliateID)}` : ""
    }`;
    const redirectUrl = new URL(redirectPath, url.origin).toString();
    const currentPageUrl = url.toString();

    try {
        const res = await fetchWithTimeout(
            `${apiBaseUrl}/events/events?id=${id}`,
            { cache: "no-store" },
            6000
        );

        const data = res.ok ? await res.json() : null;
        const event = data?.content?.[0];

        const eventName = event?.eventName
            ? capitalizeFLetter(event.eventName)
            : "Event | Chasescroll";
        const eventDescription =
            event?.eventDescription || "Check out this event on Chasescroll";

        let imageUrl = fallbackLogo;
        if (event?.picUrls && Array.isArray(event.picUrls) && event.picUrls.length > 0) {
            const firstPic = event.picUrls[0];
            imageUrl = firstPic.startsWith("http") ? firstPic : `${RESOURCE_URL}${firstPic}`;
        } else if (event?.currentPicUrl) {
            imageUrl = event.currentPicUrl.startsWith("http") ? event.currentPicUrl : `${RESOURCE_URL}${event.currentPicUrl}`;
        }

        const html = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>${eventName} | Chasescroll</title>

                    <!-- Open Graph -->
                    <meta property="og:type" content="website" />
                    <meta property="og:title" content="${eventName}" />
                    <meta property="og:description" content="${eventDescription}" />
                    <meta property="og:image" content="${imageUrl}" />
                    <meta property="og:image:secure_url" content="${imageUrl}" />
                    <meta property="og:image:width" content="1200" />
                    <meta property="og:image:height" content="630" />
                    <meta property="og:url" content="${currentPageUrl}" />
                    <meta property="og:site_name" content="Chasescroll" />

                    <!-- Twitter -->
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="${eventName}" />
                    <meta name="twitter:description" content="${eventDescription}" />
                    <meta name="twitter:image" content="${imageUrl}" />

                    <!-- Redirect -->
                    <meta http-equiv="refresh" content="0; url=${redirectUrl}" />

                    <style>
                        body {
                            margin: 0;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            background-color: #0d1117;
                            color: #ffffff;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            text-align: center;
                            padding: 20px;
                        }
                        .image-container {
                            width: 100%;
                            max-width: 600px;
                            max-height: 350px;
                            overflow: hidden;
                            border-radius: 12px;
                            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                            margin-bottom: 20px;
                        }
                        .image-container img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            display: block;
                        }
                        h1 {
                            font-size: 1.5rem;
                            margin: 0 0 10px 0;
                        }
                        p {
                            color: #8b949e;
                            font-size: 0.95rem;
                            max-width: 500px;
                            margin: 0 auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="image-container">
                        <img src="${imageUrl}" alt="${eventName}" />
                    </div>
                    <h1>${eventName}</h1>
                    <p>${eventDescription}</p>

                    <script>
                        setTimeout(() => {
                            window.location.replace(${JSON.stringify(redirectUrl)});
                        }, 500);
                    </script>
                </body>
            </html>
        `;

        return new NextResponse(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("Error generating OG page for share/event:", error);
        // Fallback without throwing 500
        const fallbackHtml = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <title>Event | Chasescroll</title>
                    <meta property="og:title" content="Event | Chasescroll" />
                    <meta property="og:image" content="${fallbackLogo}" />
                    <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
                </head>
                <body>
                    <script>window.location.href = ${JSON.stringify(redirectUrl)};</script>
                </body>
            </html>
        `;
        return new NextResponse(fallbackHtml, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
        });
    }
}
