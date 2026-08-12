# 오늘어디 Spring Boot API (보관용)

> 이 디렉터리는 과거 Spring Boot 백엔드의 복구 참고용 코드입니다.
> 현재 운영 웹·모바일 트래픽은 Vercel + Supabase Auth/PostgreSQL/RLS/Edge Functions를 사용하며 이 백엔드를 실행하지 않습니다.
> Render 배포 대상도 아닙니다.

## 과거 인증 구조

- 브라우저 로그인: Spring Security OAuth2 + PostgreSQL 세션
- API 인증: JWT Access Token(기본 15분)
- 재발급: HttpOnly Refresh Token 쿠키(기본 14일)
- Refresh Token 원문은 브라우저 쿠키에만 두고 데이터베이스에는 SHA-256 해시만 저장
- Redis 미사용

로그인 성공 후 프론트엔드는 세션으로 `/api/auth/token`을 호출해 JWT를 발급받는 구조였습니다. Access Token은 브라우저 메모리에만 보관했습니다.

## 로컬 복구 테스트

필요한 경우에만 `backend/.env.example`을 기준으로 로컬 PostgreSQL, OAuth 공급자, JWT 서명키를 설정합니다. `application.yml`의 OAuth redirect 기본값은 로컬 복구 테스트용 `http://localhost:8080`이며, 운영 주소를 기본값으로 포함하지 않습니다.

## 주요 API

| 경로 | 기능 | 인증 |
|---|---|---|
| `GET /api/auth/me` | 로그인 사용자 | 세션 또는 JWT |
| `POST /api/auth/token` | JWT 발급 | 세션 |
| `POST /api/auth/refresh` | JWT 재발급 | Refresh Token |
| `POST /api/auth/logout` | 세션·Refresh Token 폐기 | 선택 |
| `DELETE /api/web/account` | 회원탈퇴 | 세션 |
| `/api/public/tour/places` | TourAPI 장소 | 공개 |
| `/api/public/trending-*` | 실시간 인기 데이터 | 공개 |

## 데이터베이스

Flyway가 회원, Refresh Token, 인기 데이터, Spring Session 테이블을 생성하는 과거 구조입니다. 기존 Supabase `auth.users`가 있으면 첫 마이그레이션에서 사용자 ID와 기본 프로필을 `app_users`로 이전하는 코드가 남아 있습니다.

## 운영 주의사항

- 이 디렉터리를 Vercel 또는 Supabase 운영 배포에 연결하지 않습니다.
- Render Blueprint나 Render PostgreSQL 생성 용도로 사용하지 않습니다.
- 현재 운영 기능 수정은 루트 Next.js 앱, `mobile/`, `supabase/`를 기준으로 진행합니다.
- 복구 목적으로 Spring 백엔드를 다시 실행해야 할 때만 별도 환경변수를 명시적으로 주입합니다.
