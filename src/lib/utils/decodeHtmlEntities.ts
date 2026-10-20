// 백엔드가 봇(AI) 답변을 HTML 이스케이프해 저장한다(R16). 정확히 이 5개 엔티티만 되돌린다.
// &amp; 는 반드시 마지막 — 먼저 풀면 "&amp;lt;" 가 "<" 로 이중 복원된다.
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}
