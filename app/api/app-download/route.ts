import { NextResponse } from "next/server";

const defaultAndroidApkUrl =
  "https://github.com/qet1234/KO-PICK/releases/download/android-latest/koreapick-latest.apk";

const androidApkUrl =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || defaultAndroidApkUrl;

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const statusOnly = new URL(request.url).searchParams.has("status");

  try {
    const artifactResponse = await fetch(androidApkUrl, {
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

    return NextResponse.redirect(androidApkUrl, 307);
  } catch {
    return NextResponse.json(
      { ready: false },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
