"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, BottomNav, Button, InfoBox, RISK, RiskChip, Screen, Spinner } from "@/components/ui";
import { api, type AnalysisResult } from "@/lib/api";

/** 성분표 스캔 분석 (§13-6 ① POST /api/v1/scan) — FIRST CARD 재배치·하이라이트 데모 화면 */
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="성분표 분석" back={false} />

      <div className="px-5 pt-5">
        <h1 className="text-[22px] font-extrabold leading-snug">
          성분표를 찍으면
          <br />
          주의 성분부터 보여드려요
        </h1>
        <p className="text-[14px] text-sub mt-2">사진 속 원재료명을 읽어 위험도 순으로 다시 정렬해드려요.</p>

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
          className="mt-5 w-full rounded-2xl border-[1.5px] border-dashed border-line bg-[#fafbfc] py-8 flex flex-col items-center gap-2.5"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="선택한 성분표" className="max-h-[220px] rounded-xl object-contain" />
          ) : (
            <>
              <I.Camera className="w-10 h-10 text-brand/50" />
              <span className="text-[14px] font-semibold text-sub">성분표 사진 선택 / 촬영</span>
            </>
          )}
        </button>

        <div className="mt-3">
          <Button onClick={runScan} disabled={!file} loading={loading}>
            OCR 분석 시작
          </Button>
        </div>

        <details className="mt-4 fl-card p-4">
          <summary className="text-[14px] font-bold cursor-pointer">사진 없이 원재료 텍스트로 분석하기</summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="원유(국산), 정제수, 기타설탕, 탈지분유, 농축유청단백(WPC)"
            className="mt-3 w-full rounded-xl border border-line p-3 text-[14px] resize-none"
          />
          <button
            onClick={runText}
            className="mt-2 w-full h-[44px] rounded-xl bg-mint text-brand font-bold text-[14px]"
          >
            텍스트로 분석
          </button>
        </details>

        {error && (
          <p className="mt-4 rounded-2xl bg-danger-bg text-danger text-[13.5px] p-4 leading-[1.55]">{error}</p>
        )}

        {loading && (
          <div className="py-10 flex flex-col items-center gap-3 text-brand">
            <Spinner className="w-7 h-7" />
            <p className="text-[13.5px] text-sub">성분표를 읽고 있어요…</p>
          </div>
        )}

        {result && <ScanResult result={result} />}

        <div className="h-6" />
      </div>

      <BottomNav active="/analysis" />
    </Screen>
  );
}

export function ScanResult({ result }: { result: AnalysisResult }) {
  return (
    <div className="mt-6 space-y-3">
      {/* FIRST CARD — 최상단 재배치된 주의 성분 */}
      {result.has_warning ? (
        <section className="rounded-2xl border-[1.5px] border-danger/25 bg-danger-bg/40 p-4">
          <p className="flex items-center gap-2 font-extrabold text-[16px] text-danger mb-3">
            <I.Alert className="w-[22px] h-[22px]" /> 주의 성분 {result.warning_count}건을 찾았어요
          </p>
          <div className="space-y-2">
            {result.first_card.map((c) => (
              <div key={c.ingredient_name} className="rounded-xl bg-white p-3">
                <p className="flex items-center gap-2 flex-wrap">
                  <b className="text-[15px]">{c.ingredient_name}</b>
                  <RiskChip level={c.risk_level} />
                </p>
                <p className="text-[13px] text-sub mt-1 leading-[1.5]">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-safe-bg p-4 flex items-center gap-2.5">
          <I.Check className="w-6 h-6 text-brand" />
          <p className="font-bold text-[15px] text-brand">유당 관련 주의 성분이 발견되지 않았어요</p>
        </section>
      )}

      {/* 재구성된 원재료 리스트 */}
      <section className="fl-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[15px]">추출된 성분</h3>
          <span className="text-[12px] text-sub">주의 성분 우선 정렬</span>
        </div>
        <div className="rounded-xl border border-line divide-y divide-line">
          {result.all_ingredients.map((ing) => (
            <div key={ing.name} className="flex items-center gap-2.5 px-3.5 h-[52px]">
              <span className={`w-[14px] h-[14px] rounded-full shrink-0 ${RISK[ing.risk_level].dot}`} />
              <span className={`text-[14.5px] flex-1 truncate ${ing.is_highlight ? "font-bold" : ""}`}>{ing.name}</span>
              {ing.is_highlight && <RiskChip level={ing.risk_level} />}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-sub">종합 점수</span>
          <span className="text-[15px] font-extrabold text-brand">
            {result.score}
            <span className="text-[12px] text-sub">/100 · {result.score_label}</span>
          </span>
        </div>
      </section>

      {result.ai_comment && (
        <section className="rounded-2xl bg-mint-soft p-4">
          <p className="flex items-center gap-1.5 font-bold text-[14.5px] text-brand mb-1.5">
            <I.Bot className="w-[18px] h-[18px]" /> AI 코멘트
          </p>
          <p className="text-[13.5px] leading-[1.6] text-ink/80">{result.ai_comment}</p>
        </section>
      )}

      <InfoBox>성분표를 OCR로 분석했어요. 등록 요청을 하면 검증 후 제품 DB에 반영됩니다.</InfoBox>

      <Link href="/register" className="block">
        <Button variant="outline">이 제품 등록 요청하기</Button>
      </Link>
    </div>
  );
}
