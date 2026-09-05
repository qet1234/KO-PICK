# Android 플랫폼 설정

`android.ts`에서 Application ID, versionCode, App Links, 아이콘, 권한과
Google Play 빌드에 필요한 Android 네이티브 값을 관리합니다.

공통 Expo 설정은 `../../app.config.ts`에 두고 Android 전용 값은
`android.ts`에 추가합니다. 네이티브 모듈, 권한, 아이콘 또는 딥링크 변경은
OTA 업데이트만 배포하지 않고 새 AAB를 생성합니다.

## 빌드

```bash
cd mobile
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile internal
```

운영 OTA 채널은 `production`이며 자동 업데이트 워크플로도 Android만 게시합니다.
