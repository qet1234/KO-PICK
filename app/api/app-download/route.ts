import { NextResponse } from "next/server";

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.koreapick.app";

export function GET() {
  return NextResponse.redirect(GOOGLE_PLAY_URL, 307);
}
