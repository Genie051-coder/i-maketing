# 기능 개선: 이메일 본문 인라인 편집 & 노드 자동저장

| 항목 | 내용 |
|------|------|
| **문서 유형** | FE 기능 개선 요구사항 |
| **우선순위** | 높음 |
| **작성일** | 2026-04-23 |

---

## 목차

1. [배경 및 문제 정의](#1-배경-및-문제-정의)
2. [이슈 A — 텍스트 인라인 편집 불가](#2-이슈-a--텍스트-인라인-편집-불가)
3. [이슈 B — 노드 자동저장 미구현](#3-이슈-b--노드-자동저장-미구현)
4. [변경 범위 요약](#4-변경-범위-요약)
5. [개발 체크리스트](#5-개발-체크리스트)

---

## 1. 배경 및 문제 정의

### 현재 UX 흐름 (AS-IS) — 불편한 2단계 구조

```
사용자가 이메일 본문의 텍스트를 수정하고 싶을 때:

  1. 미리보기 영역에서 Text 블록 클릭
        ↓  (선택만 됨, 바로 입력 불가)
  2. 오른쪽 패널 → 블록 편집 탭으로 전환
        ↓
  3. Textarea에서 텍스트 수정
        ↓
  4. 상단 "노드 저장" 버튼 클릭  ← 저장하지 않으면 변경 내용 소실
```

이 흐름에서 발생하는 두 가지 문제:

| 이슈 | 증상 | 영향 |
|------|------|------|
| **A. 인라인 편집 불가** | 미리보기 영역의 텍스트를 클릭해도 직접 타이핑 불가 | UX 마찰 — 우측 패널을 왔다갔다 해야 함 |
| **B. 자동저장 없음** | 내용 수정 후 저장 버튼 안 누르면 모달 닫을 때 내용 소실 | 사용자 데이터 손실 위험 |

---

## 2. 이슈 A — 텍스트 인라인 편집 불가

### 2-1. 현재 코드 분석

**문제 파일**: `src/features/nodes/email-create/ui/EmailDropZone.tsx`

```tsx
// EmailDropZone.tsx  L45-L64 — renderBlockContent 의 Text 케이스
case 'Text': {
  return (
    <p
      className={`whitespace-pre-line ${textClasses[block.level] ?? textClasses.body}`}
      style={block.level !== 'body' ? { color: brandColor } : {}}
    >
      {block.content || (
        <span className="text-gray-300 italic">텍스트 내용을 입력하세요...</span>
      )}
    </p>
    //  ↑ 정적 <p> 태그 — 클릭해도 입력 불가
  )
}
```

```tsx
// SortableBlock 컴포넌트 — L239
<div
  onClick={onSelect}   // ← 클릭 시 "선택"만 됨. 입력 커서 없음
  className={`... cursor-pointer ...`}
>
  <div className="px-1 py-1">{renderBlockContent(block, brandColor)}</div>
</div>
```

**결론**: `renderBlockContent`가 모든 블록을 **읽기 전용 JSX**로 반환합니다.  
`SortableBlock` 은 클릭 시 오른쪽 패널 선택 상태만 바꿀 뿐, 인라인 편집을 제공하지 않습니다.

---

### 2-2. 목표 동작 (TO-BE)

```
사용자가 미리보기 영역의 Text 블록을 더블클릭하면:
  → 그 자리에서 바로 텍스트 입력 가능 (인라인 편집 모드)
  → 편집 영역 바깥 클릭 또는 ESC → 인라인 편집 종료
  → 변경 즉시 블록 data 업데이트 (오른쪽 패널과 동기화)
```

```
┌──────────────────────────────────────┐
│  (미리보기 영역)                      │
│                                       │
│  ┌────────────────────────────────┐   │
│  │  이전: 클릭해도 텍스트 선택만  │   │
│  └────────────────────────────────┘   │
│                  ↓ 개선 후            │
│  ┌────────────────────────────────┐   │
│  │ 더블클릭 →  │ 첫 이메일 발송 |  │  │  ← 인라인 textarea 활성화
│  │             커서 깜박임         │   │
│  └────────────────────────────────┘   │
└──────────────────────────────────────┘
```

---

### 2-3. 구현 방법

#### 접근 방식: `isSelected + isEditing` 이중 상태

`SortableBlock` 컴포넌트에 `isEditing` 상태를 추가합니다.  
더블클릭 시 `isEditing = true` → Text 블록의 `<p>` 를 `<textarea>`로 교체합니다.

**`EmailDropZone.tsx` — `SortableBlock` 수정**

```tsx
// 1. onUpdate prop 추가
interface SortableBlockProps {
  block: EmailBlock
  brandColor: string
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdate: (newBlock: EmailBlock) => void  // 🆕 인라인 업데이트 콜백
}

// 2. isEditing state 추가
function SortableBlock({ block, brandColor, isSelected, onSelect, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)

  // 더블클릭 → 편집 모드 진입 (Text 블록만)
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (block.type !== 'Text') return
    e.stopPropagation()
    setIsEditing(true)
  }

  // 편집 모드 종료 (blur 또는 ESC)
  const handleBlur = () => setIsEditing(false)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsEditing(false)
  }

  // 3. Text 블록 + 편집 모드: <p> → <textarea> 교체
  const renderInlineEdit = () => {
    if (block.type !== 'Text' || !isEditing) return null

    const textClasses: Record<string, string> = {
      h1: 'text-3xl font-bold',
      h2: 'text-2xl font-bold',
      h3: 'text-xl font-semibold',
      body: 'text-sm leading-relaxed text-gray-700',
      // ...
    }

    return (
      <textarea
        autoFocus
        value={block.content}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full resize-none rounded border-none bg-transparent p-0 outline-none ring-0
          ${textClasses[block.level] ?? textClasses.body}`}
        style={{
          color: block.level !== 'body' ? brandColor : undefined,
          minHeight: '1.5em',
        }}
        rows={Math.max(2, block.content.split('\n').length)}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}      // 🆕 더블클릭 이벤트
        className={`relative rounded-lg border-2 transition-all
          ${isEditing
            ? 'border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)] cursor-text'  // 🆕 편집 중
            : isSelected
              ? 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.12)] cursor-pointer'
              : 'border-transparent hover:border-gray-200 cursor-pointer'
          }`}
      >
        {/* drag handle — 편집 중 숨기기 */}
        {!isEditing && (
          <div {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}
            className="absolute top-1/2 -left-6 ...">
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        <div className="px-1 py-1">
          {/* 편집 모드 = 인라인 textarea, 아닐 때 = 기존 renderBlockContent */}
          {isEditing
            ? renderInlineEdit()
            : renderBlockContent(block, brandColor)
          }
        </div>
      </div>
    </div>
  )
}
```

#### `EmailDropZone` — `onUpdate` prop 연결

```tsx
// EmailDropZoneProps에 onUpdateBlock 추가
interface EmailDropZoneProps {
  emailForm: EmailFormData
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onUpdateBlocks: (blocks: EmailBlock[]) => void
  onDeleteBlock: (id: string) => void
  onUpdateBlock: (id: string, newBlock: EmailBlock) => void  // 🆕
}

// SortableBlock에 onUpdate 전달
<SortableBlock
  key={block.id}
  block={block}
  brandColor={emailForm.brandColor || '#0f172a'}
  isSelected={selectedBlockId === block.id}
  onSelect={() => onSelectBlock(block.id)}
  onDelete={() => onDeleteBlock(block.id)}
  onUpdate={(newBlock) => onUpdateBlock(block.id, newBlock)}  // 🆕
/>
```

#### `EmailConfig` — `onUpdateBlock` 전달

```tsx
// EmailConfig.tsx — EmailDropZone 사용 부분
<EmailDropZone
  emailForm={emailForm}
  selectedBlockId={selectedBlockId}
  onSelectBlock={setSelectedBlockId}
  onUpdateBlocks={(blocks) => handleFormChange({ blocks })}
  onDeleteBlock={handleDeleteBlock}
  onUpdateBlock={(id, newBlock) => {             // 🆕
    const idx = (emailForm.blocks || []).findIndex((b) => b.id === id)
    if (idx < 0) return
    handleUpdateBlock(idx, newBlock)
  }}
/>
```

---

### 2-4. 인라인 편집 UX 규칙

| 상황 | 동작 |
|------|------|
| Text 블록 **더블클릭** | 인라인 편집 모드 진입 (`isEditing = true`) |
| 편집 중 **바깥 클릭** (blur) | 편집 모드 종료, 변경 내용 유지 |
| 편집 중 **ESC** | 편집 모드 종료, 변경 내용 유지 (취소 아님) |
| Text 외 블록 더블클릭 | 오른쪽 패널 "블록 편집" 탭으로 포커스 이동 (기존 동작 유지) |
| 편집 중 드래그 | 드래그 핸들 숨김 → 드래그 불가 (편집 우선) |
| 편집 모드 진입 시 테두리 | 인디고 진한 border + 약한 glow (선택 상태보다 진하게) |

---

## 3. 이슈 B — 노드 자동저장 미구현

### 3-1. 현재 코드 분석

#### 이메일 노드 (`EmailConfig.tsx`)

```tsx
// DynamicModalHeader에 onSave 연결 → 버튼 클릭 시에만 저장
<DynamicModalHeader
  ...
  onSave={handleSave}   // ← 수동 클릭 필요
/>

// handleSave
const handleSave = async () => {
  const payload = buildSavePayload(emailForm)
  const ok = await saveNodeConfig(nodeId, payload)
  if (ok) closeConfig()
}
```

```tsx
// DynamicModalHeader.tsx  L68-L76
<Button variant="outline" size="sm" onClick={onSave}>
  <Save className="h-3.5 w-3.5" />
  노드 저장    ← 이 버튼을 눌러야만 DB에 저장됨
</Button>
```

**문제**: `handleFormChange` 는 로컬 state (`emailForm`)만 업데이트합니다.  
모달을 닫거나 다른 노드로 이동하면 변경 내용이 **사라집니다**.

#### 주소록 / 발송설정 노드

```tsx
// AddressBookConfig.tsx  L25-L29
const handleSave = async () => {
  if (!nodeId || !email.trim()) return
  await saveNodeConfig(nodeId, { recipientEmail: email.trim() })
  closeConfig()  // 저장 후 닫힘 — 저장 버튼 클릭 전엔 반영 안 됨
}
```

---

### 3-2. 자동저장 전략 — Debounce 방식

사용자가 입력을 멈춘 뒤 **일정 시간 후 자동저장**합니다.  
`useFlowStore.saveNodeConfig`는 이미 DB에 PATCH 요청을 보내도록 구현되어 있으므로,  
**호출 시점만 추가**하면 됩니다.

```
사용자 입력
  → handleFormChange(updates)  (로컬 state 업데이트)
  → debounce 타이머 리셋 (800ms)
  → 800ms 동안 추가 입력 없으면
  → saveNodeConfig(nodeId, emailForm)  →  PATCH /api/flow/:id
```

---

### 3-3. 구현 방법

#### 방법 1: `useEffect` + `debounce` — EmailConfig

```tsx
// EmailConfig.tsx
import { useEffect, useRef } from 'react'

// debounce 타이머 ref
const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

// emailForm 변경 시마다 자동저장 예약
useEffect(() => {
  if (!nodeId) return                    // 신규 플로우면 스킵
  if (!emailForm.subject && !emailForm.blocks?.length) return  // 초기 빈 상태 스킵

  if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

  autoSaveTimer.current = setTimeout(async () => {
    const payload = buildSavePayload(emailForm)
    await saveNodeConfig(nodeId, payload)
    // ← closeConfig() 호출 안 함 (모달 유지)
  }, 800)  // 800ms debounce

  return () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
  }
}, [emailForm])  // emailForm 변경 감지
```

#### 방법 2: `onBlur` 자동저장 — AddressBookConfig / SendSettingsConfig

입력 필드 단순 노드는 debounce보다 **포커스 해제(blur) 시 저장**이 자연스럽습니다.

```tsx
// AddressBookConfig.tsx — onBlur 자동저장
<Input
  id="recipient-email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  onBlur={async () => {                      // 🆕 blur 시 자동저장
    if (!nodeId || !email.trim()) return
    await saveNodeConfig(nodeId, { recipientEmail: email.trim() })
    // closeConfig() 제거 — 모달 열린 상태 유지
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      // Enter = 저장 + 닫기 (기존 동작 유지)
      handleSave()
    }
  }}
/>
```

```tsx
// SendSettingsConfig.tsx — 제목/미리보기 필드에 onBlur 추가
<Input
  id="email-subject"
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  onBlur={async () => {                      // 🆕 blur 시 자동저장
    if (!nodeId || !canSave) return
    await saveNodeConfig(nodeId, {
      subject: subject.trim(),
      previewText: previewText.trim(),
      sendMode,
    })
  }}
/>
```

---

### 3-4. 저장 상태 인디케이터 (선택 권장)

사용자가 자동저장 여부를 인지할 수 있도록 헤더에 저장 상태를 표시합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  [시안 A]  [시안 B]  [+]          ● 저장됨   [노드 저장]        │
│                                    ↑ 자동저장 상태 텍스트        │
└─────────────────────────────────────────────────────────────────┘
```

| 상태 | 표시 | 색상 |
|------|------|------|
| 저장 대기 중 (debounce 중) | `● 저장 중...` | 회색 |
| 저장 완료 | `● 저장됨` | 초록 |
| 저장 실패 | `● 저장 실패` | 빨강 |

**`DynamicModalHeader.tsx` 수정**

```tsx
// props 추가
interface DynamicModalHeaderProps {
  ...
  autoSaveStatus?: 'idle' | 'saving' | 'saved' | 'error'  // 🆕
}

// 헤더 오른쪽에 상태 표시
{autoSaveStatus && autoSaveStatus !== 'idle' && (
  <span className={cn('text-xs',
    autoSaveStatus === 'saving' && 'text-gray-400',
    autoSaveStatus === 'saved'  && 'text-emerald-500',
    autoSaveStatus === 'error'  && 'text-red-500',
  )}>
    {autoSaveStatus === 'saving' && '● 저장 중...'}
    {autoSaveStatus === 'saved'  && '● 저장됨'}
    {autoSaveStatus === 'error'  && '● 저장 실패'}
  </span>
)}
```

---

### 3-5. "노드 저장" 버튼 역할 변경

자동저장 도입 후 기존 "노드 저장" 버튼은 **수동 강제 저장 + 모달 닫기**로 역할을 유지합니다.

| 동작 | 현재 | 변경 후 |
|------|------|--------|
| 입력 중 (debounce 미완료) | 저장 안 됨 | 자동저장 예약 중 |
| blur / 입력 멈춤 800ms | 저장 안 됨 | **자동저장 실행** |
| "노드 저장" 버튼 클릭 | 저장 + 모달 닫기 | 강제 저장 + 모달 닫기 (동일) |
| 모달 닫기 (X 버튼) | 변경 내용 소실 | **자동저장 후 닫기** |

---

## 4. 변경 범위 요약

```
┌─────────────────────────────────────────────────────────────────────┐
│  이슈 A — 인라인 편집                                                │
├──────────────────────┬──────────────────────────────────────────────┤
│  파일                 │  변경 내용                                    │
├──────────────────────┼──────────────────────────────────────────────┤
│  EmailDropZone.tsx   │  SortableBlock에 isEditing state 추가         │
│                      │  더블클릭 → Text 블록 인라인 textarea 렌더링  │
│                      │  onUpdate prop 추가                           │
├──────────────────────┼──────────────────────────────────────────────┤
│  EmailConfig.tsx     │  EmailDropZone에 onUpdateBlock prop 전달       │
└──────────────────────┴──────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  이슈 B — 자동저장                                                   │
├──────────────────────┬──────────────────────────────────────────────┤
│  파일                 │  변경 내용                                    │
├──────────────────────┼──────────────────────────────────────────────┤
│  EmailConfig.tsx     │  useEffect + debounce 자동저장 추가           │
│                      │  autoSaveStatus state 추가                    │
├──────────────────────┼──────────────────────────────────────────────┤
│  DynamicModalHeader  │  autoSaveStatus prop 추가 및 상태 텍스트 표시 │
├──────────────────────┼──────────────────────────────────────────────┤
│  AddressBookConfig   │  Input onBlur 자동저장 추가                   │
│                      │  저장 버튼 클릭 시 closeConfig 유지           │
├──────────────────────┼──────────────────────────────────────────────┤
│  SendSettingsConfig  │  Input onBlur 자동저장 추가                   │
└──────────────────────┴──────────────────────────────────────────────┘
```

---

## 5. 개발 체크리스트

### 이슈 A — 인라인 편집

- [ ] `SortableBlock` — `isEditing` state 추가
- [ ] `SortableBlock` — `onDoubleClick` 이벤트 핸들러 추가 (Text 블록 한정)
- [ ] `SortableBlock` — `isEditing = true` 시 `<p>` → `<textarea>` 교체 렌더링
- [ ] `SortableBlock` — `onBlur` / `ESC` 시 `isEditing = false`
- [ ] `SortableBlock` — 편집 중 드래그 핸들 숨기기 (DnD 충돌 방지)
- [ ] `SortableBlock` — 편집 중 테두리를 진한 인디고로 구분
- [ ] `EmailDropZone` — `onUpdateBlock` prop 추가 및 `SortableBlock`에 전달
- [ ] `EmailConfig` — `onUpdateBlock` handler를 `EmailDropZone`에 전달
- [ ] 테스트: Text 블록 더블클릭 → 인라인 입력 가능 확인
- [ ] 테스트: 인라인 편집 후 오른쪽 패널 "블록 편집" 탭과 내용 동기화 확인
- [ ] 테스트: 인라인 편집 중 드래그 불가 확인

### 이슈 B — 자동저장

- [ ] `EmailConfig` — `useEffect` debounce (800ms) 자동저장 추가
- [ ] `EmailConfig` — `autoSaveStatus` state 추가 (`idle | saving | saved | error`)
- [ ] `DynamicModalHeader` — `autoSaveStatus` prop 수신 및 상태 텍스트 렌더링
- [ ] `AddressBookConfig` — Input `onBlur` 자동저장 추가
- [ ] `SendSettingsConfig` — 제목/미리보기 Input `onBlur` 자동저장 추가
- [ ] 테스트: 텍스트 입력 후 800ms 대기 → DB에 자동저장 확인 (네트워크 탭)
- [ ] 테스트: 모달 닫기 전 자동저장 완료 확인
- [ ] 테스트: "노드 저장" 버튼 클릭 시 강제 저장 + 모달 닫힘 유지 확인
- [ ] 테스트: 저장 실패 시 "● 저장 실패" 텍스트 표시 확인

---

## 참고 파일 경로

```
수정 대상
  src/features/nodes/email-create/ui/EmailDropZone.tsx
  src/features/nodes/email-create/EmailConfig.tsx
  src/shared/ui/components/DynamicModalHeader.tsx
  src/features/nodes/email-address-book/AddressBookConfig.tsx
  src/features/nodes/email-send-settings/SendSettingsConfig.tsx

변경 없음
  src/features/Flow/store/useFlowStore.ts
    → saveNodeConfig() 이미 DB PATCH 구현 완료
    → 호출 시점만 추가하면 됨
```
