"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, ProductThumb, RiskChip, Screen, Sheet, Spinner, Toast, useToast } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
import { api, type AnalysisResult, type Ingredient, type RiskLevel } from "@/lib/api";

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
  const warnings = data.first_card;
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

          <div className={`rounded-[22px] border px-4 py-5 ${data.has_warning ? "border-[#ff6200] bg-[#fffaf6]" : "border-brand/30 bg-safe-bg"}`}>
            <div className="flex items-start gap-3.5">
              {data.has_warning ? (
                <div className="w-10 h-10 rounded-full bg-[#ff5a00] text-white flex items-center justify-center shrink-0 text-[22px] font-bold">!</div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                  <I.Check className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h2 className={`text-[22px] font-extrabold leading-tight ${data.has_warning ? "text-[#f05a00]" : "text-brand"}`}>
                  {data.has_warning ? "유당이 있을 수 있어요" : "유당 관련 주의 성분이 없어요"}
                </h2>
                <p className="mt-3 text-[14px] leading-[1.7] text-ink/85">
                  {data.has_warning
                    ? `${firstWarningName}이 포함되어 유당이 남아 있을 가능성이 있어요. 민감한 경우 섭취에 주의하세요.`
                    : "현재 원재료에서는 유당 관련 주의 성분이 확인되지 않았어요."}
                </p>
                <p className="mt-4 text-[12.5px] text-sub">
                  주의 원료 {data.warning_count}개 · 전체 원료 {data.counts.total}개
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
                const isHigh = item.risk_level === "DANGER" || item.risk_level === "WARNING";
                const badgeText = isHigh ? "주의 필요" : "주의";
                const badgeClass = isHigh ? "bg-[#fff0f0] text-[#ff3434]" : "bg-[#fff3e8] text-[#ff6a00]";
                const iconClass = isHigh ? "bg-[#ff3f3f]" : "bg-[#ff6a00]";

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
                      <span className={`mt-0.5 w-7 h-7 rounded-full ${iconClass} text-white flex items-center justify-center shrink-0 font-extrabold`}>!</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <b className="text-[17px] leading-snug text-ink">{item.ingredient_name}</b>
                          <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>{badgeText}</span>
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
