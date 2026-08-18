"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, Button, ProductThumb, RISK, RiskChip, Screen, Spinner } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
import { api, type AnalysisResult } from "@/lib/api";

export default function AnalysisPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  };

  const runScan = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image_file", file);
      form.append("user_filter", '["LACTOSE","GENERAL"]');
      const r = await api.post<{ data: AnalysisResult }>("/api/v1/scan", form);
      setResult(r.data);
      if (r.data.product?.id && typeof window !== "undefined") {
        localStorage.setItem("fl_last_product", String(r.data.product.id));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.post<{ data: AnalysisResult }>("/api/v1/scan/text", {
        raw_text: text,
        user_filter: ["LACTOSE", "GENERAL"],
      });
      setResult(r.data);
      if (r.data.product?.id && typeof window !== "undefined") {
        localStorage.setItem("fl_last_product", String(r.data.product.id));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Screen>
        <AppHeader title="분석 결과" />
        <ScanResult result={result} />
        <ThreeTabNav active="/" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="라벨 촬영" />
      <div className="px-5 pt-5">
        <h1 className="text-[23px] font-extrabold leading-snug">
          라벨을 찍으면
          <br />유당 관련 성분부터 확인해드려요
        </h1>
        <p className="text-[14px] text-sub mt-2">제품의 원재료 라벨이 잘 보이도록 촬영해주세요.</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <button
          onClick={() => fileRef.current?.click()}
          className="mt-5 w-full rounded-3xl border-[1.5px] border-dashed border-brand/30 bg-mint-soft py-8 flex flex-col items-center gap-2.5"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="선택한 성분표" className="max-h-[240px] rounded-2xl object-contain" />
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-white border border-brand/15 flex items-center justify-center text-brand">
                <I.Camera className="w-8 h-8" />
              </div>
              <span className="text-[15px] font-bold text-brand">성분표 촬영하기</span>
              <span className="text-[12.5px] text-sub">또는 갤러리에서 사진 선택</span>
            </>
          )}
        </button>

        <div className="mt-3">
          <Button onClick={runScan} disabled={!file} loading={loading}>사진 분석하기</Button>
        </div>

        <details className="mt-4 fl-card p-4">
          <summary className="text-[14px] font-bold cursor-pointer">사진 없이 원재료 텍스트로 분석하기</summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="원유(국산), 정제수, 탈지분유, 농축유청단백(WPC)"
            className="mt-3 w-full rounded-xl border border-line p-3 text-[14px] resize-none"
          />
          <button onClick={runText} className="mt-2 w-full h-[44px] rounded-xl bg-mint text-brand font-bold text-[14px]">텍스트로 분석</button>
        </details>

        {error && <p className="mt-4 rounded-2xl bg-danger-bg text-danger text-[13.5px] p-4 leading-[1.55]">{error}</p>}
        {loading && (
          <div className="py-10 flex flex-col items-center gap-3 text-brand">
            <Spinner className="w-7 h-7" />
            <p className="text-[13.5px] text-sub">라벨을 읽고 있어요…</p>
          </div>
        )}
        <div className="h-6" />
      </div>
      <ThreeTabNav active="/" />
    </Screen>
  );
}

export function ScanResult({ result }: { result: AnalysisResult }) {
  const product = result.product;

  return (
    <div className="px-5 pt-5 pb-6 space-y-4">
      {product && (
        <section className="fl-card p-4 flex items-center gap-4">
          <ProductThumb url={product.image_url} name={product.name} className="w-[72px] h-[88px]" />
          <div className="min-w-0">
            <h2 className="text-[20px] font-extrabold leading-snug line-clamp-2">{product.name}</h2>
            <p className="text-[13.5px] text-sub mt-1">{product.maker_name}</p>
            {product.volume && <p className="text-[13.5px] text-sub">{product.volume}</p>}
          </div>
        </section>
      )}

      <section className={`rounded-3xl border p-5 ${result.has_warning ? "border-warn bg-warn-bg/35" : "border-brand/20 bg-safe-bg"}`}>
        <div className="flex items-start gap-3">
          {result.has_warning ? (
            <I.Alert className="w-9 h-9 text-warn shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center shrink-0"><I.Check className="w-5 h-5" /></div>
          )}
          <div>
            <h2 className={`text-[22px] font-extrabold ${result.has_warning ? "text-warn" : "text-brand"}`}>
              {result.has_warning ? "유당이 있을 수 있어요" : "유당 관련 주의 성분이 없어요"}
            </h2>
            <p className="mt-2 text-[14px] leading-[1.65] text-ink/85">
              {result.has_warning
                ? "유당이 남아 있을 가능성이 있는 원재료가 확인됐어요. 민감한 경우 섭취에 주의하세요."
                : "현재 라벨에서는 유당 관련 주의 성분이 확인되지 않았어요."}
            </p>
            <p className="mt-3 text-[12.5px] text-sub">주의 원료 {result.warning_count}개 · 전체 원료 {result.counts.total}개</p>
          </div>
        </div>
      </section>

      <section className="fl-card p-4">
        <h3 className="font-extrabold text-[19px] mb-2">주의가 필요한 원재료</h3>
        {result.first_card.length === 0 ? (
          <div className="py-6 text-center text-[13.5px] text-sub">주의가 필요한 원재료가 없어요.</div>
        ) : (
          <div className="divide-y divide-line">
            {result.first_card.map((c) => (
              <div key={c.ingredient_name} className="py-4 first:pt-2 last:pb-1 flex gap-3">
                <span className={`mt-1 w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${RISK[c.risk_level].dot}`}>
                  <span className="text-[14px] font-extrabold">!</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <b className="text-[16px]">{c.ingredient_name}</b>
                    <RiskChip level={c.risk_level} />
                  </div>
                  <p className="text-[13.5px] text-sub mt-1.5 leading-[1.6]">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {result.ai_comment && (
        <section className="rounded-2xl bg-mint-soft p-4">
          <p className="font-bold text-[14.5px] text-brand mb-1.5">AI 분석 코멘트</p>
          <p className="text-[13.5px] leading-[1.6] text-ink/80">{result.ai_comment}</p>
        </section>
      )}

      {product?.id && (
        <Link href={`/recommend/${product.id}`} className="block">
          <Button>대체 제품 추천받기</Button>
        </Link>
      )}
    </div>
  );
}
