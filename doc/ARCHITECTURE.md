# i-Marketing — 아키텍처 & 기능 문서

> Next.js 15 기반 AI-assisted 마케팅 자동화 플랫폼.  
> 마케터가 이메일·페이스북 캠페인을 **노드 기반 시각 워크플로우(플로우)** 로 설계하고 실행합니다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [폴더 구조](#2-폴더-구조)
3. [비즈니스 기능](#3-비즈니스-기능)
4. [아키텍처 상세](#4-아키텍처-상세)
5. [실행 흐름 (Execution Flow)](#5-실행-흐름-execution-flow)
6. [데이터베이스 스키마](#6-데이터베이스-스키마)
7. [API 엔드포인트 목록](#7-api-엔드포인트-목록)
8. [환경 변수](#8-환경-변수)

---

## 1. 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router, Turbopack) |
| 언어 | TypeScript 5 |
| UI | React 19, Tailwind CSS v4, Radix UI, shadcn/ui |
| 상태 관리 | Zustand 5 (클라이언트 전역 상태) |
| 서버 상태 | TanStack Query 5 (API 캐싱·동기화) |
| 인증 | NextAuth v5 (Auth.js) — JWT 세션 전략 |
| ORM / DB | Prisma 5 + PostgreSQL 16 (Docker) |
| AI SDK | Vercel AI SDK — Anthropic · OpenAI · Gemini |
| 이메일 발송 | Nodemailer + React Email (렌더링) |
| 다국어 | next-intl 4 (ko / en) |
| 폼 검증 | Zod 4 + React Hook Form |
| API 문서 | Swagger / OpenAPI (swagger-jsdoc + swagger-ui-react) |
| 로컬 메일 | Mailpit (Docker, SMTP 1025 / Web UI 8025) |

---

## 2. 폴더 구조

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # 다국어 라우트 (ko / en)
│   │   ├── page.tsx              # 홈 — 캠페인 생성 진입점
│   │   ├── flow/[flowId]/page.tsx # 플로우 편집기
│   │   └── my-page/page.tsx      # 마이페이지
│   ├── api/                      # Route Handlers (REST API)
│   │   ├── auth/                 # 인증 (register, google, facebook OAuth, gmail OAuth)
│   │   ├── flow/                 # 플로우 CRUD
│   │   ├── email/                # 이메일 발송 · AI 에이전트
│   │   ├── facebook/             # 페이스북 포스팅 · AI 에이전트
│   │   ├── news/                 # 뉴스 RSS 조회 · 기사 스크래핑
│   │   └── user/                 # 유저 정보 · AI 키 · 브랜드킷 · 토큰
│   └── api-docs/page.tsx         # Swagger UI
│
├── features/                     # 도메인 단위 기능 컴포넌트
│   ├── campaign-create/          # 캠페인 생성 화면
│   ├── Flow/                     # 플로우 편집기 (핵심)
│   │   ├── Flow.tsx              # 최상위 컴포넌트
│   │   ├── store/useFlowStore.ts # Zustand 전역 플로우 상태
│   │   ├── types.ts              # FlowNode · FlowDefinition 타입
│   │   ├── ui/FlowCanvas.tsx     # 캔버스 렌더링 (pan/zoom, SVG edge)
│   │   ├── ui/FlowHeader.tsx     # 헤더 (저장 · 실행 버튼)
│   │   ├── ui/FlowStep.tsx       # 하단 스텝 인디케이터
│   │   └── utils/flowSteps.ts    # 스텝 순서 · 도달 가능성 유틸
│   ├── nodes/                    # 노드 컴포넌트 & 레지스트리
│   │   ├── _registry.ts          # 노드 타입 등록 테이블
│   │   ├── email-campaign-purpose/
│   │   ├── email-create/         # 블록 에디터 + AI 어시스턴트
│   │   ├── email-address-book/
│   │   ├── email-send-settings/
│   │   ├── email-confirm-send/   # 검증 체크리스트 + 발송 실행
│   │   ├── news-source/          # Google RSS 뉴스 선택
│   │   ├── fb-url-input/
│   │   ├── fb-summary/           # AI 포스팅 생성
│   │   ├── fb-preview/           # 포스팅 미리보기·승인
│   │   └── fb-publish/           # Facebook Graph API 게시
│   ├── ai-chat/                  # 공용 AI 채팅 UI
│   ├── auth/                     # 로그인 · 회원가입 모달
│   └── my-page/                  # 마이페이지 탭 (계정·AI키·토큰·브랜드킷·DB)
│
├── shared/
│   ├── libs/
│   │   ├── prisma.ts             # Prisma Client 싱글턴
│   │   ├── ai/model.ts           # AI 모델 팩토리 (유저 API 키 → LLM 인스턴스)
│   │   ├── flow-engine/
│   │   │   ├── runner.ts         # runFlow() — 노드 순차·병렬 실행 엔진
│   │   │   └── nodes/            # 개별 노드 실행 로직
│   │   └── mail/transport.ts     # Nodemailer 설정 (Mailpit ↔ Gmail)
│   ├── ui/basic/                 # shadcn 기반 범용 UI 컴포넌트
│   └── hooks/                    # 공통 커스텀 훅
│
├── auth.ts                       # NextAuth 설정
├── middleware.ts                 # next-intl 다국어 라우팅 미들웨어
└── i18n/                         # 라우팅 설정

prisma/schema.prisma              # DB 스키마 정의
messages/{ko,en}.json             # 번역 메시지
docker-compose.yml                # PostgreSQL 16 + Mailpit
```

---

## 3. 비즈니스 기능

### 3-1. 캠페인 생성 (`/`)

홈 화면에서 캠페인 **유형** 을 선택하고 **제목** 을 입력하면 새 플로우가 생성됩니다.

| 캠페인 유형 | 구현 여부 | 자동 배치 노드 수 |
|------------|---------|---------------|
| 이메일 | ✅ 완성 | 5개 |
| 페이스북 | ✅ 완성 | 5개 (+ 브랜치 확장) |
| 블로그 · 인스타그램 · SMS | UI만 존재, 미구현 | — |

- 비로그인 상태에서 생성 시도 → **AuthModal** 표시 → 로그인 완료 후 자동 진행
- 유형별 **예시 문구 버튼** 클릭 → 입력창 자동 완성

---

### 3-2. 이메일 캠페인 플로우

```
[캠페인 목적] → [이메일 작성] → [주소록] → [발송 설정] → [발송 확인]
```

| 노드 (`type`) | 기능 |
|--------------|------|
| `campaign-purpose` | 캠페인 종류 선택 (프로모션 / 뉴스레터 / 온보딩). AI 에이전트 프롬프트에 맥락 주입. |
| `email` | 블록 기반 이메일 에디터 + 우측 AI 채팅 어시스턴트. 블록 12종 지원. |
| `address-book` | 수신자 이메일 입력·관리 |
| `send-settings` | 제목 · 미리보기 텍스트 · 발송 시점 설정 |
| `confirm-send` | 자동 검증(Gmail 연동 여부, 수신자, 제목 등) → PC/모바일 미리보기 → 발송 실행 |

**이메일 블록 에디터 지원 블록 종류**

`Text` · `Image` · `Button` · `Hr` · `List` · `TwoColumn` · `SnsShare` · `SnsLinks` · `VideoPreview` · `Html` · `Footer` · `Spacer`

---

### 3-3. 페이스북 캠페인 플로우

```
[기사 선택] → [링크 입력] → [AI 콘텐츠 생성] → [콘텐츠 검증] → [배포]
```

| 노드 (`type`) | 기능 |
|--------------|------|
| `news-source` | Google RSS에서 뉴스 기사 선택 |
| `fb-url-input` | 기사 URL 직접 입력 (기사 본문 스크래핑) |
| `fb-summary` | AI 에이전트가 본문(최대 300자) · 해시태그(3~7개) 생성 |
| `fb-preview` | 포스팅 미리보기 후 **승인** |
| `fb-publish` | Facebook Graph API로 실제 게시 |

> **브랜치 분기**: `news-source` 노드에서 최대 3개의 독립 `url-input → publish` 브랜치를 추가, **병렬 실행** 가능.

---

### 3-4. 마이페이지 (`/my-page`)

| 탭 | 기능 |
|----|------|
| 계정 | 프로필 확인 |
| AI API 키 | Anthropic · OpenAI · Gemini API 키 등록·삭제 |
| 이메일 토큰 | Gmail OAuth 토큰 연동 (이메일 실제 발송용) |
| 브랜드킷 | 로고 · 브랜드 컬러 · 폰트 · 톤(casual/professional/witty/warm) · 감성 설정 → AI 프롬프트에 자동 반영 |
| Global DB | 전체 플로우·실행 내역 조회 |

---

### 3-5. 인증

| 방식 | 설명 |
|------|------|
| 이메일/비밀번호 | bcrypt 해시, `POST /api/auth/register` 회원가입 |
| Google OAuth | NextAuth Google Provider (소셜 로그인) |
| Facebook OAuth | `/api/auth/facebook/authorize → callback` (마케팅 페이지 포스팅 토큰 발급) |
| Gmail OAuth | `/api/auth/gmail/authorize → callback` (이메일 실제 발송 토큰 저장) |

- 세션 전략: **JWT**, 유효기간 30일, 갱신 주기 1일
- `session.user.id` = DB `User.id` (nanoid)

---

## 4. 아키텍처 상세

### 4-1. 노드 레지스트리 패턴

`src/features/nodes/_registry.ts` 에 모든 노드 타입이 단일 테이블로 등록됩니다.

```ts
nodeRegistry[type] = {
  Node,      // 캔버스에 표시되는 카드 컴포넌트
  Config,    // 우측 설정 모달 컴포넌트 (null = 설정 없음)
  validate,  // 노드 데이터 유효성 검사 함수
  meta: {
    label, description, category,
    prereq,  // 이 노드가 활성화되려면 앞 노드에 있어야 할 필드 (prereq guard)
  },
}
```

**새 노드 타입 추가 시 이 파일 하나만 수정**하면 캔버스·설정·실행 엔진에 자동 반영됩니다.

---

### 4-2. Zustand FlowStore (플로우 전역 상태)

```
useFlowStore
  ├── nodes[]          — 노드 배열 (위치 · 연결 · data)
  ├── stepStates{}     — 노드별 진행 상태 (editing | done | blocked)
  ├── currentStepNodeId — 현재 뷰포트 중심 노드
  ├── editingNodeId    — 설정 모달이 열린 노드
  └── panTargetNodeId  — 스무스 카메라 이동 대상
```

| 주요 액션 | 동작 |
|----------|------|
| `initFromDefinition` | DB JSON으로 store 초기화 (새로고침 복원) |
| `saveNodeConfig` | 노드 data 변경 → `editing` 상태 + DB autosave |
| `setStepState` | 노드 상태를 `done`으로 확정 + DB 저장 |
| `addBranch` | 페이스북 분기 4-노드 세트 추가 |
| `requestPanToNode` | 스무스 패닝 요청 + 현재 스텝 갱신 |
| `buildDefinition` | 현재 상태 → `FlowDefinition` JSON 직렬화 |

> 노드 설정이 바뀔 때마다 `PATCH /api/flow/:id`로 DB에 **자동저장**됩니다.  
> 새로고침·재접속 후에도 진행 상태가 그대로 복원됩니다.

---

### 4-3. FlowDefinition — DB 저장 포맷

```ts
interface FlowDefinition {
  name?: string
  nodes: FlowNode[]       // id, type, position, nextNodeId, branchIds?, data?
  ui?: {
    currentStepNodeId?: string
    stepStates?: Record<string, { status: 'editing'|'done'|'blocked', updatedAt: string }>
  }
}
```

- PostgreSQL `Flow.definition` 컬럼에 JSON으로 저장
- 노드 연결: `nextNodeId` (단일 체인) + `branchIds[]` (병렬 분기)
- 캔버스 진행 상태(stepStates)도 동일 JSON에 포함 → 서버에서도 재현 가능

---

### 4-4. FlowCanvas — 커스텀 캔버스 렌더링

React Flow 같은 외부 라이브러리 없이 **직접 구현**된 캔버스입니다.

| 기능 | 구현 방식 |
|------|---------|
| Pan / Zoom | Pointer Events + CSS `transform: translate · scale` (GPU 레이어 분리) |
| 노드 카드 | `absolute` 포지션, `ResizeObserver`로 실측 너비 추적 |
| Edge (연결선) | SVG cubic bezier (`M … C …`), 노드 stepState에 따라 색상·점선 변화 |
| 동적 x 보정 | 실측 너비 기반으로 노드 겹침 방지 계산 |
| 설정 모달 | 노드 카드 클릭 → `DynamicModal` (클릭 위치에서 expand 애니메이션) |
| 스무스 패닝 | `useSmoothPanToNode` — 이전/다음 버튼 또는 스텝 인디케이터 클릭 시 부드럽게 이동 |

**Edge 색상 규칙**

| stepState | 연결선 색 | 화살표 |
|-----------|---------|--------|
| `done` | 짙은 검정 (실선) | 초록 |
| `editing` | 파랑 (점선) | 파랑 |
| `blocked` | 연한 검정 (점선) | 빨강 |
| 분기 브랜치 | 인디고 (점선) | 인디고 |
| 기본 | 연한 검정 (점선) | 회색 |

---

### 4-5. AI 모델 팩토리 (`getModelForUser`)

```
selectedModel = "anthropic:claude-3-5-haiku"
                      ↓
  DB → userId + provider로 API 키 조회 (UserApiKey 테이블)
                      ↓
  createAnthropic({ apiKey }) → anthropic(modelId) → LanguageModel
```

- 유저가 **마이페이지에서 등록한 API 키**만 사용
- 지원 provider: `ANTHROPIC` · `OPENAI` · `GEMINI`
- 키가 없으면 `null` 반환 → 400 에러

---

### 4-6. AI 에이전트 — Tool Use 패턴

두 에이전트 모두 Vercel AI SDK의 `streamText + tool()` 패턴을 사용합니다.

#### 이메일 에이전트 (`POST /api/email/agent`)

```
사용자 채팅 → streamText(model, systemPrompt, messages)
                    ↓
        tool: updateEmailConfig
          - subject, previewText, fromName, brandColor, logoUrl
          - content: EmailBlock[]  (12종 블록)
                    ↓
        클라이언트가 tool result를 받아 에디터 상태 즉시 반영
```

- 브랜드킷의 `tone / feeling`이 시스템 프롬프트에 자동 주입
- 캠페인 유형(프로모션/뉴스레터/온보딩)별 작성 가이드 포함
- `stopWhen: stepCountIs(3)` — 최대 3 라운드 내 완료

#### 페이스북 에이전트 (`POST /api/facebook/agent`)

```
기사 정보(title, content, url, image) + tone → streamText
                    ↓
        tool: generateFacebookPost
          - content: 300자 이내 본문 (훅 → 본문 → CTA 구조)
          - hashtags: 3~7개
          - articleUrl
          - mediaIdea
                    ↓
        클라이언트 fb-summary 노드 상태 업데이트
```

---

## 5. 실행 흐름 (Execution Flow)

### 5-1. 페이지 로드 → 플로우 복원

```
브라우저 접속 /[locale]/flow/[flowId]
        ↓
Flow.tsx useEffect
        ↓
  GET /api/flow/:flowId
        ↓
  flow.definition (JSON) 수신
        ↓
  useFlowStore.initFromDefinition(flowId, definition)
        ↓
  nodes[] + stepStates + currentStepNodeId 복원
        ↓
  FlowCanvas 렌더 + useSmoothPanToNode → 마지막 스텝으로 자동 이동
```

---

### 5-2. 노드 설정 변경 → 자동저장

```
사용자가 노드 카드 클릭
        ↓
  FlowCanvas.handleOpenConfig(nodeId)
  → useFlowStore.openConfig(nodeId)
        ↓
  DynamicModal 열림 → NodeConfig(type, nodeId) 렌더
        ↓
  설정 폼에서 값 변경 (React Hook Form onBlur / onChange)
        ↓
  useFlowStore.saveNodeConfig(nodeId, data)
    ├── nodes[nodeId].data 병합 업데이트
    ├── stepStates[nodeId] = { status: 'editing' }
    └── PATCH /api/flow/:id  { definition }  → PostgreSQL 저장
```

---

### 5-3. 이메일 AI 어시스턴트 흐름

```
사용자 채팅 입력 (EmailAiAssistant)
        ↓
  POST /api/email/agent
  { messages, emailForm, selectedModel, brandVoice, campaignType }
        ↓
  streamText → SSE 스트리밍 응답
        ↓
  tool: updateEmailConfig 호출
  { subject, previewText, content: EmailBlock[] }
        ↓
  클라이언트 tool result 파싱
        ↓
  useFlowStore.saveNodeConfig(emailNodeId, { subject, blocks, ... })
        ↓
  캔버스 이메일 노드 실시간 업데이트 + DB autosave
```

---

### 5-4. 페이스북 콘텐츠 생성 흐름

```
fb-summary 노드 — 사용자가 "생성" 클릭
        ↓
  fb-url-input 노드에서 articleUrl 읽기
        ↓
  GET /api/news/article?url=... → 기사 본문 스크래핑 (node-html-parser + @mozilla/readability)
        ↓
  POST /api/facebook/agent
  { messages, selectedModel, articleTitle, articleContent, articleUrl, tone, hashtags }
        ↓
  streamText → SSE
        ↓
  tool: generateFacebookPost
  { content, hashtags, articleUrl, mediaIdea }
        ↓
  fb-summary 노드 data 업데이트 + DB 저장
        ↓
  사용자가 fb-preview 노드에서 내용 확인 후 "승인"
  → setStepState(previewNodeId, 'done')
        ↓
  fb-publish 노드 "지금 게시" 클릭
        ↓
  POST /api/facebook/publish
  → Facebook Graph API  POST /{pageId}/feed
  → FacebookPost DB 저장 (게시 이력)
```

---

### 5-5. 이메일 최종 발송 흐름 (confirm-send)

```
confirm-send 노드 설정 모달 열림
        ↓
  자동 검증 체크 (800ms 딜레이 후 표시)
  ├── Gmail 토큰 연동 여부  (GET /api/user/tokens)
  ├── 수신자 이메일 유효성
  ├── 이메일 제목 입력 여부
  └── 미리보기 텍스트 (경고)
        ↓
  오류 없으면 "지금 발송하기" 버튼 활성화
        ↓
  사용자 클릭 → 확인 모달
        ↓
  POST /api/email/send  { nodes: FlowNode[] }
        ↓
  서버 side runConfirmSendNode()
    ├── nodes에서 email 노드 data(blocks) 추출
    ├── @react-email/render로 HTML 렌더링
    ├── DB에서 userId의 GMAIL ExternalToken 조회
    └── Nodemailer(Gmail SMTP or Mailpit)로 발송
        ↓
  성공 → 발송 완료 화면
  실패 → 에러 메시지 표시
```

---

### 5-6. 플로우 실행 엔진 (`runFlow`)

`src/shared/libs/flow-engine/runner.ts`

```
runFlow(nodes, send, context)
        ↓
  toOrderedChain(nodes)
  → nextNodeId가 참조되지 않는 노드 = 시작 노드 탐색
  → nextNodeId 체인을 따라 순서 정렬
        ↓
  노드 순차 반복:
    send({ type: 'node_start', nodeId, nodeType })
        ↓
    executeNode(type, data, lastOutput, context)
      ├── 'email'         → runEmailCreateNode()
      ├── 'confirm-send'  → runConfirmSendNode()  (실제 발송)
      └── 나머지          → runPassthroughNode()  (data 그대로 통과)
        ↓
    send({ type: 'node_done', nodeId, output })
    lastOutput = result.output  (파이프라인)
        ↓
    branchIds 있으면:
      Promise.all([nextNodeId 체인, ...branchIds 체인])  ← 병렬 실행
      send({ type: 'done' }) 후 종료
        ↓
  send({ type: 'done' })
```

**FlowEvent 타입**

| 이벤트 | 의미 |
|--------|------|
| `node_start` | 노드 실행 시작 |
| `node_done` | 노드 실행 완료 (output 포함) |
| `node_skip` | 실행 불가 노드 타입 건너뜀 |
| `error` | 노드 실행 실패 (체인 중단) |
| `done` | 전체 플로우 완료 |

---

## 6. 데이터베이스 스키마

```
User
 ├── BrandKit          (1:1)  로고·컬러·폰트·톤·감성
 ├── UserApiKey[]      (1:N)  AI API 키 (ANTHROPIC · OPENAI · GEMINI)
 ├── ExternalToken[]   (1:N)  Gmail · Facebook OAuth 토큰
 └── Flow[]            (1:N)  캠페인 플로우
      ├── FlowVersion[]  (1:N)  definition 스냅샷 이력 (복원용)
      └── ExecutionRun[] (1:N)  실행 단위
           └── ExecutionLog[] (1:N)  노드별 실행 로그

FacebookPost           페이스북 게시 이력 (플로우와 무관한 독립 테이블)
```

**주요 설계 포인트**

- `Flow.definition` — 노드 그래프 전체를 **JSON 단일 컬럼**으로 저장 (n8n 방식)
- `FlowVersion.definition` — 스냅샷 저장으로 히스토리·복원 지원
- `ExecutionLog.nodeId` — FK가 아닌 문자열 (실행 시점 definition 기준, 스키마 변경에 독립적)
- `User.id`, `Flow.id` 등 PK는 모두 `nanoid()` 기반

---

## 7. API 엔드포인트 목록

### 인증

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/register` | 이메일/비밀번호 회원가입 |
| GET | `/api/auth/facebook/authorize` | Facebook OAuth 시작 |
| GET | `/api/auth/facebook/callback` | Facebook OAuth 콜백 + ExternalToken 저장 |
| GET | `/api/auth/gmail/authorize` | Gmail OAuth 시작 |
| GET | `/api/auth/gmail/callback` | Gmail OAuth 콜백 + ExternalToken 저장 |
| ANY | `/api/auth/[...nextauth]` | NextAuth 핸들러 (Google OAuth, Credentials) |

### 플로우

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/flow` | 플로우 목록 조회 |
| POST | `/api/flow` | 플로우 생성 (이메일·페이스북 초기 노드 자동 배치) |
| GET | `/api/flow/:id` | 플로우 + definition 조회 |
| PATCH | `/api/flow/:id` | definition autosave |

### 이메일

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/email/agent` | 이메일 콘텐츠 AI 생성 (SSE 스트리밍) |
| POST | `/api/email/send` | 이메일 발송 (Gmail 또는 Mailpit) |
| POST | `/api/email/send-dev` | 개발용 테스트 발송 |
| POST | `/api/email/gmail-agent` | Gmail 에이전트 |

### 페이스북

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/facebook/agent` | 페이스북 포스팅 AI 생성 (SSE 스트리밍) |
| POST | `/api/facebook/publish` | Facebook Graph API 게시 |

### 뉴스

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/news` | Google RSS 뉴스 목록 조회 |
| GET | `/api/news/article?url=` | 기사 본문 스크래핑 |

### 유저

| Method | Path | 설명 |
|--------|------|------|
| GET/POST/DELETE | `/api/user/ai-keys` | AI API 키 조회·등록·삭제 |
| GET/PATCH | `/api/user/brand-kit` | 브랜드킷 조회·저장 |
| POST | `/api/user/brand-kit/extract` | URL로부터 브랜드킷 자동 추출 |
| GET | `/api/user/flows` | 내 플로우 목록 |
| GET/DELETE | `/api/user/tokens` | 외부 서비스 토큰 조회·삭제 |
| POST | `/api/user/onboarding` | 온보딩 완료 처리 |

### 기타

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/docs` | Swagger JSON 스펙 |
| GET | `/api-docs` | Swagger UI 페이지 |

---

## 8. 환경 변수

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (`postgresql://...`) |
| `AUTH_SECRET` | NextAuth JWT 암호화 시크릿 |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 시크릿 |
| `FB_APP_ID` | Facebook 앱 ID |
| `FB_APP_SECRET` | Facebook 앱 시크릿 |
| `ANTHROPIC_API_KEY` | Anthropic 서버 전용 API 키 (fallback) |
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | Anthropic 클라이언트 fallback 키 |
| `NEXT_PUBLIC_OPENAI_API_KEY` | OpenAI 클라이언트 fallback 키 |
| `USE_MAILPIT` | `true` → 로컬 Mailpit으로 발송 |
| `MAILPIT_HOST` | Mailpit SMTP 호스트 (기본: `127.0.0.1`) |

---

> 작성일: 2026-04-23
