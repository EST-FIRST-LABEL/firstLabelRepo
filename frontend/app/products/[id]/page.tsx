"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import {
  AppHeader,
  BottomNav,
  ProductThumb,
  RISK,
  RiskChip,
  Screen,
  Sheet,
  Spinner,
  Toast,
  useToast,
} from "@/components/ui";
import { api, type AnalysisResult, type Ingredient, type RiskLevel } from "@/lib/api";

export default function ProductAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [filter, setFilter] = useState<"ALL" | "SAFE" | "WARN" | "DANGER">("ALL");

  useEffect(() => {
    api
      .get<AnalysisResult>(`/api/v1/products/${id}/analysis`)
      .then((r) => {
        setData(r);
        localStorage.setItem("fl_last_product", String(id)); // 추천 탭 진입점에서 사용
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: data?.product?.name ?? "FIRST LABEL", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.show("링크를 복사했어요");
    }
  };

  if (error)
    return (
      <Screen nav={false}>
        <AppHeader title="분석 결과" />
        <div className="p-10 text-center text-sub">{error}</div>
      </Screen>
    );

  if (!data)
    return (
      <Screen>
        <AppHeader title="분석 결과" />
        <div className="py-24 flex justify-center text-brand">
          <Spinner className="w-7 h-7" />
        </div>
        <BottomNav active="/analysis" />
      </Screen>
    );

  const p = data.product!;
  // 시안의 요약 칩 4종. '주의'는 WARNING + CAUTION 을 합쳐서 센다.
  const summary = [
    { key: "ALL" as const, label: "전체", n: data.counts.total, cls: "bg-[#f4f5f7] text-sub" },
    { key: "SAFE" as const, label: "안심", n: data.counts.safe, cls: "bg-safe-bg text-brand" },
    {
      key: "WARN" as const,
      label: "주의",
      n: data.counts.warning + data.counts.caution,
      cls: "bg-warn-bg text-warn",
    },
    { key: "DANGER" as const, label: "주의 필요", n: data.counts.danger, cls: "bg-danger-bg text-danger" },
  ];
  const MATCH: Record<string, RiskLevel[]> = {
    SAFE: ["SAFE"],
    WARN: ["WARNING", "CAUTION"],
    DANGER: ["DANGER"],
  };
  const listed =
    filter === "ALL" ? data.all_ingredients : data.all_ingredients.filter((i) => MATCH[filter].includes(i.risk_level));

  return (
    <Screen>
      <AppHeader
        title="분석 결과"
        right={
          <button onClick={share} aria-label="공유하기" className="text-ink">
            <I.Share className="w-[22px] h-[22px]" />
          </button>
        }
      />

      <div className="px-5 pt-4 space-y-3">
        {/* 제품 + 종합 점수 */}
        <section className="fl-card p-4 flex items-center gap-3.5">
          <ProductThumb url={p.image_url} name={p.name} className="w-[54px] h-[64px]" />
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-[17px] leading-snug line-clamp-2">{p.name}</h2>
            <p className="text-[13px] text-sub mt-0.5">{p.maker_name}</p>
            <p className="text-[13px] text-sub">{p.volume}</p>
          </div>
          <div className="w-[76px] shrink-0 rounded-2xl bg-mint-soft py-2.5 text-center">
            <p className="text-[11px] text-sub">종합 점수</p>
            <p className="text-[26px] font-extrabold text-brand leading-tight">
              {data.score}
              <span className="text-[12px] text-sub font-bold">/100</span>
            </p>
            <p className="text-[12px] font-bold text-brand">{data.score_label}</p>
          </div>
        </section>

        {/* 원재료 분석 요약 */}
        <section className="fl-card p-4">
          <h3 className="font-bold text-[15px] mb-3">원재료 분석 요약</h3>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {summary.map((s) => (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className={`shrink-0 flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-2 rounded-full ${s.cls} ${
                  filter === s.key ? "ring-2 ring-brand/30" : ""
                }`}
              >
                {s.label} <span className="font-extrabold">{s.n}</span>
                <I.Chevron className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </section>

        {/* 주의가 필요한 원재료 */}
        <section className="fl-card p-4">
          <h3 className="font-bold text-[15px] mb-1">주의가 필요한 원재료</h3>
          {data.first_card.length === 0 ? (
            <p className="text-[13.5px] text-sub py-4">주의가 필요한 원재료가 발견되지 않았어요. 🌿</p>
          ) : (
            <div className="divide-y divide-line">
              {data.first_card.map((c) => (
                <button
                  key={c.ingredient_name}
                  onClick={() =>
                    setSelected({
                      name: c.ingredient_name,
                      risk_level: c.risk_level,
                      matched_keyword: c.matched_keyword,
                      description: c.description,
                      is_highlight: true,
                    })
                  }
                  className="w-full flex items-start gap-2.5 py-3.5 text-left"
                >
                  <I.Alert className={`w-[22px] h-[22px] shrink-0 mt-0.5 ${RISK[c.risk_level].text}`} />
                  <div className="flex-1 min-w-0">
                    <p className="flex items-center gap-2 flex-wrap">
                      <b className="text-[15px]">{c.ingredient_name}</b>
                      <RiskChip level={c.risk_level} />
                    </p>
                    <p className="text-[13px] text-sub mt-1 leading-[1.5] line-clamp-2">{c.description}</p>
                  </div>
                  <I.Chevron className="w-4 h-4 text-[#c3c9cf] shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}

          {/* 원재료 전체 목록 (재배치된 순서) */}
          <div className="mt-2 pt-4 border-t border-line">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-bold text-[15px]">원재료 전체 목록</h3>
              <button
                onClick={() => setFilter("ALL")}
                className="text-[12.5px] font-semibold text-brand flex items-center gap-0.5"
              >
                상세 보기 <I.Chevron className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {listed.map((ing) => (
                <button
                  key={ing.name}
                  onClick={() => setSelected(ing)}
                  className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full ${RISK[ing.risk_level].chip}`}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* AI 코멘트 */}
        {data.ai_comment && (
          <section className="rounded-2xl bg-mint-soft p-4">
            <p className="flex items-center gap-1.5 font-bold text-[14.5px] text-brand mb-1.5">
              <I.Bot className="w-[18px] h-[18px]" /> AI 코멘트
            </p>
            <p className="text-[13.5px] leading-[1.6] text-ink/80 whitespace-pre-line">{data.ai_comment}</p>
          </section>
        )}

        <div className="h-1" />
      </div>

      <IngredientSheet ingredient={selected} onClose={() => setSelected(null)} />
      <Toast message={toast.message} />
      <BottomNav active="/analysis" />
    </Screen>
  );
}

/* 성분 상세 설명 화면 (§2-3) */
function IngredientSheet({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const CRITERIA: Record<RiskLevel, string> = {
    DANGER: "유당이 직접 포함된 원료로 분류돼요.",
    WARNING: "유제품에서 유래했으며 유당이 남아 있을 수 있는 원료로 분류돼요.",
    CAUTION: "유당과 직접 관련은 낮지만 과다 섭취 시 주의가 필요한 원료예요.",
    SAFE: "유당 관련 주의 대상에 해당하지 않아요.",
  };

  return (
    <Sheet open={!!ingredient} onClose={onClose}>
      {ingredient && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[20px] font-extrabold">{ingredient.name}</h2>
            <RiskChip level={ingredient.risk_level} />
          </div>

          <Row title="이 성분은 무엇인가요?">
            {ingredient.description || "표기된 원재료명이에요. 유당 관련 주의 성분으로 분류되지 않았어요."}
          </Row>
          {ingredient.matched_keyword && (
            <Row title="왜 주의해야 하나요?">
              원재료명에서 <b className="text-ink">{ingredient.matched_keyword}</b> 키워드가 확인됐어요. 유당불내증이
              있다면 섭취 후 복통·설사·복부 팽만감이 나타날 수 있어요.
            </Row>
          )}
          <Row title="분류 기준">{CRITERIA[ingredient.risk_level]}</Row>

          <Link href="/register" className="block mt-2 text-[13px] text-brand font-semibold text-center underline">
            성분 정보가 잘못됐나요? 제보하기
          </Link>
        </>
      )}
    </Sheet>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[13px] font-bold text-brand mb-1">{title}</p>
      <p className="text-[14px] leading-[1.6] text-ink/80">{children}</p>
    </div>
  );
}
