import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

// 클래스 병합 유틸리티 함수
// 사용법: cn('className1', 'className2', 'className3')
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜 문자열을 상대 시간으로 변환 (예: "3시간 전", "어제")
 * @param dateInput - ISO 8601 또는 파싱 가능한 날짜 문자열
 * @returns 상대 시간 문자열, 파싱 실패 시 원본 반환
 */
export function formatRelativeTime(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return String(dateInput)
    return formatDistanceToNow(date, { addSuffix: true, locale: ko })
  } catch {
    return String(dateInput)
  }
}
