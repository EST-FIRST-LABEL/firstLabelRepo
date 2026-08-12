"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, Button, Empty, ProductThumb, Screen, Spinner, Stars } from "@/components/ui";
import { api, type Product } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

export default function FavoritesPage() {
  useRequireAuth();
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    api
      .get<{ items: Product[] }>("/api/v1/users/me/favorites")
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  const unwish = async (id: number) => {
    setItems((prev) => prev?.filter((p) => p.id !== id) ?? null);
    await api.post(`/api/v1/products/${id}/wishlist`).catch(() => {});
  };

  return (
    <Screen nav={false}>
      <AppHeader title="찜한 제품" />

      <div className="px-6 pt-5">
        {items === null ? (
          <div className="py-16 flex justify-center text-brand">
            <Spinner className="w-6 h-6" />
          </div>
        ) : items.length === 0 ? (
          <Empty
            text={"아직 찜한 제품이 없어요.\n분석 결과에서 하트를 눌러 저장해보세요."}
            action={<Button href="/search">제품 둘러보기</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 fl-card p-3">
                <Link href={`/products/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <ProductThumb url={p.image_url} name={p.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] leading-snug line-clamp-2">{p.name}</p>
                    <p className="text-[13px] text-sub mt-0.5">{p.maker_name}</p>
                    <div className="mt-1">
                      <Stars rating={p.rating} count={p.rating_count} />
                    </div>
                  </div>
                </Link>
                <button onClick={() => unwish(p.id)} aria-label="찜 해제" className="text-danger p-1">
                  <I.Heart className="w-[22px] h-[22px]" filled />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="h-10" />
      </div>
    </Screen>
  );
}
