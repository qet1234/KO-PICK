import { NextResponse } from "next/server";
import { latestAndroidApkUrl } from "./latest-apk";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export const dynamic = "force-dynamic";

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
    return NextResponse.redirect(downloadUrl, 307);
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

    return NextResponse.json({ ready: true }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { ready: false },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
