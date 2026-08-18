"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import * as I from "@/components/icons";
import { Button, ProductThumb, Screen, Spinner, Stars } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
import { api, type Product } from "@/lib/api";

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const category = params.get("category") ?? "";

  const [q, setQ] = useState(initialQ);
  const [items, setItems] = useState<Product[] | null>(null);
  const [onlyLactoseFree, setOnlyLactoseFree] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 검색 조건 변경 시 로딩 상태로 초기화
    setItems(null);
    const search = new URLSearchParams();
    if (initialQ) search.set("q", initialQ);
    if (category) search.set("category", category);
    if (onlyLactoseFree) search.set("lactose_free", "true");
    api
      .get<{ items: Product[] }>(`/api/v1/products/search?${search}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [initialQ, category, onlyLactoseFree]);

  const submit = () => {
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <Screen>
      <header className="sticky top-0 z-20 bg-white px-4 pt-3 pb-3 border-b border-line/70">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/")} aria-label="뒤로" className="p-1 text-ink">
            <I.Back className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center h-[46px] rounded-2xl border-[1.5px] border-brand px-4 gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="제품명, 브랜드, 원재료 검색"
              className="flex-1 bg-transparent text-[14.5px] placeholder:text-[#b6bcc3]"
              autoFocus={!initialQ && !category}
            />
            <button onClick={submit} aria-label="검색" className="text-ink">
              <I.Search className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setOnlyLactoseFree((v) => !v)}
            className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border ${
              onlyLactoseFree ? "bg-brand text-white border-brand" : "bg-white text-sub border-line"
            }`}
          >
            락토프리만
          </button>
          {category && (
            <span className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full bg-mint text-brand">{category}</span>
          )}
        </div>
      </header>

      <div className="px-5 pt-4">
        {items === null ? (
          <div className="py-20 flex justify-center text-brand">
            <Spinner className="w-7 h-7" />
          </div>
        ) : items.length === 0 ? (
          <NoResult keyword={initialQ} />
        ) : (
          <>
            <p className="text-[13.5px] text-sub mb-3">
              검색 결과 <b className="text-ink">{items.length}</b>건
            </p>
            <div className="space-y-2.5">
              {items.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="flex items-center gap-3 fl-card fl-card-tap p-3 active:bg-mint-soft"
                >
                  <ProductThumb url={p.image_url} name={p.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] leading-snug line-clamp-2">{p.name}</p>
                    <p className="text-[13px] text-sub mt-0.5">
                      {p.maker_name} {p.volume && `| ${p.volume}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {p.is_lactose_free && (
                        <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-safe-bg text-brand">
                          락토프리
                        </span>
                      )}
                      {p.is_plant_based && (
                        <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-mint text-brand">
                          식물성
                        </span>
                      )}
                      <Stars rating={p.rating} count={p.rating_count} />
                    </div>
                  </div>
                  <I.Chevron className="w-4 h-4 text-[#c3c9cf] shrink-0" />
                </Link>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-mint-soft p-4">
              <p className="text-[14px] font-bold mb-1">찾는 제품이 없나요?</p>
              <p className="text-[13px] text-sub mb-3">사진을 올려주시면 분석하고 DB에 등록해드려요.</p>
              <Button href="/register" variant="outline" className="h-[46px] text-[14.5px]">
                미등록 제품 등록하기
              </Button>
            </div>
          </>
        )}
        <div className="h-6" />
      </div>

      <ThreeTabNav active="/" />
    </Screen>
  );
}

function NoResult({ keyword }: { keyword: string }) {
  return (
    <div className="pt-10 text-center">
      <div className="w-[120px] h-[120px] mx-auto rounded-3xl bg-mint-soft flex items-center justify-center">
        <I.Search className="w-12 h-12 text-brand/30" />
      </div>
      <h2 className="mt-6 text-[20px] font-extrabold leading-snug">
        {keyword && <span className="text-brand">‘{keyword}’</span>}
        {keyword ? " 검색 결과가 없어요" : "검색 결과가 없어요"}
      </h2>
      <p className="mt-2 text-[14px] text-sub">
        아직 등록되지 않은 상품일 수 있어요.
        <br />
        사진을 올리면 성분을 분석해드려요.
      </p>
      <div className="mt-7">
        <Button href="/register">미등록 제품 등록하기</Button>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
