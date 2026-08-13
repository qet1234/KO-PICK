import { NextResponse } from "next/server";
import { latestAndroidApkUrl, latestAndroidVersionCode } from "./latest-apk";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getDownloadUrl(platform: string | null) {
  return platform === "android" ? latestAndroidApkUrl : null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const statusOnly = requestUrl.searchParams.has("status");
  const explicitDownload = requestUrl.searchParams.get("download") === "1";
  const platform = requestUrl.searchParams.get("platform");
  const downloadUrl = getDownloadUrl(platform);

  if (!downloadUrl) {
    return NextResponse.json(
      { ready: false },
      { status: 503, headers: noStoreHeaders },
    );
  }

  if (!statusOnly && !explicitDownload) {
    return NextResponse.redirect(new URL("/download", request.url), 307);
  }

  if (explicitDownload) {
    try {
      const artifactResponse = await fetch(downloadUrl, {
        cache: "no-store",
        redirect: "follow",
      });

      if (!artifactResponse.ok || !artifactResponse.body) {
        return NextResponse.json(
          { ready: false, message: "APK 파일을 불러오지 못했습니다." },
          { status: 503, headers: noStoreHeaders },
        );
      }

      const headers = new Headers();
      headers.set("Content-Type", "application/vnd.android.package-archive");
      headers.set("Content-Disposition", 'attachment; filename="koreapick-latest.apk"');
      headers.set("Cache-Control", "private, no-store, max-age=0");
      headers.set("X-Content-Type-Options", "nosniff");

      const contentLength = artifactResponse.headers.get("content-length");
      if (contentLength) headers.set("Content-Length", contentLength);

      return new Response(artifactResponse.body, {
        status: 200,
        headers,
      });
    } catch {
      return NextResponse.json(
        { ready: false, message: "APK 다운로드 준비에 실패했습니다." },
        { status: 503, headers: noStoreHeaders },
      );
    }
  }

  try {
    const artifactResponse = await fetch(downloadUrl, {
      method: "HEAD",
      cache: "no-store",
      redirect: "follow",
    });

    if (!artifactResponse.ok) {
      return NextResponse.json(
        { ready: false },
        { status: 503, headers: noStoreHeaders },
      );
    }

    return NextResponse.json(
      {
        ready: true,
        versionCode: latestAndroidVersionCode,
        downloadUrl: "/api/app-download?platform=android&download=1",
      },
      { headers: noStoreHeaders },
    );
  } catch {
    return NextResponse.json(
      { ready: false },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
