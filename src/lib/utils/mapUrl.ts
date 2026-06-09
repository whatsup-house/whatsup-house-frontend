// 지도 링크 생성 유틸
// 우선순위: provider별 URL → 장소명/주소 검색 URL

export interface MapLinkLocation {
  name: string
  naverMapUrl?: string | null
  kakaoMapUrl?: string | null
}

/** 장소명 + 주소를 합쳐 검색어를 만든다. */
function buildSearchQuery(name: string, address?: string | null): string {
  return [name, address].filter(Boolean).join(' ').trim()
}

/**
 * 네이버지도 링크.
 * 모바일에서는 웹 지도 페이지가 앱 실행을 유도하고, 미설치 시 웹으로 동작한다.
 */
export function getNaverMapUrl(location: MapLinkLocation, address?: string | null): string {
  if (location.naverMapUrl) return location.naverMapUrl
  const query = buildSearchQuery(location.name, address)
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`
}

/**
 * 카카오지도 링크.
 * 모바일에서는 웹 지도 페이지가 앱 실행을 유도하고, 미설치 시 웹으로 동작한다.
 */
export function getKakaoMapUrl(location: MapLinkLocation, address?: string | null): string {
  if (location.kakaoMapUrl) return location.kakaoMapUrl
  const query = buildSearchQuery(location.name, address)
  return `https://map.kakao.com/?q=${encodeURIComponent(query)}`
}
