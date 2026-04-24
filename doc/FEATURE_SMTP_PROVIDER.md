# 기능 개선: Gmail 외 SMTP 이메일 발송 지원

| 항목 | 내용 |
|------|------|
| **문서 유형** | FE + BE 기능 개선 요구사항 |
| **우선순위** | 높음 |
| **작성일** | 2026-04-23 |

---

## 1. 배경 및 문제 정의

### 현재 상태 (AS-IS)

이메일 발송이 **Gmail OAuth 연동 전용**으로 구현되어 있습니다.  
사용자가 Gmail 계정을 OAuth로 연동하지 않으면 이메일을 발송할 수 없습니다.

```
현재 발송 흐름:
  발송 확인 노드 클릭
      ↓
  DB에서 provider = 'GMAIL' 인 ExternalToken 조회
      ↓
  없으면 → ❌ 발송 불가 (에러 반환)
  있으면 → Gmail API (OAuth AccessToken) 로 발송
```

이로 인해 다음 사용자들이 이 서비스를 사용할 수 없습니다.

- Gmail 계정이 없는 사용자 (Naver, Kakao, 사내 메일 등)
- Google OAuth 승인 없이 **자체 SMTP 서버**를 사용하는 기업 고객
- AWS SES, SendGrid, Mailgun 등 **서드파티 SMTP 서비스**를 쓰는 팀

---

### 목표 상태 (TO-BE)

사용자가 **SMTP 계정 정보**(호스트, 포트, 아이디, 비밀번호)를 직접 등록하면,  
Gmail 연동 없이도 이메일을 발송할 수 있습니다.

```
개선 후 발송 흐름:
  발송 확인 노드 클릭
      ↓
  DB에서 provider IN ['GMAIL', 'SMTP'] 조회
      ↓
  GMAIL → 기존 Gmail API 발송 (변경 없음)
  SMTP  → Nodemailer SMTP 발송 (신규)
```

---

## 2. 현재 코드 분석

### 2-1. 변경이 필요한 파일 목록

| 파일 | 현재 문제 | 변경 유형 |
|------|---------|---------|
| `prisma/schema.prisma` | `ExternalToken`에 SMTP provider 없음 | DB 스키마 수정 |
| `src/app/api/user/tokens/route.ts` | `provider: z.enum(['GMAIL', 'FACEBOOK'])` 으로 고정 | 유효성 검사 확장 |
| `src/shared/libs/flow-engine/nodes/confirm-send.ts` | `provider: 'GMAIL'` 만 조회, Gmail API만 사용 | 발송 로직 분기 추가 |
| `src/shared/libs/mail/transport.ts` | Mailpit 전용 (프로덕션 SMTP 미구현) | SMTP 발송 함수 구현 |
| `src/features/my-page/tabs/DeployTokensTab.tsx` | GMAIL/FACEBOOK 두 가지만 표시 | SMTP 등록 UI 추가 |
| `src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx` | `hasGmail` 만 체크 | SMTP 연동 여부도 체크 |
| `src/features/nodes/email-send-settings/SendSettingsConfig.tsx` | `hasGmail` 만 체크 | SMTP 연동 여부도 체크 |

---

### 2-2. 핵심 문제 코드 위치

**① `confirm-send.ts` — Gmail만 조회**

```ts
// src/shared/libs/flow-engine/nodes/confirm-send.ts  L111-L117
const tokenWhere = context?.userId
  ? { provider: 'GMAIL' as const, userId: context.userId }
  : { provider: 'GMAIL' as const }

const token = await prisma.externalToken.findFirst({
  where: tokenWhere,   // ← GMAIL만 조회
  orderBy: { id: 'desc' },
})
```

**② `tokens/route.ts` — SMTP provider 차단**

```ts
// src/app/api/user/tokens/route.ts  L7
const createTokenSchema = z.object({
  provider: z.enum(['GMAIL', 'FACEBOOK']),  // ← SMTP 등록 불가
  ...
})
```

**③ `DeployTokensTab.tsx` — SMTP 입력 UI 없음**

```ts
// src/features/my-page/tabs/DeployTokensTab.tsx  L32-L45
const PROVIDERS = [
  { value: 'GMAIL',    label: 'Gmail', ... },
  { value: 'FACEBOOK', label: 'Meta',  ... },
  // SMTP 없음
]
```

---

## 3. 요구사항

---

### REQ-01. DB 스키마 — SMTP 자격증명 저장

**파일**: `prisma/schema.prisma`

`ExternalToken` 모델의 `metadata` 컬럼(이미 `Json?` 타입)을 활용해 SMTP 설정을 저장합니다.  
스키마 파일 변경은 없고, **`metadata` 필드를 활용**하는 방식입니다.

```
ExternalToken 저장 구조 (provider = 'SMTP'):
  accessToken  = SMTP 비밀번호 (기존 컬럼 재사용)
  metadata     = {
    host: string       // 예: smtp.naver.com
    port: number       // 예: 587
    user: string       // 예: myid@naver.com
    secure: boolean    // true = SSL(465), false = TLS(587)
  }
```

> **마이그레이션 불필요**: 기존 `metadata Json?` 컬럼에 저장하므로 DB 변경 없음.

---

### REQ-02. API — SMTP provider 허용

**파일**: `src/app/api/user/tokens/route.ts`

#### 2-1. `createTokenSchema` 확장

```ts
// 변경 전
const createTokenSchema = z.object({
  provider: z.enum(['GMAIL', 'FACEBOOK']),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

// 변경 후
const smtpMetaSchema = z.object({
  host: z.string().min(1, 'SMTP 호스트를 입력해주세요'),
  port: z.number().int().min(1).max(65535),
  user: z.string().email('유효한 이메일 형식이어야 합니다'),
  secure: z.boolean(),
})

const createTokenSchema = z.object({
  provider: z.enum(['GMAIL', 'FACEBOOK', 'SMTP']),  // SMTP 추가
  accessToken: z.string().min(1),                    // SMTP 비밀번호로 재사용
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.unknown().optional(),                  // SMTP 설정 JSON
})
```

#### 2-2. SMTP 전용 유효성 검사 추가

```ts
// POST 핸들러 내부 — 기존 GMAIL 체크 아래에 추가
if (parsed.data.provider === 'SMTP') {
  const metaParsed = smtpMetaSchema.safeParse(parsed.data.metadata)
  if (!metaParsed.success) {
    return NextResponse.json(
      { error: 'SMTP 설정(host, port, user, secure)이 올바르지 않습니다.' },
      { status: 400 }
    )
  }
}
```

---

### REQ-03. 발송 엔진 — SMTP 분기 처리

**파일**: `src/shared/libs/flow-engine/nodes/confirm-send.ts`

#### 3-1. 토큰 조회 범위 확장

```ts
// 변경 전
const tokenWhere = context?.userId
  ? { provider: 'GMAIL' as const, userId: context.userId }
  : { provider: 'GMAIL' as const }

// 변경 후
const tokenWhere = context?.userId
  ? { userId: context.userId, provider: { in: ['GMAIL', 'SMTP'] } }
  : { provider: { in: ['GMAIL', 'SMTP'] } }

const token = await prisma.externalToken.findFirst({
  where: tokenWhere,
  orderBy: { id: 'desc' },   // 가장 최근 등록된 토큰 우선
})
```

#### 3-2. 발송 로직 분기

기존 Gmail 발송 코드는 그대로 유지하고, SMTP 분기를 추가합니다.

```ts
// provider별 발송 분기
if (token.provider === 'GMAIL') {
  // ✅ 기존 Gmail API 발송 로직 (변경 없음)
  // refreshAccessToken → Gmail REST API 호출
  return await sendViaGmail({ token, to: recipientEmail, subject, html, from })

} else if (token.provider === 'SMTP') {
  // 🆕 신규 SMTP 발송 로직
  return await sendViaSmtp({ token, to: recipientEmail, subject, html, from })
}
```

#### 3-3. `sendViaSmtp` 함수 구현

**파일**: `src/shared/libs/mail/transport.ts` (기존 파일 활용)

```ts
// 신규 함수 추가
import type { ExternalToken } from '@prisma/client'

type SmtpMeta = {
  host: string
  port: number
  user: string
  secure: boolean
}

export async function sendViaSmtp(opts: {
  token: ExternalToken
  to: string
  subject: string
  html?: string
  from: string
}): Promise<{ ok: boolean; message: string }> {
  const meta = opts.token.metadata as SmtpMeta | null

  if (!meta?.host || !meta?.user) {
    return { ok: false, message: 'SMTP 설정이 올바르지 않습니다. 마이페이지에서 재등록해주세요.' }
  }

  const transporter = nodemailer.createTransport({
    host: meta.host,
    port: meta.port,
    secure: meta.secure,
    auth: {
      user: meta.user,
      pass: opts.token.accessToken,   // accessToken 컬럼에 비밀번호 저장
    },
  })

  try {
    await transporter.sendMail({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    return { ok: true, message: `${opts.to}에게 메일이 발송되었습니다.` }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'SMTP 발송 실패',
    }
  }
}
```

---

### REQ-04. 마이페이지 UI — SMTP 등록 폼

**파일**: `src/features/my-page/tabs/DeployTokensTab.tsx`

#### 4-1. PROVIDERS 배열에 SMTP 추가

```ts
// 변경 전
const PROVIDERS = [
  { value: 'GMAIL',    label: 'Gmail', icon: Mail,   description: '이메일 발송에 사용' },
  { value: 'FACEBOOK', label: 'Meta',  icon: Share2, description: '광고 연동에 사용' },
] as const

// 변경 후
const PROVIDERS = [
  { value: 'GMAIL',    label: 'Gmail',      icon: Mail,   description: '이메일 발송에 사용' },
  { value: 'SMTP',     label: 'SMTP 이메일', icon: Server, description: '자체/서드파티 SMTP 발송' },
  { value: 'FACEBOOK', label: 'Meta',        icon: Share2, description: '광고 연동에 사용' },
] as const
```

#### 4-2. SMTP 선택 시 전용 입력 폼 표시

SMTP를 선택하면 아래 폼이 표시됩니다.

```
┌──────────────────────────────────────────────────────────┐
│  SMTP 이메일 연결                                          │
│                                                            │
│  SMTP 호스트                                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  smtp.naver.com                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  포트         보안 연결                                    │
│  ┌────────┐   ● TLS (587)   ○ SSL (465)                   │
│  │  587   │                                               │
│  └────────┘                                               │
│                                                            │
│  발신 이메일 (아이디)                                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │  myid@naver.com                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  앱 비밀번호 / SMTP 비밀번호                               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  ••••••••••••••••                                │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ℹ️  Gmail은 앱 비밀번호를 사용하세요. Naver/Kakao는        │
│      IMAP/SMTP 설정 활성화 후 비밀번호를 입력하세요.       │
│                                                            │
│  [  연결 테스트  ]   [  저장  ]                            │
└──────────────────────────────────────────────────────────┘
```

#### 4-3. SMTP 폼 state 및 제출 로직

```ts
// SMTP 전용 state 추가
const [smtpHost, setSmtpHost] = useState('')
const [smtpPort, setSmtpPort] = useState(587)
const [smtpUser, setSmtpUser] = useState('')
const [smtpPassword, setSmtpPassword] = useState('')
const [smtpSecure, setSmtpSecure] = useState(false)

// SMTP 저장 시 API 호출 형태
addMutation.mutate({
  provider: 'SMTP',
  accessToken: smtpPassword,    // 비밀번호를 accessToken 필드에 저장
  metadata: {
    host: smtpHost,
    port: smtpPort,
    user: smtpUser,
    secure: smtpSecure,
  },
})
```

---

### REQ-05. 발송 설정 노드 — 발신자 표시 개선

**파일**: `src/features/nodes/email-send-settings/SendSettingsConfig.tsx`

#### 현재

```ts
const hasGmail = !!gmailToken

// Gmail 미연동 시 경고 표시
if (!hasGmail) → "Gmail이 연동되지 않았어요" 경고 + 발송 불가
```

#### 변경 후

```ts
const gmailToken  = tokens.find((t) => t.provider === 'GMAIL')
const smtpToken   = tokens.find((t) => t.provider === 'SMTP')
const hasEmailProvider = !!gmailToken || !!smtpToken

// 발신자 섹션 — 연동된 provider 표시
if (hasGmail)  → "📧 Gmail 연동됨"  (기존 그대로)
if (hasSmtp)   → "📨 SMTP 연동됨  (smtpToken.metadata.user)"  (신규)
if (!hasEmailProvider) → "⚠️ 이메일 발신자가 연동되지 않았어요" 경고

// 저장 버튼 활성화 조건
const canSave = hasEmailProvider && subject.trim().length > 0
```

---

### REQ-06. 발송 확인 노드 — 검증 항목 개선

**파일**: `src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx`

#### 현재 검증 항목

```ts
{ label: 'Gmail 연동 상태', status: hasGmail ? 'pass' : 'error' }
```

#### 변경 후

```ts
const hasGmail = tokens.some((t) => t.provider === 'GMAIL')
const hasSmtp  = tokens.some((t) => t.provider === 'SMTP')
const hasEmailProvider = hasGmail || hasSmtp

// SMTP 토큰에서 발신자 이메일 읽기
const smtpToken = tokens.find((t) => t.provider === 'SMTP')
const smtpMeta  = smtpToken?.metadata as { user?: string } | null

const senderLabel = hasGmail
  ? 'Gmail 연동됨'
  : hasSmtp
    ? `SMTP (${smtpMeta?.user ?? '등록됨'})`
    : '미연동'

// 검증 항목
{ label: '발신자 연동 상태', status: hasEmailProvider ? 'pass' : 'error',
  hint: !hasEmailProvider ? '마이페이지에서 Gmail 또는 SMTP를 연동해주세요' : undefined }
```

#### 발송 정보 섹션 표시

```
발신자   Gmail 연동됨          ← Gmail 연동 시
발신자   SMTP (myid@naver.com) ← SMTP 연동 시
발신자   미연동                 ← 아무것도 없을 때
```

---

## 4. 변경 범위 요약

```
┌─────────────────────────────────────────────────────────────────────┐
│  레이어          │  파일                                              │
├─────────────────────────────────────────────────────────────────────┤
│  DB              │  prisma/schema.prisma                             │
│                  │  → 변경 없음 (metadata Json? 컬럼 재사용)          │
├─────────────────────────────────────────────────────────────────────┤
│  API             │  src/app/api/user/tokens/route.ts                 │
│                  │  → provider enum에 'SMTP' 추가                    │
│                  │  → SMTP metadata 유효성 검사 추가                  │
├─────────────────────────────────────────────────────────────────────┤
│  발송 엔진       │  src/shared/libs/flow-engine/nodes/confirm-send.ts │
│                  │  → GMAIL/SMTP 분기 처리                           │
│                  │                                                    │
│                  │  src/shared/libs/mail/transport.ts                 │
│                  │  → sendViaSmtp() 함수 구현                         │
├─────────────────────────────────────────────────────────────────────┤
│  UI              │  src/features/my-page/tabs/DeployTokensTab.tsx    │
│                  │  → SMTP 등록 폼 추가                               │
│                  │                                                    │
│                  │  src/features/nodes/email-send-settings/           │
│                  │    SendSettingsConfig.tsx                           │
│                  │  → SMTP 연동 시 발신자 표시 개선                   │
│                  │                                                    │
│                  │  src/features/nodes/email-confirm-send/            │
│                  │    ConfirmSendConfig.tsx                            │
│                  │  → 검증 항목을 Gmail → 이메일 provider로 일반화    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. 주요 SMTP 서비스별 설정 참고

| 서비스 | SMTP 호스트 | 포트 | 보안 |
|--------|-----------|------|------|
| Naver  | smtp.naver.com | 587 | TLS |
| Kakao  | smtp.kakao.com | 587 | TLS |
| Gmail (앱 비밀번호) | smtp.gmail.com | 587 | TLS |
| Outlook / Office365 | smtp.office365.com | 587 | TLS |
| AWS SES | email-smtp.{region}.amazonaws.com | 587 | TLS |
| SendGrid | smtp.sendgrid.net | 587 | TLS |
| Mailgun | smtp.mailgun.org | 587 | TLS |

---

## 6. 데이터 흐름 (변경 후)

```
[마이페이지] 이메일 토큰 탭
  │
  ├── Gmail 선택 → OAuth 연동 → ExternalToken { provider: 'GMAIL', refreshToken }
  │
  └── SMTP 이메일 선택 → 폼 입력 → POST /api/user/tokens
        { provider: 'SMTP',
          accessToken: 'smtp-password',
          metadata: { host, port, user, secure } }
              ↓
        ExternalToken { provider: 'SMTP', accessToken: pw, metadata: {...} }


[발송 확인 노드] 지금 발송하기
  │
  └── POST /api/email/send  { nodes }
        ↓
      runConfirmSendNode()
        ↓
      DB: ExternalToken.findFirst({ provider IN ['GMAIL', 'SMTP'] })
        │
        ├── provider === 'GMAIL'
        │     → refreshAccessToken()
        │     → Gmail REST API 발송
        │
        └── provider === 'SMTP'
              → sendViaSmtp({ token.metadata, token.accessToken })
              → Nodemailer createTransport({ host, port, auth })
              → transporter.sendMail(...)
```

---

## 7. 개발 체크리스트

### BE (서버 사이드)

- [ ] `tokens/route.ts` — `z.enum`에 `'SMTP'` 추가
- [ ] `tokens/route.ts` — SMTP metadata 유효성 검사 로직 추가
- [ ] `transport.ts` — `sendViaSmtp()` 함수 구현 및 export
- [ ] `confirm-send.ts` — `provider IN ['GMAIL', 'SMTP']` 으로 토큰 조회 변경
- [ ] `confirm-send.ts` — provider 분기 후 각 함수 호출

### FE (클라이언트 사이드)

- [ ] `DeployTokensTab.tsx` — PROVIDERS 배열에 SMTP 추가
- [ ] `DeployTokensTab.tsx` — SMTP 전용 입력 폼 (host, port, user, password, secure 토글)
- [ ] `DeployTokensTab.tsx` — SMTP 저장 시 `metadata` 포함하여 API 호출
- [ ] `SendSettingsConfig.tsx` — `hasEmailProvider` 로 조건 일반화 (Gmail + SMTP)
- [ ] `ConfirmSendConfig.tsx` — 검증 항목 `'Gmail 연동 상태'` → `'발신자 연동 상태'` 로 변경
- [ ] `ConfirmSendConfig.tsx` — 발송 정보 섹션의 발신자 표시에 SMTP user 반영

### 테스트

- [ ] Gmail OAuth 연동 후 발송 — 기존 동작 유지 확인
- [ ] SMTP 등록 → 발송 확인 노드에서 검증 통과 확인
- [ ] SMTP 발송 실행 → 수신자에게 메일 도착 확인
- [ ] Gmail + SMTP 둘 다 등록 시 → 가장 최근 토큰으로 발송 확인
- [ ] 아무 provider 없을 때 → 검증 ❌ + 발송 버튼 비활성 확인
- [ ] 잘못된 SMTP 정보 입력 시 → 발송 실패 메시지 확인

---

## 8. 참고 파일 경로

```
수정 대상
  src/app/api/user/tokens/route.ts
  src/shared/libs/flow-engine/nodes/confirm-send.ts
  src/shared/libs/mail/transport.ts
  src/features/my-page/tabs/DeployTokensTab.tsx
  src/features/nodes/email-send-settings/SendSettingsConfig.tsx
  src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx

참고 (변경 없음)
  prisma/schema.prisma                  ← ExternalToken.metadata Json? 이미 존재
  src/app/api/auth/gmail/authorize/     ← Gmail OAuth (유지)
  src/app/api/auth/gmail/callback/      ← Gmail OAuth (유지)
```
