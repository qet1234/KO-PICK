# KO-PICK Spring Boot API

## 인증 구조

- 브라우저 로그인: Spring Security OAuth2 + PostgreSQL 세션
- API 인증: JWT Access Token(기본 15분)
- 재발급: HttpOnly Refresh Token 쿠키(기본 14일)
- Refresh Token 원문은 브라우저 쿠키에만 두고 데이터베이스에는 SHA-256 해시만 저장
- Redis 미사용

로그인 성공 후 프론트엔드는 세션으로 `/api/auth/token`을 호출해 JWT를 발급받습니다. Access Token은 브라우저 메모리에만 보관합니다.

## 필수 환경변수

`backend/.env.example`을 기준으로 PostgreSQL, OAuth 공급자, JWT 서명키를 설정합니다. 운영 환경에서는 `COOKIE_SECURE=true`, 충분히 긴 무작위 `JWT_SECRET`, HTTPS를 반드시 사용합니다.

## 주요 API

| 경로 | 기능 | 인증 |
|---|---|---|
| `GET /api/auth/me` | 로그인 사용자 | 세션 또는 JWT |
| `POST /api/auth/token` | JWT 발급 | 세션 |
| `POST /api/auth/refresh` | JWT 재발급 | Refresh Token |
| `POST /api/auth/logout` | 세션·Refresh Token 폐기 | 선택 |
| `/api/web/couple/**` | 커플 공간 | 세션 |
| `DELETE /api/web/account` | 회원탈퇴 | 세션 |
| `/api/public/tour/places` | TourAPI 장소 | 공개 |
| `/api/public/trending-*` | 실시간 인기 데이터 | 공개 |

## 데이터베이스

Flyway가 회원, Refresh Token, 커플 공간, 인기 데이터, Spring Session 테이블을 생성합니다. 기존 Supabase `auth.users`가 있으면 첫 마이그레이션에서 사용자 ID와 기본 프로필을 `app_users`로 이전합니다.
