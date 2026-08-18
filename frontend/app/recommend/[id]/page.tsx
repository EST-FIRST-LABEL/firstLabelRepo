"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, ProductThumb, Screen, Spinner, Stars, Toast, useToast } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
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
  const [showReason, setShowReason] = useState(true);
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
        <ThreeTabNav active="/recommend" />
      </Screen>
    );

  const sections =
    tab === "similar"
      ? [{ title: "가장 추천하는 제품", items: data.similar, ranked: true }]
      : tab === "lactose_free"
        ? [{ title: "락토프리 추천", items: data.lactose_free, ranked: true }]
        : [{ title: "식물성 대체 추천", items: data.plant_based, ranked: true }];

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
        <div className="grid grid-cols-3 gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-[12.5px] font-bold px-2 py-3 rounded-full whitespace-nowrap ${
                tab === t.key ? "bg-brand text-white" : "bg-[#f4f5f7] text-sub"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-mint px-4 py-4 flex items-center justify-between mb-5">
          <p className="text-[15px] font-semibold leading-[1.55]">
            분석 결과를 기반으로
            <br />더 나은 제품을 추천드려요
          </p>
          <I.Logo className="w-8 h-8 text-brand/45 shrink-0" />
        </div>

        {sections.map((s) => (
          <section key={s.title} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-[18px]">{s.title}</h2>
              <button
                onClick={() => setShowReason((v) => !v)}
                className="text-[12.5px] font-semibold text-brand bg-mint px-2.5 py-1 rounded-full"
              >
                추천 이유 {showReason ? "숨기기" : "보기"}
              </button>
            </div>

            {s.items.length === 0 ? (
              <p className="text-[13.5px] text-sub py-4">조건에 맞는 제품이 아직 없어요.</p>
            ) : (
              <div className="space-y-3">
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
      <ThreeTabNav active="/recommend" />
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
    <Link href={`/products/${rec.id}`} className="block fl-card fl-card-tap p-4 active:bg-mint-soft">
      <div className="flex gap-3">
        {rank && (
          <span className="self-start w-9 h-9 rounded-lg bg-brand text-white text-[15px] font-extrabold flex items-center justify-center shrink-0">
            {rank}
          </span>
        )}
        <ProductThumb url={rec.image_url} name={rec.name} className="w-[58px] h-[72px]" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15.5px] leading-snug line-clamp-2">{rec.name}</p>
          <p className="text-[12.5px] text-sub mt-0.5">
            {rec.maker_name} {rec.volume && `| ${rec.volume}`}
          </p>
          <p className="mt-1.5 text-[14px] font-bold text-brand">유사도 {Math.round(rec.similarity * (rec.similarity <= 1 ? 100 : 1))}%</p>
          <div className="mt-1.5">
            <Stars rating={rec.rating} count={rec.rating_count} />
          </div>
        </div>
        <button onClick={toggle} aria-label="찜하기" className="self-start text-ink shrink-0">
          <I.Heart className="w-7 h-7" filled={wished} />
        </button>
      </div>

      {showReason && rec.reason && (
        <div className="mt-3 rounded-2xl border border-brand/15 bg-mint-soft p-3.5">
          <p className="text-[13px] font-bold text-brand mb-1.5">추천 이유</p>
          <p className="text-[12.8px] text-ink/80 leading-[1.6]">{rec.reason}</p>
        </div>
      )}
    </Link>
  );
}
