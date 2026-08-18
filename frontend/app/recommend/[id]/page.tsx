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

type TabKey = (typeof TABS)[number]["key"];

export default function RecommendPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<TabKey>("similar");
  const toast = useToast();

  useEffect(() => {
    api.get<Data>(`/api/v1/products/${id}/recommendations`).then(setData).catch(() => setData(null));
  }, [id]);

  if (!data) {
    return (
      <Screen>
        <AppHeader title="AI 추천 대체 제품" />
        <div className="py-24 flex justify-center text-brand">
          <Spinner className="w-7 h-7" />
        </div>
        <ThreeTabNav active="/recommend" />
      </Screen>
    );
  }

  const items = tab === "similar" ? data.similar : tab === "lactose_free" ? data.lactose_free : data.plant_based;
  const title = tab === "similar" ? "가장 추천하는 제품" : tab === "lactose_free" ? "락토프리 추천" : "식물성 대체 추천";

  return (
    <Screen>
      <AppHeader title="AI 추천 대체 제품" />

      <div className="px-5 pt-4">
        <div className="grid grid-cols-3 gap-2.5">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`h-12 rounded-full text-[13px] font-bold transition-colors ${
                tab === item.key ? "bg-[#09a24a] text-white shadow-sm" : "bg-[#f4f5f7] text-[#434a55]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="mt-6 pb-2">
          <div className="mb-4">
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{title}</h2>
          </div>

          {items.length === 0 ? (
            <div className="rounded-3xl border border-line bg-white px-5 py-12 text-center text-[14px] text-sub">
              조건에 맞는 추천 제품이 아직 없어요.
            </div>
          ) : (
            <div className="space-y-3.5">
              {items.map((rec, index) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  rank={index + 1}
                  highlighted={index === 0}
                  onWish={toast.show}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Toast message={toast.message} />
      <ThreeTabNav active="/recommend" />
    </Screen>
  );
}

function RecommendationCard({
  rec,
  rank,
  highlighted,
  onWish,
}: {
  rec: Rec;
  rank: number;
  highlighted: boolean;
  onWish: (message: string) => void;
}) {
  const router = useRouter();
  const [wished, setWished] = useState(rec.is_wished);
  const [expanded, setExpanded] = useState(highlighted);
  const similarity = Math.round(rec.similarity * (rec.similarity <= 1 ? 100 : 1));
  const reasonItems = buildReasonItems(rec);

  const toggleWish = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!auth.token) {
      router.push("/login");
      return;
    }

    setWished((value) => !value);
    try {
      const result = await api.post<{ is_wished: boolean }>(`/api/v1/products/${rec.id}/wishlist`);
      setWished(result.is_wished);
      onWish(result.is_wished ? "찜한 제품에 담았어요" : "찜을 해제했어요");
    } catch {
      setWished((value) => !value);
    }
  };

  const toggleReason = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((value) => !value);
  };

  return (
    <Link
      href={`/products/${rec.id}`}
      className={`relative block rounded-[22px] bg-white p-4 transition-colors active:bg-mint-soft ${
        highlighted
          ? "border-[1.5px] border-[#08a24b] shadow-[0_8px_24px_rgba(12,122,61,0.10)]"
          : "border border-[#edf0ee] shadow-[0_4px_14px_rgba(17,24,39,0.06)]"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-1 left-3 rounded-b-2xl rounded-t-md bg-[#09a24a] px-3.5 py-2 text-[12px] font-extrabold text-white">
          가장 추천해요
        </span>
      )}

      <div className={highlighted ? "pt-6" : ""}>
        <div className="flex items-start gap-3.5">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#08a24b] text-[18px] font-extrabold text-white">
            {rank}
          </span>

          <div className="flex h-[92px] w-[86px] shrink-0 items-center justify-center rounded-2xl border border-[#dcefe2] bg-[#fbfefc]">
            <ProductThumb url={rec.image_url} name={rec.name} className="w-[66px] h-[78px]" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[16px] font-extrabold leading-[1.35] text-ink">{rec.name}</p>
                <p className="mt-1 text-[13px] text-sub">
                  {rec.maker_name}
                  {rec.volume ? `  |  ${rec.volume}` : ""}
                </p>
              </div>

              <button
                onClick={toggleWish}
                aria-label={wished ? "찜 해제" : "찜하기"}
                className={`shrink-0 p-1 transition-colors ${wished ? "text-[#ff3b30]" : "text-[#7b8490]"}`}
              >
                <I.Heart className="w-7 h-7" filled={wished} />
              </button>
            </div>

            <p className="mt-2 text-[15px] font-extrabold text-[#059447]">유사도 {similarity}%</p>
            <div className="mt-1.5">
              <Stars rating={rec.rating} count={rec.rating_count} />
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 rounded-2xl border border-[#bfe7ca] bg-[#fbfffc] px-4 py-3.5">
            <p className="text-[14px] font-extrabold text-[#078f42]">추천 이유</p>
            <ul className="mt-2.5 space-y-2">
              {reasonItems.map((item) => (
                <li key={item} className="flex gap-2 text-[13.5px] leading-[1.55] text-ink/90">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0aa24b]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={`${expanded ? "mt-3" : highlighted ? "mt-4" : "mt-3 border-t border-line pt-3"}`}>
          <div className="flex items-start gap-2">
            <I.Logo className="mt-0.5 h-5 w-5 shrink-0 text-[#58c97a]" />
            <p className="flex-1 text-[13px] leading-[1.55] text-[#555f69]">{rec.reason || reasonItems[0]}</p>
          </div>

          {!highlighted && (
            <button
              onClick={toggleReason}
              className="mt-2 ml-7 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand"
            >
              {expanded ? "접기" : "왜 추천했나요?"}
              <span className={`text-[13px] transition-transform ${expanded ? "rotate-180" : ""}`}>⌄</span>
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

function buildReasonItems(rec: Rec) {
  const tags = rec.tags.filter(Boolean).slice(0, 3);
  if (tags.length >= 3) return tags.map((tag) => `${tag} 측면에서 대체용으로 적합해요`);

  const defaults = ["원재료 구성이 유사해요", "주의 성분이 상대적으로 적어요", "대체용으로 선택하기 좋아요"];
  return defaults.map((item, index) => (tags[index] ? `${tags[index]} 특성이 잘 맞아요` : item));
}
