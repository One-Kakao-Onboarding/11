/**
 * 로컬 타임존 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * toISOString()과 달리 UTC 변환 없이 로컬 날짜를 반환합니다.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 날짜 문자열을 로컬 타임존의 자정(00:00:00)으로 파싱
 * YYYY-MM-DD 형식의 문자열을 받아 Date 객체로 반환
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}
