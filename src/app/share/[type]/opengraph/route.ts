import { NextResponse } from "next/server";
import { RESOURCE_URL } from "@/constants";
import { capitalizeFLetter } from "@/utils/capitalizeLetter";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://test-api.chasescroll.com";
  const apiBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  const { type } = await params;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const fallbackLogo = `${url.origin}/logo.png`;
  const redirectUrl = id ? `${url.origin}/share/${type}?id=${id}` : `${url.origin}/share/${type}`;

  const typeConfig: Record<string, { endpoint: string; nameKey: string; imgKey: string; fallbackTitle: string }> = {
    event: { endpoint: "events/events", nameKey: "eventName", imgKey: "currentPicUrl", fallbackTitle: "Event" },
    fundraiser: { endpoint: "fund-raiser/search", nameKey: "name", imgKey: "bannerImage", fallbackTitle: "Fundraiser" },
    product: { endpoint: "products/search", nameKey: "name", imgKey: "images", fallbackTitle: "Product" },
    rental: { endpoint: "rental/search", nameKey: "name", imgKey: "images", fallbackTitle: "Rental" },
    service: { endpoint: "business-service/search", nameKey: "name", imgKey: "images", fallbackTitle: "Service" },
  };

  const currentConfig = typeConfig[type.toLowerCase()] || typeConfig.event;

  try {
    let title = `${currentConfig.fallbackTitle} | Chasescroll`;
    let description = "View details on Chasescroll";
    let imageUrl = fallbackLogo;

    if (id) {
      const res = await fetchWithTimeout(`${apiBaseUrl}/${currentConfig.endpoint}?id=${id}`, {
        cache: "no-store",
      }, 6000);

      if (res.ok) {
        const data = await res.json();
        const item = data?.content?.[0];
        if (item) {
          title = item[currentConfig.nameKey] ? `${capitalizeFLetter(item[currentConfig.nameKey])} | Chasescroll` : title;
          description = item.description || item.eventDescription || description;
          
          const rawImg = item[currentConfig.imgKey];
          if (Array.isArray(rawImg) && rawImg.length > 0 && typeof rawImg[0] === "string") {
            imageUrl = rawImg[0].startsWith("http") ? rawImg[0] : `${RESOURCE_URL}${rawImg[0]}`;
          } else if (typeof rawImg === "string") {
            imageUrl = rawImg.startsWith("http") ? rawImg : `${RESOURCE_URL}${rawImg}`;
          }
        }
      }
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
          <meta property="og:url" content="${url.toString()}" />
          <meta property="og:site_name" content="Chasescroll" />

          <!-- Twitter -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${imageUrl}" />

          <!-- Redirect -->
          <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
        </head>
        <body>
          <script>
            window.location.replace(${JSON.stringify(redirectUrl)});
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
    console.error("Error generating OG page for share/[type]:", error);
    const fallbackHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Chasescroll</title>
          <meta property="og:title" content="Chasescroll" />
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
