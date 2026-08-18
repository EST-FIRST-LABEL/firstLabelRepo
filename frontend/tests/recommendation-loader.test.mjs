import assert from "node:assert/strict";
import test from "node:test";

import {
  createRequestGuard,
  loadInitialRecommendations,
} from "../app/recommend/[id]/recommendation-loader.ts";

test("loads filters before making exactly one initial recommendation request", async () => {
  const paths = [];
  const get = async (path) => {
    paths.push(path);
    if (path === "/api/v1/users/me/filters") {
      return { items: [{ id: 7, name: "saved", summary: "", keywords: ["LACTOSE"], updated_at: "now" }] };
    }
    return { base_product: { id: 42 }, similar: [], lactose_free: [], plant_based: [] };
  };

  const result = await loadInitialRecommendations({ id: "42", authenticated: true, get });

  assert.deepEqual(paths, [
    "/api/v1/users/me/filters",
    "/api/v1/products/42/recommendations?filter_id=7",
  ]);
  assert.equal(result.filterId, 7);
  assert.equal(result.filters.length, 1);
});

test("guest makes one recommendation request without loading saved filters", async () => {
  const paths = [];
  const get = async (path) => {
    paths.push(path);
    return { base_product: { id: 42 }, similar: [], lactose_free: [], plant_based: [] };
  };

  const result = await loadInitialRecommendations({ id: "42", authenticated: false, get });

  assert.deepEqual(paths, ["/api/v1/products/42/recommendations"]);
  assert.equal(result.filterId, null);
  assert.deepEqual(result.filters, []);
});

test("falls back to a guest recommendation when the saved-filter fetch fails", async () => {
  // Important 3: 필터 조회가 실패해도 기본 추천을 받아 무한 스피너를 피한다.
  const paths = [];
  const get = async (path) => {
    paths.push(path);
    if (path === "/api/v1/users/me/filters") throw new Error("401 stale token");
    return { base_product: { id: 42 }, similar: [], lactose_free: [], plant_based: [] };
  };

  const result = await loadInitialRecommendations({ id: "42", authenticated: true, get });

  assert.deepEqual(paths, [
    "/api/v1/users/me/filters",
    "/api/v1/products/42/recommendations",
  ]);
  assert.equal(result.filterId, null);
  assert.deepEqual(result.filters, []);
  assert.ok(result.data);
});

test("request guard keeps only the latest of out-of-order responses", () => {
  // Important 4: 빠른 필터 전환에서 이전(느린) 응답이 최신 응답을 덮지 않는다.
  const guard = createRequestGuard();
  const first = guard.begin();
  const second = guard.begin();

  assert.equal(guard.isStale(first), true); // 먼저 시작한 요청은 뒤늦게 와도 무시
  assert.equal(guard.isStale(second), false); // 마지막 요청만 반영

  const third = guard.begin();
  assert.equal(guard.isStale(second), true);
  assert.equal(guard.isStale(third), false);
});
