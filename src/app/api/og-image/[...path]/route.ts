import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const dynamic = "force-dynamic";

// ✅ Universal image proxy for OG crawlers (WhatsApp, LinkedIn, etc.)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const reqUrl = new URL(request.url);
  const fallbackLogo = new URL("/logo.png", reqUrl.origin).toString();

  // Support direct ?url= query parameter or catchall path
  let targetUrl = reqUrl.searchParams.get("url") || "";

  if (!targetUrl && path && path.length > 0) {
    let joined = path.join("/");
    // Fix single slash after protocol (e.g. https:/domain -> https://domain)
    joined = joined.replace(/^(https?:\/)(?!\/)/, "$1/");
    // Fix excess slashes after protocol
    joined = joined.replace(/^(https?:\/\/)\/+/, "$1");

    if (joined.startsWith("http://") || joined.startsWith("https://")) {
      targetUrl = joined;
    } else {
      const externalBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://chasescroll-sharelink.vercel.app").replace(/\/+$/, "");
      targetUrl = `${externalBaseUrl}/${joined.replace(/^\/+/, "")}`;
    }
  }

  if (!targetUrl) {
    return NextResponse.redirect(fallbackLogo, 302);
  }

  try {
    const res = await fetchWithTimeout(targetUrl, { cache: "no-store" }, 6000);

    if (!res.ok) {
      return NextResponse.redirect(fallbackLogo, 302);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType =
      res.headers.get("content-type") ||
      "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("OG image proxy fetch failed for:", targetUrl, error);
    // Graceful redirect to fallback logo to avoid 4xx/5xx error spikes on Vercel
    return NextResponse.redirect(fallbackLogo, 302);
  }
}
