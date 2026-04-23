import type { ValidationResult } from '../_shared/types'
import type { EmailNodeData } from '@/features/flow/types'

export function validateEmailNode(data: EmailNodeData | undefined): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data) {
    errors.push('이메일 설정이 없습니다.')
    return { errors, warnings, valid: false }
  }

  if (!data.subject) warnings.push('제목이 없습니다.')
  if (!data.fromName) warnings.push('발신자 이름이 없습니다.')
  if (!data.blocks || (data.blocks as unknown[]).length === 0)
    warnings.push('이메일 본문이 비어있습니다.')

  return { errors, warnings, valid: errors.length === 0 }
}
