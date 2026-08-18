export type FilterLike = {
  id: number;
  name: string;
  summary: string;
  keywords: string[];
  updated_at: string;
};

type LoaderOptions = {
  id: string;
  authenticated: boolean;
  get: <T>(path: string) => Promise<T>;
};

export async function loadInitialRecommendations<T>({ id, authenticated, get }: LoaderOptions) {
  let filters: FilterLike[] = [];
  let filterId: number | null = null;

  if (authenticated) {
    try {
      const response = await get<{ items: FilterLike[] }>("/api/v1/users/me/filters");
      filters = response.items ?? [];
      filterId = filters[0]?.id ?? null;
    } catch {
      // 저장 필터 조회 실패(만료 토큰/네트워크/잘못된 응답)여도 기본 추천으로 진행해
      // 무한 스피너를 피한다 (Important 3). 추천 호출 자체가 실패하면 아래에서 던진다.
      filters = [];
      filterId = null;
    }
  }

  const query = filterId === null ? "" : `?filter_id=${filterId}`;
  const data = await get<T>(`/api/v1/products/${id}/recommendations${query}`);
  return { data, filters, filterId };
}

/**
 * 증가하는 요청 토큰으로 out-of-order 응답을 걸러낸다 (Important 4).
 * 각 요청 시작 시 begin()으로 토큰을 받고, 응답을 반영하기 전에 isStale(token)로
 * 최신 요청인지 확인한다. 이전(느린) 응답이 최신 선택을 덮는 것을 막는다.
 */
export function createRequestGuard() {
  let latest = 0;
  return {
    begin(): number {
      latest += 1;
      return latest;
    },
    isStale(token: number): boolean {
      return token !== latest;
    },
  };
}
