/** 플로우 캔버스 패닝·줌·포커스 애니메이션 공통 상수 */

export const CANVAS_MIN_ZOOM = 0.15
export const CANVAS_MAX_ZOOM = 2.5

export const WHEEL_ZOOM_SENSITIVITY = 0.002
export const WHEEL_ZOOM_FACTOR_MIN = 0.88
export const WHEEL_ZOOM_FACTOR_MAX = 1.14

export const PAN_DURATION_MS = 600
export const NODE_FIT_PADDING = 24

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
