import { NextResponse } from "next/server";

const defaultAndroidApkUrl =
  "https://github.com/qet1234/KO-PICK/releases/download/android-latest/koreapick-latest.apk";

const androidApkUrl =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || defaultAndroidApkUrl;
const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export const dynamic = "force-dynamic";

function getDownloadUrl(platform: string | null) {
  return platform === "android" ? androidApkUrl : null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const statusOnly = requestUrl.searchParams.has("status");
  const platform = requestUrl.searchParams.get("platform");
  const downloadUrl = getDownloadUrl(platform);

  if (!downloadUrl) {
    return NextResponse.json(
      { ready: false },
      { status: 503, headers: noStoreHeaders },
    );
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

    if (statusOnly) {
      return NextResponse.json({ ready: true }, { headers: noStoreHeaders });
    }

    return NextResponse.redirect(downloadUrl, 307);
  } catch {
    return NextResponse.json(
      { ready: false },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
