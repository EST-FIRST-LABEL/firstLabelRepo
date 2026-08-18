"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { ProductThumb, Screen, Stars } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
import { api, type Product } from "@/lib/api";

type HomeData = { categories: { code: string; label: string; icon: string }[]; recommended: Product[] };
type Suggestion = { id: number; name: string; maker_name: string };

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
      <div className="px-5 pt-5">
        <div className="flex justify-center items-center gap-2 pt-1">
          <I.Logo className="w-7 h-7 text-brand" />
          <span className="font-extrabold tracking-[0.12em] text-brand text-[18px]">FIRST LABEL</span>
        </div>

        <section className="mt-7 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-white via-white to-mint-soft px-1 pb-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-[12.5px] font-semibold text-brand">
            <I.Logo className="w-4 h-4" /> 유당 걱정일 때, 라벨부터 확인하세요!
          </div>

          <div className="mt-5 pr-[126px] min-h-[180px] relative">
            <h1 className="text-[32px] font-extrabold leading-[1.32] tracking-[-0.035em] text-ink">
              이 제품, <span className="text-brand-light">유당</span>
              <br />괜찮을까요?
            </h1>
            <p className="mt-5 text-[14px] leading-[1.75] text-ink/85">
              제품을 검색하면 유당 관련 정보를
              <br />쉽게 확인할 수 있어요.
            </p>

            <div className="absolute right-0 top-2 w-[120px] h-[150px] flex items-center justify-center text-brand/60">
              <div className="w-[82px] h-[112px] rounded-[18px] border-2 border-brand/20 bg-white relative">
                <div className="absolute -top-4 left-3 right-3 h-5 rounded-t-md border-2 border-brand/20 bg-white" />
                <span className="absolute inset-x-0 top-12 text-center text-[19px] font-extrabold text-[#6daee8]">MILK</span>
              </div>
              <div className="absolute right-0 bottom-6 w-[58px] h-[58px] rounded-full border-[8px] border-ink/80 bg-white flex items-center justify-center">
                <I.Check className="w-7 h-7 text-brand-light" />
                <span className="absolute w-9 h-2 rounded-full bg-ink/80 rotate-45 -right-7 -bottom-3" />
              </div>
            </div>
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
              <button
                onClick={() => router.push("/analysis")}
                aria-label="라벨 촬영"
                className="w-10 h-10 rounded-xl border border-brand/25 bg-mint-soft flex items-center justify-center text-brand shrink-0"
              >
                <I.Camera className="w-5 h-5" />
              </button>
            </div>

            {showSuggestions && q.trim() && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-2 fl-card divide-y divide-line overflow-hidden">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => router.push(`/products/${p.id}`)}
                    className="w-full flex items-center gap-3 px-4 h-[52px] text-left active:bg-mint-soft"
                  >
                    <I.Search className="w-4 h-4 text-[#b6bcc3] shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-[14px]">{p.name}</span>
                    <span className="text-[12px] text-sub shrink-0">{p.maker_name}</span>
                  </button>
                ))}
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
