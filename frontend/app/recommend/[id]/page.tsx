"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, BottomNav, ProductThumb, Screen, Spinner, Stars, Toast, useToast } from "@/components/ui";
import { api, auth, type Product } from "@/lib/api";

type Rec = Product & { similarity: number; tags: string[]; reason: string };
type Data = { base_product: Product; similar: Rec[]; lactose_free: Rec[]; plant_based: Rec[] };

const TABS = [
  { key: "similar", label: "유사 제품 추천" },
  { key: "lactose_free", label: "락토프리 제품" },
  { key: "plant_based", label: "식물성 대체 제품" },
] as const;

export default function RecommendPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("similar");
  const [showReason, setShowReason] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get<Data>(`/api/v1/products/${id}/recommendations`).then(setData).catch(() => setData(null));
  }, [id]);

  if (!data)
    return (
      <Screen>
        <AppHeader title="AI 추천 대체 제품" />
        <div className="py-24 flex justify-center text-brand">
          <Spinner className="w-7 h-7" />
        </div>
        <BottomNav active="/recommend" />
      </Screen>
    );

  const sections =
    tab === "similar"
      ? [
          { title: "가장 유사한 제품", items: data.similar, ranked: true, more: false },
          { title: "락토프리 추천", items: data.lactose_free.slice(0, 1), ranked: false, more: "lactose_free" },
          { title: "식물성 대체 추천", items: data.plant_based.slice(0, 1), ranked: false, more: "plant_based" },
        ]
      : tab === "lactose_free"
        ? [{ title: "락토프리 추천", items: data.lactose_free, ranked: true, more: false }]
        : [{ title: "식물성 대체 추천", items: data.plant_based, ranked: true, more: false }];

  return (
    <Screen>
      <AppHeader
        title="AI 추천 대체 제품"
        right={
          <button onClick={() => setShowReason((v) => !v)} aria-label="추천 이유">
            <I.Sliders className="w-[22px] h-[22px]" />
          </button>
        }
      />

      <div className="px-5 pt-4">
        <div className="flex gap-1.5 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-[13px] font-bold px-3.5 py-2.5 rounded-full whitespace-nowrap ${
                tab === t.key ? "bg-brand text-white" : "bg-[#f4f5f7] text-sub"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-mint px-4 py-3.5 flex items-center justify-between mb-5">
          <p className="text-[14px] font-semibold leading-[1.5]">
            분석 결과를 기반으로
            <br />
            더 나은 제품을 추천드려요
          </p>
          <I.Logo className="w-7 h-7 text-brand/40 shrink-0" />
        </div>

        {sections.map((s) => (
          <section key={s.title} className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="font-bold text-[16px]">{s.title}</h2>
              {s.more ? (
                <button
                  onClick={() => setTab(s.more as (typeof TABS)[number]["key"])}
                  className="text-[12.5px] font-semibold text-brand flex items-center gap-0.5"
                >
                  더보기 <I.Chevron className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => setShowReason((v) => !v)}
                  className="text-[12.5px] font-semibold text-brand bg-mint px-2.5 py-1 rounded-full"
                >
                  추천 이유
                </button>
              )}
            </div>
            {s.items.length === 0 ? (
              <p className="text-[13.5px] text-sub py-4">조건에 맞는 제품이 아직 없어요.</p>
            ) : (
              <div className="space-y-2.5">
                {s.items.map((r, idx) => (
                  <RecCard
                    key={r.id}
                    rec={r}
                    rank={s.ranked ? idx + 1 : undefined}
                    showReason={showReason}
                    onWish={toast.show}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
        <div className="h-2" />
      </div>

      <Toast message={toast.message} />
      <BottomNav active="/recommend" />
    </Screen>
  );
}

function RecCard({
  rec,
  rank,
  showReason,
  onWish,
}: {
  rec: Rec;
  rank?: number;
  showReason: boolean;
  onWish: (m: string) => void;
}) {
  const router = useRouter();
  const [wished, setWished] = useState(rec.is_wished);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!auth.token) return router.push("/login");
    setWished((v) => !v);
    try {
      const r = await api.post<{ is_wished: boolean }>(`/api/v1/products/${rec.id}/wishlist`);
      setWished(r.is_wished);
      onWish(r.is_wished ? "찜한 제품에 담았어요" : "찜을 해제했어요");
    } catch {
      setWished((v) => !v);
    }
  };

  return (
    <Link href={`/products/${rec.id}`} className="block fl-card fl-card-tap p-3 active:bg-mint-soft">
      <div className="flex gap-3">
        {rank && (
          <span className="self-start flex items-center gap-1 bg-brand text-white text-[11.5px] font-bold px-2 py-1 rounded-lg">
            👍 {rank}
          </span>
        )}
        <ProductThumb url={rec.image_url} name={rec.name} className="w-[46px] h-[58px]" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14.5px] leading-snug line-clamp-2">{rec.name}</p>
          <p className="text-[12.5px] text-sub mt-0.5">
            {rec.maker_name} {rec.volume && `| ${rec.volume}`}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {rec.tags.map((t) => (
              <span key={t} className="text-[11.5px] font-bold px-2 py-1 rounded-md bg-mint text-brand">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-1.5">
            <Stars rating={rec.rating} count={rec.rating_count} />
          </div>
        </div>
        <button
          onClick={toggle}
          aria-label="찜하기"
          className={`self-center w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
            wished ? "bg-brand border-brand text-white" : "border-brand text-brand"
          }`}
        >
          <I.Plus className="w-4 h-4" />
        </button>
      </div>
      {showReason && rec.reason && (
        <p className="mt-2.5 pt-2.5 border-t border-line text-[12.5px] text-sub leading-[1.55]">💡 {rec.reason}</p>
      )}
    </Link>
  );
}
