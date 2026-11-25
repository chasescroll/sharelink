import { NextResponse } from "next/server";
import { RESOURCE_URL } from "@/constants";
import { capitalizeFLetter } from "@/utils/capitalizeLetter";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://test-api.chasescroll.com";
  const apiBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  const { id: eventId } = await params;
  const url = new URL(request.url);
  const fallbackLogo = `${url.origin}/logo.png`;
  const redirectUrl = `${url.origin}/event/${eventId}`;

  try {
    const res = await fetchWithTimeout(`${apiBaseUrl}/events/events?id=${eventId}`, {
      cache: "no-store",
    }, 6000);

    const data = res.ok ? await res.json() : null;
    const event = data?.content?.[0];

    const title = event?.eventName ? capitalizeFLetter(event.eventName) : "Event | Chasescroll";
    const description = event?.eventDescription || "Check out this event on Chasescroll";
    
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
          <title>${title}</title>
          <meta name="description" content="${description}" />

          <!-- Open Graph -->
          <meta property="og:type" content="website" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="og:url" content="${redirectUrl}" />
          <meta property="og:site_name" content="Chasescroll" />

          <!-- Twitter -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${imageUrl}" />

          <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
        </head>
        <body>
          <p>Redirecting to event...</p>
          <script>
            window.location.href = ${JSON.stringify(redirectUrl)};
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
    console.error("Error generating OG page for event:", error);
    // Graceful fallback to avoid 500 error spikes
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
