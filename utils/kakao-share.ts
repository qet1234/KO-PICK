import "client-only";

const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const SDK_INTEGRITY = "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";
const SDK_ID = "kakao-javascript-sdk";

type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (settings: {
      buttonTitle?: string;
      link: { mobileWebUrl: string; webUrl: string };
      objectType: "text";
      text: string;
    }) => void;
  };
};

declare global {
  interface Window { Kakao?: KakaoSdk }
}

let sdkPromise: Promise<KakaoSdk> | null = null;

function loadKakaoSdk() {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<KakaoSdk>((resolve, reject) => {
    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const onLoad = () => window.Kakao ? resolve(window.Kakao) : reject(new Error("카카오 SDK를 초기화하지 못했습니다."));
    const onError = () => reject(new Error("카카오 SDK를 불러오지 못했습니다."));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.id = SDK_ID;
      script.src = SDK_URL;
      script.integrity = SDK_INTEGRITY;
      script.crossOrigin = "anonymous";
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return sdkPromise;
}

export async function shareCourseOnKakao(input: { description: string; title: string; url: string }) {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!key) throw new Error("KAKAO_SDK_NOT_CONFIGURED");
  const kakao = await loadKakaoSdk();
  if (!kakao.isInitialized()) kakao.init(key);
  kakao.Share.sendDefault({
    objectType: "text",
    text: `${input.title}\n${input.description}`,
    link: { mobileWebUrl: input.url, webUrl: input.url },
    buttonTitle: "코스 자세히 보기",
  });
}

export async function prepareKakaoShare() {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  if (!key) return false;
  const kakao = await loadKakaoSdk();
  if (!kakao.isInitialized()) kakao.init(key);
  return true;
}
