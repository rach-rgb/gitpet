# GitChi Security Verification Guide

이 문서는 GitChi 레포의 보안 수정 사항과 릴리스 전 검증 항목을 정리한다.

## 이번 보안 수정 요약

- 상태 변경 API에 same-origin 검증을 추가했다.
- `/api/pet/retire`에서 로그인 여부와 pet 소유권을 확인하도록 수정했다.
- 사용자 입력, GitHub 이벤트 값, 쿼리 문자열이 HTML/SVG에 출력되기 전에 이스케이프되도록 수정했다.
- `/api/locale`의 open redirect 가능성과 수동 `Set-Cookie` 헤더 주입 위험을 제거했다.
- logout을 GET 링크에서 POST form으로 변경했다.
- 공통 보안 헤더를 추가했다.
- 런타임 및 개발 도구 의존성 취약점을 패치했다.
- 기존 타입 오류를 정리해 `tsc --noEmit` 검증이 통과하도록 했다.

## 자동 검증

프로젝트 로컬 Node 의존성을 사용한다. 전역 패키지 설치는 하지 않는다.

```powershell
npm install
npx tsc --noEmit
npm audit
```

기대 결과:

- `npx tsc --noEmit`이 오류 없이 종료된다.
- `npm audit` 결과가 `found 0 vulnerabilities`이다.

## 인증 및 권한 검증

### Pet 은퇴 권한

확인할 항목:

- 로그인하지 않은 사용자가 `POST /api/pet/retire?petId=<id>`를 호출하면 로그인으로 리다이렉트된다.
- 로그인한 사용자가 다른 사용자의 `petId`로 호출하면 `404`가 반환된다.
- 로그인한 소유자가 stage 4 pet을 은퇴시키면 정상적으로 대시보드로 리다이렉트된다.
- stage 4 미만 pet은 은퇴되지 않고 오류가 반환된다.

### 상태 변경 요청 Origin

확인할 항목:

- 정상 same-origin form POST는 성공한다.
- `Origin`이 현재 앱 origin과 다른 POST 요청은 `403 Invalid request origin`으로 차단된다.
- `Sec-Fetch-Site: cross-site`가 포함된 POST 요청은 `403 Invalid request origin`으로 차단된다.

대상 엔드포인트:

- `POST /api/user/settings`
- `POST /api/user/delete`
- `POST /api/pet/reset`
- `POST /api/pet`
- `POST /api/pet/retire`
- `POST /auth/logout`
- debug mode 활성화 시 `POST /debug/stats`, `POST /debug/activity`

## 입력 및 출력 이스케이프 검증

### Pet 이름

확인할 항목:

- `<script>alert(1)</script>` 같은 이름으로 pet 생성을 시도해도 대시보드와 SVG 카드에서 태그로 실행되지 않는다.
- 이름 앞뒤 공백은 제거되고, 연속 공백은 하나로 정리된다.
- 빈 문자열 또는 공백뿐인 이름은 거부된다.
- 이름은 최대 20자로 제한된다.

### GitHub 이벤트 표시값

확인할 항목:

- repo name, activity notes, event name이 HTML로 해석되지 않고 텍스트로 표시된다.
- 대시보드 활동 목록에서 외부 값이 태그나 속성으로 삽입되지 않는다.

### SVG 카드

확인할 항목:

- `/api/card/:username` 응답의 pet name, trait, difficulty, dashboard URL이 SVG 텍스트/속성에서 이스케이프된다.
- 응답 헤더에 `Content-Type: image/svg+xml`와 `X-Content-Type-Options: nosniff`가 포함된다.

## Redirect 및 Cookie 검증

### Locale 변경

확인할 항목:

- `/api/locale?lang=ko`와 `/api/locale?lang=en`만 유효 locale로 저장된다.
- 다른 locale 값은 안전한 기본값으로 처리된다.
- 외부 `Referer`가 들어와도 외부 사이트로 리다이렉트되지 않는다.
- locale 쿠키는 `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` 속성을 가진다.

### Logout

확인할 항목:

- 내비게이션의 logout은 POST form으로 전송된다.
- `GET /auth/logout`은 더 이상 logout 동작을 수행하지 않는다.
- 정상 logout 후 session 쿠키가 삭제되고 서버 세션도 삭제된다.

## 보안 헤더 검증

모든 앱 응답에서 다음 헤더를 확인한다.

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Debug Mode 검증

확인할 항목:

- `ENABLE_DEBUG_LOGIN`이 `true`가 아니면 `/debug/*`가 `403`을 반환한다.
- debug mode가 활성화된 경우에도 POST 요청은 same-origin 검증을 통과해야 한다.
- `/debug?msg=<script>alert(1)</script>`가 HTML을 실행하지 않고 텍스트로 표시된다.
- debug session cookie는 HTTPS 요청에서 `Secure`가 설정된다.

## 의존성 검증

현재 패치된 주요 버전:

- `hono`: `4.12.28`
- `wrangler`: `4.108.0`
- `@cloudflare/workers-types`: `5.20260708.1`
- `miniflare`: `4.20260706.0`
- `esbuild`: `0.28.1`
- `undici`: `7.28.0`
- `ws`: `8.21.0`

검증 명령:

```powershell
npm ls hono wrangler miniflare esbuild undici ws @cloudflare/workers-types
npm audit
```

기대 결과:

- 위 버전 이상이 설치되어 있다.
- `npm audit` 결과가 `found 0 vulnerabilities`이다.

## 배포 전 확인사항

- Cloudflare Worker 환경변수 `SESSION_SIGNING_KEY`와 `TOKEN_ENCRYPTION_KEY`는 충분히 긴 랜덤 값이어야 한다.
- 운영 환경에서 `ENABLE_DEBUG_LOGIN`은 `true`가 아니어야 한다.
- GitHub OAuth callback URL은 운영 도메인으로 제한되어야 한다.
- D1 마이그레이션이 최신 schema와 일치해야 한다.
- 배포 직후 로그인, pet 생성, 대시보드, 카드 SVG, logout, locale 변경을 smoke test한다.
