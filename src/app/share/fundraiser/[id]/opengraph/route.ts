import { NextResponse } from "next/server";
import { RESOURCE_URL } from "@/constants";
import { capitalizeFLetter } from "@/utils/capitalizeLetter";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://test-api.chasescroll.com";
  const apiBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  const { id } = await params;
  const url = new URL(request.url);
  const fallbackLogo = `${url.origin}/logo.png`;
  const redirectUrl = `${url.origin}/share/fundraiser/${id}`;

  try {
    const res = await fetchWithTimeout(`${apiBaseUrl}/fund-raiser/search?id=${id}`, {
      cache: "no-store",
    }, 6000);

    const data = res.ok ? await res.json() : null;
    const event = data?.content?.[0];

    const title = event?.name ? capitalizeFLetter(event.name) : "Fundraiser | Chasescroll";
    const description = event?.description || "Check out this fundraiser on Chasescroll";
    
    let imageUrl = fallbackLogo;
    if (event?.bannerImage) {
      imageUrl = event.bannerImage.startsWith("http")
        ? event.bannerImage
        : `${RESOURCE_URL}${event.bannerImage}`;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>

          <!-- Open Graph -->
          <meta property="og:type" content="website" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:url" content="${redirectUrl}" />
          <meta property="og:site_name" content="Chasescroll" />

          <!-- Twitter -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
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
            <img src="${imageUrl}" alt="${title}" />
          </div>
          <h1>${title}</h1>
          <p>${description}</p>

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
    console.error("Error generating OG page for fundraiser:", error);
    const fallbackHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Fundraiser | Chasescroll</title>
          <meta property="og:title" content="Fundraiser | Chasescroll" />
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
