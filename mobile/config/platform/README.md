# Mobile platform separation

Android와 iOS의 네이티브 설정과 배포 경로를 분리하면서 React Native 공용 기능은 그대로 재사용합니다.

## Native config

- `android.ts`: Android 전용 Application ID, versionCode, App Links, adaptive icon, Android 권한
- `ios.ts`: iOS 전용 Bundle ID, buildNumber, Apple Sign In, Info.plist
- `../../app.config.ts`: 공통 Expo 설정과 플러그인을 유지하고 위 두 설정을 조합

플랫폼 전용 네이티브 값을 추가할 때는 `app.config.ts`에 직접 섞지 말고 해당 플랫폼 파일에 추가합니다.

## UI and runtime code

기존 `src` 코드는 Android/iOS 공용으로 유지합니다. 한 플랫폼에서만 다른 화면이나 컴포넌트가 필요할 때 React Native의 플랫폼 파일 규칙을 사용합니다.

- `Component.android.tsx`: Android 전용
- `Component.ios.tsx`: iOS 전용
- `Component.tsx`: 양쪽에서 동일할 때 공용

공통 기능을 불필요하게 복제하지 않습니다.

## EAS build and update separation

현재 배포 중인 Android 빌드와 OTA 업데이트 경로를 보호하기 위해 기존 Android production 경로는 변경하지 않습니다.

- Android production build profile: `production`
- Android update channel: `production`
- iOS TestFlight build profile: `testflight`
- iOS App Store build profile: `ios-production`
- iOS update channel: `production-ios`

따라서 iOS용 업데이트를 `production-ios`에 게시해도 기존 Android production 빌드에는 전달되지 않습니다. 반대로 Android `production` 채널 업데이트도 iOS release 빌드에는 전달되지 않습니다.

## Build commands

```bash
cd mobile

# Android Google Play용 AAB
npx eas-cli@latest build --platform android --profile production

# iOS TestFlight
npx eas-cli@latest build --platform ios --profile testflight

# iOS App Store용 production build
npx eas-cli@latest build --platform ios --profile ios-production
```

## Submit commands

```bash
# Android 내부 테스트 제출
npx eas-cli@latest submit --platform android --profile internal

# iOS TestFlight 제출
npx eas-cli@latest submit --platform ios --profile testflight

# iOS App Store Connect 제출
npx eas-cli@latest submit --platform ios --profile ios-production
```

iOS 제출 프로필에 App Store Connect의 `ascAppId`를 나중에 추가하면 비대화형 제출을 더 안정적으로 자동화할 수 있습니다. Apple 계정/앱 등록 전에는 빈 iOS 제출 옵션을 유지해 EAS CLI의 대화형 인증 흐름을 사용할 수 있습니다.

## Safety rules

1. Android만 수정할 때 `android.ts` 또는 `.android.tsx`만 변경합니다.
2. iOS만 수정할 때 `ios.ts` 또는 `.ios.tsx`만 변경합니다.
3. 공통 기능 수정은 양 플랫폼에 영향을 주므로 Android/iOS 둘 다 확인합니다.
4. 네이티브 모듈, 권한, 아이콘, 딥링크 등 native runtime에 영향을 주는 변경은 OTA만으로 배포하지 않고 새 스토어 빌드를 생성합니다.
5. `runtimeVersion`은 fingerprint 정책을 유지해 네이티브 코드와 호환되지 않는 OTA 업데이트가 적용되는 위험을 줄입니다.
