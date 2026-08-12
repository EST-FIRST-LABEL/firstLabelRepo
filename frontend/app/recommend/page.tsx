"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, BottomNav, Button, ProductThumb, Screen, Spinner } from "@/components/ui";
import { api, type Product } from "@/lib/api";

/** 추천 탭 진입점: 최근 분석한 제품이 있으면 그 제품의 추천으로, 없으면 제품을 고르게 한다. */
export default function RecommendEntryPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    const last = typeof window !== "undefined" ? localStorage.getItem("fl_last_product") : null;
    if (last) {
      router.replace(`/recommend/${last}`);
      return;
    }
    api
      .get<{ recommended: Product[] }>("/api/v1/products/home")
      .then((r) => setItems(r.recommended))
      .catch(() => setItems([]));
  }, [router]);

  return (
    <Screen>
      <AppHeader title="AI 추천" back={false} />
      <div className="px-5 pt-5">
        <h1 className="text-[22px] font-extrabold leading-snug">
          어떤 제품의
          <br />
          대체 제품을 찾아드릴까요?
        </h1>
        <p className="text-[14px] text-sub mt-2">제품을 선택하면 유사·락토프리·식물성 대체 제품을 추천해드려요.</p>

        {items === null ? (
          <div className="py-20 flex justify-center text-brand">
            <Spinner className="w-7 h-7" />
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {items.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/recommend/${p.id}`)}
                className="w-full flex items-center gap-3 fl-card fl-card-tap p-3 text-left active:bg-mint-soft"
              >
                <ProductThumb url={p.image_url} name={p.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] leading-snug line-clamp-2">{p.name}</p>
                  <p className="text-[13px] text-sub mt-0.5">{p.maker_name}</p>
                </div>
                <I.Chevron className="w-4 h-4 text-[#c3c9cf]" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          <Button href="/search" variant="outline">
            제품 검색해서 찾기
          </Button>
        </div>
        <div className="h-6" />
      </div>
      <BottomNav active="/recommend" />
    </Screen>
  );
}
