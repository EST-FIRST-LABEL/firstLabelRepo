"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import * as I from "@/components/icons";
import {
  AppHeader,
  BottomNav,
  Button,
  Field,
  InfoBox,
  Input,
  RISK,
  Screen,
  Spinner,
  StepBadge,
  SuccessMark,
} from "@/components/ui";
import { api, auth, type AnalysisResult } from "@/lib/api";

/** 미등록 제품 등록 플로우 3-1 → 3-5 (§3). 사진 File 객체를 유지해야 해서 한 화면에서 단계로 진행한다. */
export default function RegisterFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [manualText, setManualText] = useState("");

  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [agree, setAgree] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runOcr = async () => {
    if (!back) return setError("성분표(뒷면) 사진을 올려주세요.");
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image_file", back);
      form.append("user_filter", '["LACTOSE","GENERAL"]');
      const r = await api.post<{ data: AnalysisResult }>("/api/v1/scan", form);
      setResult(r.data);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
      setStep(3); // 실패해도 3-3으로 이동해 직접 입력으로 이어갈 수 있게 한다
    } finally {
      setLoading(false);
    }
  };

  const runManual = async () => {
    if (!manualText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.post<{ data: AnalysisResult }>("/api/v1/scan/text", {
        raw_text: manualText,
        user_filter: ["LACTOSE", "GENERAL"],
      });
      setResult(r.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!auth.token) return router.push("/login");
    if (!productName.trim()) return setError("제품명을 입력해주세요.");
    if (!agree) return setError("제품 정보 제공 및 DB 등록에 동의해주세요.");
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("product_name", productName);
      form.append("brand", brand);
      form.append("category", category);
      form.append("reason", reason);
      form.append("ocr_text", result?.raw_text ?? manualText);
      if (front) form.append("front_image", front);
      if (back) form.append("back_image", back);
      await api.post("/api/v1/registrations", form);
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      {step === 1 && <Step1 onNext={() => setStep(2)} />}
      {step === 2 && (
        <Step2
          front={front}
          back={back}
          setFront={setFront}
          setBack={setBack}
          onNext={runOcr}
          loading={loading}
          error={error}
        />
      )}
      {step === 3 && (
        <Step3
          result={result}
          error={error}
          manualText={manualText}
          setManualText={setManualText}
          onManual={runManual}
          loading={loading}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <Step4
          {...{ productName, setProductName, brand, setBrand, category, setCategory, reason, setReason, agree, setAgree }}
          onSubmit={submit}
          loading={loading}
          error={error}
        />
      )}
      {step === 5 && <Step5 />}
      <BottomNav active="/" />
    </Screen>
  );
}

/* ---------- 3-1. 미등록 상품 안내 ---------- */
function Step1({ onNext }: { onNext: () => void }) {
  return (
    <>
      <header className="px-5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <I.Logo className="w-6 h-6 text-brand" />
          <span className="font-extrabold tracking-[0.06em] text-brand text-[16px]">FIRST LABEL</span>
        </div>
        <I.Bell className="w-6 h-6 text-ink" />
      </header>
      <StepBadge>3-1. 미등록 상품 안내</StepBadge>

      <div className="px-7 pt-8 text-center">
        <I.UnknownProduct className="w-[168px] h-[168px] mx-auto" />

        <h1 className="mt-8 text-[25px] font-extrabold leading-[1.35]">
          아직 등록되지 않은
          <br />
          상품이에요
        </h1>
        <p className="mt-3 text-[15px] text-sub leading-[1.5]">
          제품 사진을 업로드하면
          <br />
          분석할 수 있어요.
        </p>

        <div className="mt-8">
          <Button onClick={onNext}>
            <I.Camera className="w-5 h-5" /> 사진 업로드 시작
          </Button>
        </div>

        <div className="mt-6 rounded-2xl bg-[#fafbfc] p-4 text-left flex gap-2.5">
          <I.Shield className="w-[18px] h-[18px] text-brand shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[13.5px] text-brand">안심하고 이용하세요</p>
            <p className="text-[13px] text-sub mt-1 leading-[1.5]">
              등록되는 정보는 제품 분석을 위한 용도로만 사용되며 안전하게 보호됩니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 3-2. 제품사진 업로드 ---------- */
function Step2({
  front,
  back,
  setFront,
  setBack,
  onNext,
  loading,
  error,
}: {
  front: File | null;
  back: File | null;
  setFront: (f: File) => void;
  setBack: (f: File) => void;
  onNext: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <>
      <AppHeader logo right={<I.Help className="w-[22px] h-[22px]" />} />
      <StepBadge>3-2. 제품사진 업로드</StepBadge>

      <div className="px-6 pt-5">
        <Uploader label="제품명 (앞면)" file={front} onPick={setFront} />
        <Uploader label="성분표 (뒷면)" file={back} onPick={setBack} />

        <p className="text-center text-[13.5px] text-sub leading-[1.5] mt-5 mb-4">
          정확한 분석을 위해 선명한 사진을
          <br />
          올려주세요.
        </p>

        <Button onClick={onNext} loading={loading} disabled={!back}>
          OCR 분석 시작
        </Button>
        {error && <p className="mt-3 text-[13.5px] text-danger">{error}</p>}

        <div className="mt-4">
          <InfoBox>업로드하신 앞면과 뒷면 사진은 성분 분석을 위해 사용되며, 안전하게 보호됩니다.</InfoBox>
        </div>
        <div className="h-6" />
      </div>
    </>
  );
}

function Uploader({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const url = file ? URL.createObjectURL(file) : null;
  return (
    <div className="mb-6">
      <p className="font-bold text-[15px] mb-2.5">{label}</p>
      <div className="relative">
        <button
          onClick={() => ref.current?.click()}
          className="w-full h-[150px] rounded-2xl border-[1.5px] border-dashed border-[#dee2e6] bg-white flex items-center justify-center overflow-hidden"
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="w-full h-full object-cover" />
          ) : (
            <I.Image className="w-16 h-16 text-[#dee2e6]" />
          )}
        </button>
        <button
          onClick={() => ref.current?.click()}
          aria-label={`${label} 추가`}
          className="absolute -right-1 bottom-4 w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-lg"
        >
          <I.Plus className="w-6 h-6" />
        </button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
        />
      </div>
    </div>
  );
}

/* ---------- 3-3. OCR 분석 결과 ---------- */
function Step3({
  result,
  error,
  manualText,
  setManualText,
  onManual,
  loading,
  onNext,
}: {
  result: AnalysisResult | null;
  error: string;
  manualText: string;
  setManualText: (v: string) => void;
  onManual: () => void;
  loading: boolean;
  onNext: () => void;
}) {
  return (
    <>
      <AppHeader logo right={<I.Sliders className="w-[22px] h-[22px]" />} />
      <StepBadge>3-3. OCR 분석 결과</StepBadge>

      <div className="px-6 pt-4">
        {!result && (
          <div className="rounded-2xl bg-danger-bg p-4 mb-4">
            <p className="font-bold text-[14.5px] text-danger mb-1">사진에서 성분을 읽지 못했어요</p>
            <p className="text-[13px] text-sub leading-[1.55]">{error || "다시 촬영하거나 아래에 직접 입력해주세요."}</p>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={3}
              placeholder="원유(국산), 정제수, 기타설탕, 탈지분유, 농축유청단백(WPC)"
              className="mt-3 w-full rounded-xl border border-line bg-white p-3 text-[13.5px] resize-none"
            />
            <button onClick={onManual} className="mt-2 w-full h-[44px] rounded-xl bg-brand text-white font-bold text-[14px]">
              {loading ? <Spinner /> : "직접 입력한 성분으로 분석"}
            </button>
          </div>
        )}

        {result && (
          <>
            <section className="fl-card p-4">
              <h3 className="font-bold text-[16px] mb-3">추출된 성분</h3>
              <div className="rounded-xl border border-line divide-y divide-line">
                {result.all_ingredients.map((ing) => (
                  <div key={ing.name} className="flex items-center gap-3 px-4 h-[56px]">
                    <span className={`w-[14px] h-[14px] rounded-full shrink-0 ${RISK[ing.risk_level].dot}`} />
                    <span className="text-[15px] font-semibold flex-1 truncate">{ing.name}</span>
                  </div>
                ))}
              </div>
            </section>

            {result.has_warning ? (
              <section className="mt-4 rounded-2xl bg-danger-bg p-5 flex gap-3">
                <I.Alert className="w-8 h-8 text-danger shrink-0" />
                <div>
                  <p className="font-extrabold text-[17px] text-danger">유당 관련 원료 확인!</p>
                  <p className="text-[13.5px] text-sub mt-1.5 leading-[1.55]">
                    위 성분에 유당 관련 원료가 포함되어 있을 수 있어요.
                  </p>
                </div>
              </section>
            ) : (
              <section className="mt-4 rounded-2xl bg-safe-bg p-5 flex gap-3 items-center">
                <I.Check className="w-7 h-7 text-brand shrink-0" />
                <p className="font-extrabold text-[16px] text-brand">유당 관련 주의 원료가 없어요</p>
              </section>
            )}

            <p className="text-center text-[13.5px] text-sub mt-5 mb-4">성분표를 OCR로 분석했어요.</p>
          </>
        )}

        <Button onClick={onNext} disabled={!result}>
          등록 요청으로 이동
        </Button>

        <div className="mt-4">
          <InfoBox>분석 결과는 최종 등록 전에 언제든지 확인할 수 있어요.</InfoBox>
        </div>
        <div className="h-6" />
      </div>
    </>
  );
}

/* ---------- 3-4. 제품 등록 요청 ---------- */
function Step4({
  productName,
  setProductName,
  brand,
  setBrand,
  category,
  setCategory,
  reason,
  setReason,
  agree,
  setAgree,
  onSubmit,
  loading,
  error,
}: {
  productName: string;
  setProductName: (v: string) => void;
  brand: string;
  setBrand: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <>
      <AppHeader logo />
      <StepBadge>3-4. 제품 등록 요청</StepBadge>

      <div className="px-6 pt-5">
        <Field label="제품명">
          <Input value={productName} onChange={setProductName} placeholder="예) 초코 드링크" maxLength={60} />
        </Field>
        <Field label="브랜드 / 제조사">
          <Input value={brand} onChange={setBrand} placeholder="예) FirstLabel" maxLength={40} />
        </Field>
        <Field label="카테고리" hint="예) 음료 > 초코/코코아">
          <Input value={category} onChange={setCategory} placeholder="예) 음료" maxLength={40} />
        </Field>
        <Field label="요청 사유 (선택)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="성분 정보를 확인하고 분석 요청드립니다."
            className="w-full rounded-xl border border-line p-3.5 text-[15px] resize-none"
          />
        </Field>

        <button onClick={() => setAgree(!agree)} className="flex items-start gap-2.5 text-left mb-5">
          <span
            className={`w-5 h-5 rounded-[6px] shrink-0 mt-0.5 flex items-center justify-center ${
              agree ? "bg-brand text-white" : "border border-[#cfd4d9]"
            }`}
          >
            {agree && <I.Check className="w-3.5 h-3.5" />}
          </span>
          <span className="text-[13.5px] text-sub leading-[1.5]">
            제품 정보 제공 및 DB 등록에 동의합니다. 등록된 제품 정보는 다른 사용자에게도 공개돼요.
          </span>
        </button>

        <Button onClick={onSubmit} loading={loading} disabled={!productName.trim() || !agree}>
          등록 요청하기
        </Button>
        {error && <p className="mt-3 text-[13.5px] text-danger">{error}</p>}

        <div className="mt-4">
          <InfoBox>등록 요청 시 제품명으로 대표 이미지를 자동 검색해요. 찾지 못하면 올려주신 사진을 사용합니다.</InfoBox>
        </div>
        <div className="h-6" />
      </div>
    </>
  );
}

/* ---------- 3-5. 등록 완료 ---------- */
function Step5() {
  return (
    <>
      <AppHeader logo right={<Link href="/" aria-label="홈"><I.Home className="w-[22px] h-[22px]" /></Link>} />
      <StepBadge>3-5. 등록 완료</StepBadge>

      <div className="px-6 pt-6 text-center">
        <SuccessMark />

        <h1 className="mt-4 text-[26px] font-extrabold leading-[1.35]">
          등록 요청이
          <br />
          완료되었어요!
        </h1>
        <p className="mt-2.5 text-[14.5px] text-sub">참여해주셔서 감사합니다 😀</p>

        <div className="mt-6 rounded-2xl bg-mint-soft border border-safe/25 py-5 px-4">
          <p className="text-[17px] font-extrabold text-brand leading-[1.45]">
            검증 후 제품 DB에
            <br />
            반영될 예정입니다.
          </p>
        </div>

        <div className="mt-4 fl-card p-4 flex gap-3 text-left">
          <span className="w-9 h-9 rounded-full bg-mint flex items-center justify-center text-brand shrink-0">
            <I.Bell className="w-[18px] h-[18px]" />
          </span>
          <div>
            <p className="font-bold text-[14.5px]">검토는 통상 3~5 영업일 소요돼요</p>
            <p className="text-[13px] text-sub mt-1 leading-[1.55]">
              검토가 완료되면 앱 알림과 이메일로 결과를 안내드릴게요. 잠시만 기다려주세요!
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button href="/">홈으로 이동</Button>
        </div>
        <div className="h-6" />
      </div>
    </>
  );
}
