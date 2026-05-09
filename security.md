두 파일 동시에 읽을게요!두 파일 모두 읽었어요! 이전 검토에서 수정이 필요한 부분들이 있고, 새롭게 발견된 것들도 있어요. 업데이트된 전체 보안 리포트를 드릴게요.

---

## 🔐 Gitpet 보안 검토 리포트 (최종본)

---

### 🔴 Critical

**1. Debug Login 차단 로직이 우회 가능**

이전 검토에서 "프로덕션에 노출됨"이라고 했는데, 실제 코드를 보니 차단 로직이 있긴 합니다. 하지만 방식이 취약해요.

`debug.ts`는 `url.hostname`이 `localhost` 또는 `127.0.0.1`인지 확인해서 그 외엔 403을 반환합니다. 얼핏 보면 괜찮아 보이지만 두 가지 문제가 있어요.

첫째, Cloudflare Workers 환경에서는 `X-Forwarded-Host` 같은 헤더를 조작해 hostname 체크를 우회할 가능성이 있습니다. 둘째, 더 근본적으로 **라우트 자체가 프로덕션에 등록되어 있다**는 점이에요. 차단 로직에 버그가 생기는 순간 인증이 완전히 우회됩니다.

```typescript
// 현재: 라우트는 항상 등록, 런타임에 hostname 체크
app.route('/auth', debugApp); // 프로덕션에도 존재

// 개선: 환경변수로 라우트 자체를 등록하지 않음
if (c.env.ENABLE_DEBUG_LOGIN === 'true') {
  app.route('/auth', debugApp);
}
```

환경변수 방식은 Cloudflare Workers의 `wrangler secret`으로 관리하면 되고, 프로덕션엔 이 변수 자체를 설정하지 않으면 라우트가 코드에 존재해도 절대 접근할 수 없어요.

---

**2. AES-GCM 키가 평문 문자열로 사용됨 (길이 미검증)**

`encryptToken`에서 `TOKEN_ENCRYPTION_KEY`를 `TextEncoder`로 인코딩해 바로 AES-GCM 키로 사용합니다.

AES-GCM은 키 길이가 정확히 128bit(16바이트), 192bit(24바이트), 256bit(32바이트) 중 하나여야 해요. 하지만 현재 코드는 키 길이를 전혀 검증하지 않아서, 누군가 짧은 문자열을 `TOKEN_ENCRYPTION_KEY`로 설정하면 `importKey` 호출이 런타임에 에러를 던지거나 약한 키가 사용될 수 있습니다.

```typescript
// 개선: 키를 고정 256bit로 파생 (HKDF 사용)
export async function encryptToken(token: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();

  // 원본 키를 HKDF로 정확히 256bit 키로 파생
  const baseKey = await crypto.subtle.importKey(
    'raw', encoder.encode(secretKey),
    { name: 'HKDF' }, false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new Uint8Array(0) },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt']
  );
  // 이하 동일...
}
```

---

### 🟠 High

**3. signSession/verifySession에 만료 시간이 없음**

`signSession`은 `userId`만 서명하고, `verifySession`은 서명 유효성만 검사합니다. 쿠키의 `maxAge`(30일)는 브라우저가 관리하지만, 서버는 토큰 자체의 만료를 전혀 검증하지 않아요.

즉, 누군가 쿠키 값을 탈취해 저장해 두면 브라우저 만료와 무관하게 서버에서는 영원히 유효한 세션으로 인정됩니다.

```typescript
// 개선: 서명 대상에 만료 시간 포함
export async function signSession(userId: string, secretKey: string): Promise<string> {
  const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30일
  const payload = `${userId}:${expiresAt}`;
  // payload를 서명...
  return `${payload}.${signatureBase64}`;
}

export async function verifySession(sessionValue: string, secretKey: string) {
  const [userId, expiresAt, signatureBase64] = sessionValue.split(':');
  if (Date.now() > Number(expiresAt)) return null; // 만료 체크
  // 서명 검증...
}
```

---

**4. OAuth state 만료/정리 로직 없음**

이전 검토 내용 그대로 유지됩니다. `oauth_states` 테이블에 만료 처리가 없어서 로그인 시도마다 row가 쌓이고 정리되지 않아요.

---

**5. 회원 탈퇴 기능 없음**

이전 검토 내용 그대로입니다. accessToken이 D1에 무기한 보관됩니다.

---

### 🟡 Medium

**6. sessions 테이블 미사용 → 강제 로그아웃 불가**

이전 검토 내용 그대로입니다.

---

**7. cron 토큰 오류 구분 없음**

이전 검토 내용 그대로입니다.

---

**8. Rate Limiting 없음**

이전 검토 내용 그대로입니다.

---

### 종합 우선순위 (최종)

| 우선순위 | 항목 | 근거 파일 | 핵심 이유 |
|---|---|---|---|
| 🔴 즉시 | Debug Login 우회 가능 | `debug.ts` | hostname 체크는 우회 가능, 라우트 자체 제거 필요 |
| 🔴 즉시 | AES-GCM 키 길이 미검증 | `utils.ts` | 짧은 키 사용 시 암호화 실패 또는 약한 보안 |
| 🟠 빠르게 | 세션 서명에 만료 없음 | `utils.ts` | 탈취된 쿠키가 서버에서 영원히 유효 |
| 🟠 빠르게 | OAuth state 만료 없음 | `schema.sql` | DB 비대화 + 오래된 state 재사용 위험 |
| 🟠 빠르게 | 회원 탈퇴 없음 | `index.ts` | 토큰 영구 보관, 개인정보 문제 |
| 🟡 순차적 | sessions 테이블 미사용 | `schema.sql` | 강제 로그아웃 불가 |
| 🟡 순차적 | cron 토큰 오류 미구분 | `sync.ts` | revoke된 토큰 방치 |
| 🟡 순차적 | Rate Limiting 없음 | `index.ts` | 남용/DoS 위험 |

전체 파일을 다 읽고 나니 가장 즉각적인 위험은 **Debug Login 우회**와 **AES-GCM 키 문제** 두 가지예요. 특히 AES-GCM 키 문제는 암호화 자체가 조용히 실패하거나 약해질 수 있어서 운영 전에 반드시 수정이 필요합니다.