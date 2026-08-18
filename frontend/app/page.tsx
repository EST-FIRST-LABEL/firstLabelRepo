"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { ProductThumb, Screen, Stars } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
import { api, type Product } from "@/lib/api";

type HomeData = { categories: { code: string; label: string; icon: string }[]; recommended: Product[] };
type Suggestion = {
  id: number;
  name: string;
  maker_name: string;
  image_url: string;
  is_lactose_free: boolean;
};

export default function HomePage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<HomeData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    api.get<HomeData>("/api/v1/products/home").then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    const keyword = q.trim();
    if (!keyword) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get<{ items: Suggestion[] }>(`/api/v1/products/autocomplete?q=${encodeURIComponent(keyword)}&limit=3`)
        .then((r) => {
          if (!cancelled) setSuggestions(r.items);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const search = (keyword: string) => {
    const value = keyword.trim();
    if (!value) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <Screen>
      <div className="px-5 pt-3">
        <div className="flex justify-center py-1">
          <img
            src="/first-label-logo-tight.png"
            alt="FIRST LABEL"
            className="block w-[250px] h-[58px] object-contain"
          />
        </div>

        <section className="mt-4 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-white to-mint-soft px-1 pb-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-[12.5px] font-semibold text-brand">
            <I.Logo className="w-4 h-4" /> 유당 걱정일 때, 라벨부터 확인하세요!
          </div>

          <div className="mt-5 pr-[126px] min-h-[180px] relative">
            <h1 className="text-[32px] font-extrabold leading-[1.32] tracking-[-0.035em] text-ink">
              복잡한 정보에,
              <br />명확한 <span className="text-brand-light">기준을</span>
            </h1>
            <p className="mt-5 text-[14px] leading-[1.75] text-ink/85">
              제품을 검색하면 유당 관련 정보를
              <br />쉽게 확인할 수 있어요.
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/milk-hero.webp"
              alt="유당 확인 일러스트"
              className="absolute right-0 top-1 w-[132px] h-auto object-contain"
            />
          </div>
        </section>

        <section className="mt-4">
          <div className="relative">
            <div className="h-[62px] rounded-2xl bg-white border border-line shadow-[0_8px_24px_rgba(17,24,39,0.08)] flex items-center px-4 gap-3">
              <I.Search className="w-6 h-6 text-sub shrink-0" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => e.key === "Enter" && search(q)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                placeholder="궁금한 제품을 검색해보세요"
                className="flex-1 min-w-0 bg-transparent text-[15px] placeholder:text-[#9299a4]"
              />
            </div>

            {showSuggestions && q.trim() && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-2 fl-card overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 pt-2.5 pb-2">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-brand whitespace-nowrap truncate min-w-0">
                    <span className="text-brand-light shrink-0">✦</span> AI가 검색 의도와 가까운 상품을 찾았어요.
                  </span>
                  <span className="text-[10.5px] text-sub shrink-0 whitespace-nowrap">바로 확인해보세요.</span>
                </div>
                <div className="px-2 pb-2 space-y-1.5">
                  {suggestions.map((p, idx) => (
                    <button
                      key={p.id}
                      onMouseDown={() => router.push(`/products/${p.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left active:bg-mint-soft ${
                        idx === 0 ? "border border-brand bg-mint-soft" : ""
                      }`}
                    >
                      <ProductThumb url={p.image_url} name={p.name} className="w-12 h-12" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] leading-snug truncate">{p.name}</p>
                        <span
                          className={`mt-1 inline-block text-[11.5px] font-semibold px-2 py-0.5 rounded-full ${
                            p.is_lactose_free ? "bg-safe-bg text-brand" : "bg-[#eef1f4] text-sub"
                          }`}
                        >
                          {p.is_lactose_free ? "유당 걱정 없음" : "주의 필요"}
                        </span>
                      </div>
                      <I.Chevron className="w-4 h-4 text-[#c3c9cf] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 px-2 text-[13.5px] text-ink/75">찾는 제품이 없다면, 라벨을 찍어 바로 확인해보세요.</p>
          <Link
            href="/analysis"
            className="mt-3 h-[52px] rounded-2xl border border-brand flex items-center justify-center gap-2 text-brand font-bold text-[15px] active:bg-mint-soft relative"
          >
            <I.Camera className="w-5 h-5" />
            라벨 촬영하기
            <I.Chevron className="w-4 h-4 absolute right-4" />
          </Link>
        </section>

        <section className="mt-6 fl-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-[18px]">지금 많이 확인하는 제품</h2>
            <Link href="/search" className="text-[13px] font-bold text-brand flex items-center gap-0.5">
              더보기 <I.Chevron className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {(data?.recommended ?? []).slice(0, 3).map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="min-w-0">
                <div className="h-[102px] flex items-center justify-center rounded-2xl bg-[#fbfcfb] border border-line/70 px-2">
                  <ProductThumb url={p.image_url} name={p.name} className="w-full h-[86px]" />
                </div>
                <div className="mt-2 min-h-[38px]">
                  <p className="text-[12.5px] leading-[1.45] font-semibold line-clamp-2">{p.name}</p>
                </div>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <Stars rating={p.rating} count={0} />
                  <span className={`text-[10.5px] font-bold px-2 py-1 rounded-full ${p.is_lactose_free ? "bg-safe-bg text-brand" : "bg-warn-bg text-warn"}`}>
                    {p.is_lactose_free ? "안심" : "확인"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="h-7" />
      </div>

      <ThreeTabNav active="/" />
    </Screen>
  );
}
