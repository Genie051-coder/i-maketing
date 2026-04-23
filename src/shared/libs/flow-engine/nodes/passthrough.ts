/**
 * Pass-through 노드
 *
 * 자기 자신의 nodeData를 이전 출력(lastOutput)에 shallow-merge해서 다음 노드로 전달합니다.
 * 실행 로직 없이 데이터만 흘려보내는 노드 타입에 사용합니다.
 *
 * 사용처:
 * - campaign-purpose → campaignType을 전달
 * - address-book     → recipientEmail을 전달
 * - send-settings    → subject, previewText, sendMode 등을 전달
 */
export async function runPassthroughNode(
  nodeData: Record<string, unknown>,
  lastOutput: unknown
): Promise<Record<string, unknown>> {
  const prev =
    lastOutput != null && typeof lastOutput === 'object' && !Array.isArray(lastOutput)
      ? { ...(lastOutput as Record<string, unknown>) }
      : {}

  return { ...prev, ...nodeData }
}
