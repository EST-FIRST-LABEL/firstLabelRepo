"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, ProductThumb, RiskChip, Screen, Sheet, Spinner, Toast, useToast } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
import { api, type AnalysisResult, type Ingredient, type RiskLevel } from "@/lib/api";

const RISK_PRIORITY: Record<RiskLevel, number> = {
  DANGER: 0,
  WARNING: 1,
  CAUTION: 2,
  SAFE: 3,
};

const LACTOSE_CAUTION_KEYWORDS = new Set([
  "우유",
  "원유",
  "버터",
  "가공버터",
  "유크림",
  "가공유크림",
  "생크림",
  "치즈",
  "가공치즈",
]);

const RISK_CARD = {
  DANGER: {
    level: "3단계 · 고위험",
    title: "유당이 포함되어 있어요",
    description: "유당 성분이 직접적으로 포함되어 있어 유당불내증이 있다면 심한 복통과 소화 불량을 유발할 수 있어요.",
    border: "border-[#ff3f3f]",
    background: "bg-[#fff7f7]",
    accent: "bg-[#ff3f3f]",
    text: "text-[#e83232]",
    badge: "bg-[#fff0f0] text-[#e83232]",
    iconColor: "#ff2a2a",
  },
  WARNING: {
    level: "2단계 · 중위험",
    title: "잔존 유당이 있을 수 있어요",
    description: "우유 유래 단백질 및 부산물로, 잔존 유당이 포함되어 있을 수 있어 섭취 시 주의가 필요해요.",
    border: "border-[#ff9800]",
    background: "bg-[#fffaf3]",
    accent: "bg-[#ff8a00]",
    text: "text-[#e87900]",
    badge: "bg-[#fff3e8] text-[#e87900]",
    iconColor: "#ff7a00",
  },
  CAUTION: {
    level: "1단계 · 저위험 / 주의",
    title: "유제품 성분이 포함되어 있어요",
    description: "유제품 성분이 포함되어 있어 민감하신 분들은 복통이나 소화 불량을 겪을 수 있으니 참고하세요.",
    border: "border-[#74E954]",
    background: "bg-[#f7fff5]",
    accent: "bg-[#74E954]",
    text: "text-[#3eaa29]",
    badge: "bg-[#efffea] text-[#3eaa29]",
    iconColor: "#74E954",
  },
  SAFE: {
    level: "안심",
    title: "유당 관련 주의 성분이 없어요",
    description: "현재 원재료에서는 유당 관련 주의 성분이 확인되지 않았어요.",
    border: "border-brand/30",
    background: "bg-safe-bg",
    accent: "bg-brand",
    text: "text-brand",
    badge: "bg-mint text-brand",
    iconColor: "#38b46b",
  },
} as const;

export default function ProductAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ingredient | null>(null);

  useEffect(() => {
    api
      .get<AnalysisResult>(`/api/v1/products/${id}/analysis`)
      .then((r) => {
        setData(r);
        localStorage.setItem("fl_last_product", String(id));
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

  if (error) {
    return (
      <Screen nav={false}>
        <AppHeader title="분석 결과" />
        <div className="p-10 text-center text-sub">{error}</div>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <AppHeader title="분석 결과" />
        <div className="py-24 flex justify-center text-brand">
          <Spinner className="w-7 h-7" />
        </div>
        <ThreeTabNav active="/" />
      </Screen>
    );
  }

  const product = data.product;
  const highRiskWarnings = data.first_card;
  const levelOneWarnings = data.all_ingredients
    .filter(
      (item) =>
        item.risk_level === "CAUTION" &&
        !!item.matched_keyword &&
        LACTOSE_CAUTION_KEYWORDS.has(item.matched_keyword),
    )
    .map((item) => ({
      ingredient_name: item.name,
      risk_level: item.risk_level,
      matched_keyword: item.matched_keyword,
      description: item.description,
    }));

  const warnings = [...highRiskWarnings, ...levelOneWarnings].sort(
    (a, b) => RISK_PRIORITY[a.risk_level] - RISK_PRIORITY[b.risk_level],
  );
  const overallRisk: RiskLevel = warnings[0]?.risk_level ?? "SAFE";
  const riskCard = RISK_CARD[overallRisk];
  const firstWarningName = warnings[0]?.ingredient_name ?? "유당 관련 원재료";

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

      <div className="px-4 pt-4 pb-8 space-y-4">
        <section className="rounded-[24px] bg-white border border-line/70 shadow-[0_10px_30px_rgba(17,24,39,0.06)] p-4">
          {product && (
            <div className="flex items-center gap-4 px-1 pb-5">
              <div className="w-[72px] h-[88px] rounded-[18px] bg-[#f5fbf7] border border-brand/10 flex items-center justify-center shrink-0 overflow-hidden">
                <ProductThumb url={product.image_url} name={product.name} className="w-[56px] h-[72px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[20px] font-extrabold leading-snug line-clamp-2 text-ink">{product.name}</h2>
                <p className="text-[13.5px] text-sub mt-1">{product.maker_name}</p>
                {product.volume && <p className="text-[13.5px] text-sub mt-0.5">{product.volume}</p>}
              </div>
            </div>
          )}

          <div className={`rounded-[22px] border px-4 py-5 ${riskCard.border} ${riskCard.background}`}>
            <div className="flex items-start gap-3.5">
              {overallRisk === "SAFE" ? (
                <div className={`w-11 h-11 rounded-full ${riskCard.accent} text-white flex items-center justify-center shrink-0`}>
                  <I.Check className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                  <RiskRobotIcon color={riskCard.iconColor} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-bold ${riskCard.badge}`}>
                  {riskCard.level}
                </span>
                <h2 className={`mt-2 text-[22px] font-extrabold leading-tight ${riskCard.text}`}>
                  {riskCard.title}
                </h2>
                <p className="mt-3 text-[14px] leading-[1.7] text-ink/85">
                  {overallRisk === "SAFE" ? riskCard.description : `${firstWarningName}이 확인됐어요. ${riskCard.description}`}
                </p>
                <p className="mt-4 text-[12.5px] text-sub">
                  주의 원료 {warnings.length}개 · 전체 원료 {data.counts.total}개
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] bg-white border border-line/70 shadow-[0_10px_30px_rgba(17,24,39,0.06)] px-4 py-5">
          <h3 className="font-extrabold text-[20px] mb-2">주의가 필요한 원재료</h3>

          {warnings.length === 0 ? (
            <div className="py-8 text-center text-[13.5px] text-sub">주의가 필요한 원재료가 없어요.</div>
          ) : (
            <div className="divide-y divide-line/80">
              {warnings.map((item) => {
                const style = RISK_CARD[item.risk_level];
                const badgeText =
                  item.risk_level === "DANGER"
                    ? "3단계 · 고위험"
                    : item.risk_level === "WARNING"
                      ? "2단계 · 중위험"
                      : "1단계 · 주의";

                return (
                  <button
                    key={`${item.ingredient_name}-${item.matched_keyword ?? ""}`}
                    onClick={() =>
                      setSelected({
                        name: item.ingredient_name,
                        risk_level: item.risk_level,
                        matched_keyword: item.matched_keyword,
                        description: item.description,
                        is_highlight: true,
                      })
                    }
                    className="w-full py-4 first:pt-3 last:pb-1 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 w-7 h-7 rounded-full ${style.accent} text-white flex items-center justify-center shrink-0 font-extrabold`}>!</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <b className="text-[17px] leading-snug text-ink">{item.ingredient_name}</b>
                          <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${style.badge}`}>{badgeText}</span>
                        </div>
                        <p className="text-[13.5px] text-sub mt-2 leading-[1.65]">{item.description}</p>
                      </div>
                      <I.Chevron className="w-5 h-5 text-[#adb5bd] mt-1 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {product?.id && (
          <Link
            href={`/recommend/${product.id}`}
            className="block h-[50px] rounded-2xl border border-brand text-brand font-bold text-[14px] flex items-center justify-center active:bg-mint-soft"
          >
            대체 제품 추천받기
          </Link>
        )}
      </div>

      <IngredientSheet ingredient={selected} onClose={() => setSelected(null)} />
      <Toast message={toast.message} />
      <ThreeTabNav active="/" />
    </Screen>
  );
}

function RiskRobotIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" className="w-12 h-12">
      <line x1="36" y1="7" x2="36" y2="14" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="36" cy="6" r="4" fill={color} />
      <circle cx="10" cy="34" r="6" fill={color} />
      <circle cx="62" cy="34" r="6" fill={color} />
      <rect x="14" y="15" width="44" height="38" rx="16" fill="white" stroke={color} strokeWidth="4" />
      <rect x="20" y="23" width="32" height="20" rx="10" fill="#2f2f2f" />
      <circle cx="29" cy="33" r="3.2" fill="white" />
      <circle cx="43" cy="33" r="3.2" fill="white" />
      <path d="M33 39c2 1.6 4 1.6 6 0" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="20" y="50" width="32" height="15" rx="7.5" fill={color} />
      <text x="36" y="61" textAnchor="middle" fontSize="11" fontWeight="800" fill="white">AI</text>
    </svg>
  );
}

function IngredientSheet({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const CRITERIA: Record<RiskLevel, string> = {
    DANGER: "3단계(고위험): 유당 성분이 직접적으로 포함된 원료예요.",
    WARNING: "2단계(중위험): 우유 유래 단백질 또는 부산물로 잔존 유당이 포함될 수 있어요.",
    CAUTION: "1단계(저위험/주의): 유제품 성분으로 민감한 경우 복통이나 소화 불량이 나타날 수 있어요.",
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
