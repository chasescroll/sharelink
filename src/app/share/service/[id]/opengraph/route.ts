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
  const fallbackLogo = `${url.origin}/logo.png`;
  const redirectUrl = `${url.origin}/share/service/${id}`;

  try {
    const res = await fetchWithTimeout(`${apiBaseUrl}/business-service/search?id=${id}`, {
      cache: "no-store",
    }, 6000);

    const data = res.ok ? await res.json() : null;
    const service = data?.content?.[0];

    const serviceName = service?.name ? capitalizeFLetter(service.name) : "Service | Chasescroll";
    const serviceDescription =
      service?.description || "Check out this service on Chasescroll";

    let imageUrl = fallbackLogo;
    if (service?.images && Array.isArray(service.images) && service.images.length > 0) {
      const firstImage = service.images[0];
      if (typeof firstImage === "string") {
        imageUrl = firstImage.startsWith("http") ? firstImage : `${RESOURCE_URL}${firstImage}`;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${serviceName} | Chasescroll</title>

          <!-- Open Graph -->
          <meta property="og:type" content="website" />
          <meta property="og:title" content="${serviceName}" />
          <meta property="og:description" content="${serviceDescription}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="og:image:secure_url" content="${imageUrl}" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:url" content="${url.toString()}" />
          <meta property="og:site_name" content="Chasescroll" />

          <!-- Twitter -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${serviceName}" />
          <meta name="twitter:description" content="${serviceDescription}" />
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
            <img src="${imageUrl}" alt="${serviceName}" />
          </div>
          <h1>${serviceName}</h1>
          <p>${serviceDescription}</p>

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
    console.error("Error generating OG page for service:", error);
    const fallbackHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Service | Chasescroll</title>
          <meta property="og:title" content="Service | Chasescroll" />
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
