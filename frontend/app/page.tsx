"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import * as I from "@/components/icons";
import { BottomNav, ProductThumb, Screen, Stars } from "@/components/ui";
import { api, auth, type Product } from "@/lib/api";

type HomeData = { categories: { code: string; label: string; icon: string }[]; recommended: Product[] };
type History = { id: number; keyword: string };

const CATEGORY_ICON: Record<string, (p: { className?: string }) => React.ReactElement> = {
  milk: I.Milk,
  drink: I.Drink,
  snack: I.Snack,
  bakery: I.Bakery,
};

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<HomeData | null>(null);
  const [history, setHistory] = useState<History[]>([]);

  const loadHistory = useCallback(() => {
    if (!auth.token) return setHistory([]);
    api.get<{ items: History[] }>("/api/v1/users/me/search-history").then((r) => setHistory(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<HomeData>("/api/v1/products/home").then(setData).catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage(외부 저장소) 동기화
    loadHistory();
  }, [loadHistory]);

  const search = (keyword: string) => {
    if (!keyword.trim()) return;
    router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  const clearHistory = async () => {
    await api.del("/api/v1/users/me/search-history").catch(() => {});
    setHistory([]);
  };

  const removeHistory = async (id: number) => {
    setHistory((h) => h.filter((x) => x.id !== id));
    await api.del(`/api/v1/users/me/search-history/${id}`).catch(() => {});
  };

  return (
    <Screen>
      <header className="px-5 pt-4 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <I.Logo className="w-6 h-6 text-brand" />
          <span className="font-extrabold tracking-[0.06em] text-brand text-[17px]">FIRST LABEL</span>
        </div>
        <Link href={auth.token ? "/mypage/notifications" : "/login"} aria-label="알림">
          <I.Bell className="w-6 h-6 text-ink" />
        </Link>
      </header>

      <div className="px-5 pt-4">
        <h1 className="text-[26px] font-extrabold leading-[1.35] tracking-[-0.02em]">
          더 건강한 선택을
          <br />
          도와드릴게요 🌿
        </h1>

        <div className="mt-5 flex items-center h-[56px] rounded-2xl border-[1.5px] border-brand px-5 gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(q)}
            placeholder="제품명, 브랜드, 원재료를 검색해보세요"
            className="flex-1 bg-transparent text-[15px] placeholder:text-[#b6bcc3]"
          />
          <button onClick={() => search(q)} aria-label="검색" className="text-ink">
            <I.Search className="w-[22px] h-[22px]" />
          </button>
        </div>

        <section className="mt-7">
          <h2 className="font-bold text-[16px] mb-3">자주 찾는 카테고리</h2>
          <div className="grid grid-cols-5 gap-2">
            {(data?.categories ?? []).map((c) => {
              const Icon = CATEGORY_ICON[c.icon] ?? I.Snack;
              return (
                <Link
                  key={c.code}
                  href={`/search?category=${encodeURIComponent(c.code)}`}
                  className="aspect-square fl-card fl-card-tap flex flex-col items-center justify-center gap-1.5 active:bg-mint-soft"
                >
                  <Icon className="w-6 h-6 text-brand" />
                  <span className="text-[11.5px] font-medium">{c.label}</span>
                </Link>
              );
            })}
            <Link
              href="/search"
              className="aspect-square fl-card fl-card-tap flex flex-col items-center justify-center gap-1.5 active:bg-mint-soft"
            >
              <I.Dots className="w-6 h-6 text-brand" />
              <span className="text-[11.5px] font-medium">더보기</span>
            </Link>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[16px]">최근 검색</h2>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-[13px] font-semibold text-brand">
                전체 삭제
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-[13.5px] text-sub py-3">
              {auth.token ? "최근 검색 기록이 없어요." : "로그인하면 최근 검색을 저장해드려요."}
            </p>
          ) : (
            <div className="fl-card divide-y divide-line">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="flex items-center gap-3 px-4 h-[52px]">
                  <I.Clock className="w-[18px] h-[18px] text-sub shrink-0" />
                  <button onClick={() => search(h.keyword)} className="flex-1 text-left text-[14.5px] truncate">
                    {h.keyword}
                  </button>
                  <button onClick={() => removeHistory(h.id)} aria-label="삭제" className="text-[#b6bcc3]">
                    <I.Close className="w-[18px] h-[18px]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[16px]">추천 제품</h2>
            <Link href="/search" className="text-[13px] font-semibold text-brand flex items-center gap-0.5">
              전체 보기 <I.Chevron className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {(data?.recommended ?? []).slice(0, 3).map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="fl-card fl-card-tap p-2.5">
                <div className="h-[88px] flex items-center justify-center mb-2">
                  <ProductThumb url={p.image_url} name={p.name} className="w-full h-[84px]" />
                </div>
                <p className="text-[12.5px] font-semibold leading-[1.35] line-clamp-2 min-h-[34px]">{p.name}</p>
                <div className="mt-1">
                  <Stars rating={p.rating} count={p.rating_count} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="h-6" />
      </div>

      <BottomNav active="/" />
    </Screen>
  );
}
