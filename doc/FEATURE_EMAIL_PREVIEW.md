# 기능 개발: 마지막 노드에서 이메일 미리보기 구현

| 항목 | 내용 |
|------|------|
| **문서 유형** | FE 기능 개발 요구사항 |
| **대상 파일** | `src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx` |
| **우선순위** | 높음 |
| **작성일** | 2026-04-23 |

---

## 1. 배경 및 문제 정의

### 현재 상태 (AS-IS)

`발송 확인` 노드(`confirm-send`)의 설정 모달에는 **이메일 미리보기 섹션**이 UI 상 존재하지만, 실제 이메일 본문을 렌더링하지 않고 다음과 같은 **정적 placeholder 텍스트**만 표시하고 있습니다.

```
┌─────────────────────────────────────────────────────┐
│  From: Gmail 연동 계정                               │
│  테스트 이메일                                       │
│  (미리보기 텍스트)                                   │
│                                                     │
│          이메일 콘텐츠 미리보기          ← 이 부분이 문제
│                                                     │
└─────────────────────────────────────────────────────┘
```

**문제가 되는 코드 위치**:  
`src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx` — 346~348번 줄

```tsx
// ConfirmSendConfig.tsx  L346-L348
<div className="flex items-center justify-center px-4 py-12 text-center text-sm text-gray-400">
  이메일 콘텐츠 미리보기   {/* ← 하드코딩된 placeholder, 실제 블록을 렌더링하지 않음 */}
</div>
```

### 목표 상태 (TO-BE)

사용자가 `이메일 작성` 노드에서 구성한 **실제 이메일 블록(blocks)** 을 `발송 확인` 노드의 미리보기 영역에 렌더링합니다.  
PC / 모바일 토글에 따라 너비가 달라져야 하며, 이미 존재하는 블록 렌더러를 재사용합니다.

---

## 2. 관련 코드 현황

### 2-1. 이미 구현된 부분 (재사용 대상)

| 파일 | 역할 | 재사용 방법 |
|------|------|-----------|
| `src/features/nodes/email-create/ui/EmailDropZone.tsx` | 블록 배열을 받아 이메일 형태로 렌더링하는 `renderBlockContent()` 함수 포함 | 이 함수 또는 컴포넌트를 직접 import해서 재사용 |
| `src/features/Flow/store/useFlowStore.ts` | 모든 노드의 data를 포함하는 Zustand 스토어 | `useFlowStore(s => s.nodes)` 로 email 노드 data 접근 |
| `src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx` | 현재 미리보기 섹션이 있는 파일. PC/모바일 토글(`previewMode` state)은 이미 구현됨 | 수정 대상 파일 |

### 2-2. `email` 노드 data 구조

```ts
// useFlowStore의 nodes 배열에서 type === 'email' 인 노드의 data
interface EmailNodeData {
  fromName?: string        // 발신자명
  subject?: string         // 이메일 제목
  previewText?: string     // 미리보기 텍스트
  brandColor?: string      // 브랜드 색상 (hex)
  logoUrl?: string         // 로고 URL
  blocks?: EmailBlock[]    // ← 렌더링해야 할 블록 배열
}
```

### 2-3. `renderBlockContent` 함수 시그니처 (EmailDropZone.tsx)

```ts
// src/features/nodes/email-create/ui/EmailDropZone.tsx
function renderBlockContent(block: EmailBlock, brandColor: string): React.ReactNode
```

지원하는 블록 타입: `Logo` · `Text` · `Image` · `Button` · `Hr` · `List` · `TwoColumn` · `SnsShare` · `SnsLinks` · `VideoPreview` · `Html` · `Footer` · `Spacer`

---

## 3. 요구사항

### 3-1. 핵심 요구사항

#### REQ-01. email 노드 data 읽기

`ConfirmSendConfig.tsx` 내에서 Zustand store로부터 `type === 'email'` 인 노드의 `data`를 읽어야 합니다.

```ts
// ConfirmSendConfig.tsx 상단에 추가
const emailNode = nodes.find((n) => n.type === 'email')
const emailData = emailNode?.data as {
  blocks?: EmailBlock[]
  brandColor?: string
  fromName?: string
} | undefined

const emailBlocks = emailData?.blocks ?? []
const emailBrandColor = emailData?.brandColor || '#0f172a'
```

> `nodes`는 이미 `ConfirmSendConfig.tsx` 상단에서 `useFlowStore`를 통해 선언되어 있습니다.

---

#### REQ-02. 블록 렌더링 구현

현재 placeholder 텍스트 부분을 실제 블록 렌더링으로 교체합니다.

**교체 전 (현재 코드)**:
```tsx
<div className="flex items-center justify-center px-4 py-12 text-center text-sm text-gray-400">
  이메일 콘텐츠 미리보기
</div>
```

**교체 후 (구현 목표)**:
```tsx
<div className="px-8 py-6">
  {emailBlocks.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-gray-400">이메일 작성 노드에서 블록을 추가해주세요</p>
    </div>
  ) : (
    <div className="space-y-3">
      {emailBlocks.map((block) => (
        <div key={block.id}>
          {renderBlockContent(block, emailBrandColor)}
        </div>
      ))}
    </div>
  )}
</div>
```

---

#### REQ-03. PC / 모바일 반응형 너비

`previewMode` state는 이미 구현되어 있습니다. 미리보기 wrapper의 너비 클래스가 이미 아래와 같이 적용되어 있으므로, 블록 영역도 동일 wrapper 내에 위치하면 자동으로 반응형이 됩니다.

```tsx
// 이미 존재하는 코드 — 변경 불필요
<div
  className={cn(
    'mx-auto overflow-hidden rounded-lg border border-gray-200 bg-white transition-all',
    previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
  )}
>
```

| 모드 | 너비 |
|------|------|
| PC | `w-full` (전체 너비) |
| 모바일 | `max-w-[375px]` (375px 제한) |

---

#### REQ-04. 이메일 헤더 영역 개선 (선택 권장)

현재 "From: Gmail 연동 계정"이 하드코딩되어 있습니다. email 노드의 `fromName`을 표시하도록 개선합니다.

```tsx
// 현재
<p className="truncate text-xs text-gray-400">From: Gmail 연동 계정</p>

// 개선 후
<p className="truncate text-xs text-gray-400">
  From: {emailData?.fromName ? `${emailData.fromName} (Gmail)` : 'Gmail 연동 계정'}
</p>
```

---

### 3-2. 블록이 없을 때 빈 상태 UI

| 상황 | 표시 내용 |
|------|---------|
| `emailBlocks.length === 0` | "이메일 작성 노드에서 블록을 추가해주세요" 안내 텍스트 |
| `emailBlocks.length > 0` | 실제 블록 렌더링 |

---

### 3-3. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **성능** | 블록 목록은 읽기 전용으로 렌더링. DnD, 클릭 선택 등 인터랙션 불필요 |
| **스크롤** | 블록이 많을 경우 미리보기 영역 내부에서 스크롤 처리 (`overflow-y-auto`, 최대 높이 제한 권장) |
| **스타일 일관성** | `EmailDropZone.tsx`의 `renderBlockContent` 와 동일한 시각적 결과 유지 |
| **편집 불가** | 미리보기는 읽기 전용. 블록 클릭/드래그/삭제 이벤트 없음 |

---

## 4. 구현 가이드

### 4-1. 수정 파일

```
src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx   ← 주 수정 파일
```

### 4-2. import 추가

```ts
// ConfirmSendConfig.tsx 상단 import에 추가
import type { EmailBlock } from '@/features/nodes/email-create/types'
import { renderBlockContent } from '@/features/nodes/email-create/ui/EmailDropZone'
```

> `renderBlockContent`가 현재 `EmailDropZone.tsx`에서 **export되지 않은 내부 함수**라면,  
> 아래 두 가지 중 하나를 선택합니다.  
> **Option A**: `EmailDropZone.tsx`에서 `export function renderBlockContent(...)` 로 수정  
> **Option B**: `ConfirmSendConfig.tsx` 내부에 렌더링 로직을 별도 컴포넌트로 추가

---

### 4-3. 전체 수정 범위 (Diff 요약)

```diff
// ConfirmSendConfig.tsx

+ import type { EmailBlock } from '@/features/nodes/email-create/types'
+ import { renderBlockContent } from '@/features/nodes/email-create/ui/EmailDropZone'

  // ... 기존 코드 ...

  const emailNode = nodes.find((n) => n.type === 'email')
+ const emailData = emailNode?.data as {
+   blocks?: EmailBlock[]
+   brandColor?: string
+   fromName?: string
+ } | undefined
+ const emailBlocks = emailData?.blocks ?? []
+ const emailBrandColor = emailData?.brandColor || '#0f172a'

  // ... 미리보기 섹션 ...

- <div className="flex items-center justify-center px-4 py-12 text-center text-sm text-gray-400">
-   이메일 콘텐츠 미리보기
- </div>

+ <div className="max-h-[480px] overflow-y-auto px-8 py-6">
+   {emailBlocks.length === 0 ? (
+     <div className="flex flex-col items-center justify-center py-12 text-center">
+       <p className="text-sm text-gray-400">이메일 작성 노드에서 블록을 추가해주세요</p>
+     </div>
+   ) : (
+     <div className="space-y-3">
+       {emailBlocks.map((block) => (
+         <div key={block.id}>
+           {renderBlockContent(block, emailBrandColor)}
+         </div>
+       ))}
+     </div>
+   )}
+ </div>
```

---

## 5. 예상 결과 화면

### Before (현재)

```
┌────────────────────────────────────────────────────────┐
│  이메일 미리보기              [PC]  [모바일]            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  From: Gmail 연동 계정                            │  │
│  │  테스트 이메일                                    │  │
│  │                                                  │  │
│  │                                                  │  │
│  │       이메일 콘텐츠 미리보기   ← 정적 텍스트       │  │
│  │                                                  │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### After (구현 후 — PC 모드)

```
┌────────────────────────────────────────────────────────┐
│  이메일 미리보기              [PC]  [모바일]            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  From: 발신자명 (Gmail)                           │  │
│  │  테스트 이메일                                    │  │
│  │  (미리보기 텍스트)                                │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  첫 이메일 발송   ← Text 블록 실제 렌더링          │  │
│  │                                                  │  │
│  │  ────────────────────────────────  ← Hr 블록     │  │
│  │                                                  │  │
│  │  [   지금 확인하기   ]  ← Button 블록             │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### After (구현 후 — 모바일 모드)

```
┌────────────────────────────────────────────────────────┐
│  이메일 미리보기              [PC]  [모바일]            │
│                ┌────────────────────────┐               │
│                │  From: 발신자명 (Gmail) │               │
│                │  테스트 이메일          │               │
│                ├────────────────────────┤               │
│                │                        │               │
│                │  첫 이메일 발송         │               │ ← max-w-[375px]
│                │                        │               │
│                │  [  지금 확인하기  ]    │               │
│                │                        │               │
│                └────────────────────────┘               │
└────────────────────────────────────────────────────────┘
```

### 블록이 없을 때

```
┌────────────────────────────────────────────────────────┐
│  이메일 미리보기              [PC]  [모바일]            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  From: Gmail 연동 계정                            │  │
│  │  (제목 없음)                                      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │    이메일 작성 노드에서 블록을 추가해주세요          │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 6. 데이터 흐름

```
이메일 작성 노드 (email)
  └─ emailNode.data.blocks[]      ──┐
  └─ emailNode.data.brandColor    ──┤
  └─ emailNode.data.fromName      ──┤
                                    │  (Zustand useFlowStore)
발송 확인 노드 (confirm-send)       │
  └─ ConfirmSendConfig.tsx  ←───────┘
       ↓  nodes.find(n => n.type === 'email')
       ↓  emailData.blocks[]
       ↓
  renderBlockContent(block, brandColor)
       ↓
  미리보기 영역에 실제 블록 렌더링
```

---

## 7. 체크리스트

개발 완료 전 아래 항목을 직접 확인해주세요.

- [ ] `이메일 작성` 노드에서 블록을 추가했을 때, `발송 확인` 노드 미리보기에 실제 내용이 보인다
- [ ] `Text` 블록: 입력한 텍스트가 올바른 레벨(h1~body)로 렌더링된다
- [ ] `Button` 블록: brandColor 배경색의 버튼이 렌더링된다
- [ ] `Image` 블록: URL이 있으면 이미지가 표시되고, 없으면 placeholder가 표시된다
- [ ] `Hr` 블록: 가로 구분선이 표시된다
- [ ] `Footer` 블록: 회사명, 주소, 수신거부 링크가 표시된다
- [ ] PC 모드: 미리보기가 전체 너비로 표시된다
- [ ] 모바일 모드: 미리보기가 `max-w-[375px]` 로 좁혀진다
- [ ] 블록이 없을 때: 안내 텍스트가 표시된다
- [ ] 블록이 많을 때: 미리보기 영역 내부에서 스크롤이 작동한다
- [ ] 미리보기 블록은 클릭·드래그 등 편집 인터랙션이 없다 (읽기 전용)

---

## 8. 참고 파일 경로

```
수정 대상
  src/features/nodes/email-confirm-send/ConfirmSendConfig.tsx

재사용 대상
  src/features/nodes/email-create/ui/EmailDropZone.tsx   ← renderBlockContent
  src/features/nodes/email-create/types.ts               ← EmailBlock 타입
  src/features/Flow/store/useFlowStore.ts                ← nodes 상태
```
