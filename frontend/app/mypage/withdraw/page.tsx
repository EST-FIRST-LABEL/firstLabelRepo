"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, Button, Field, Input, Modal, Screen } from "@/components/ui";
import { api, auth } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

/** §8 회원 탈퇴 상세 플로우: 안내 → 재인증 → 사유(선택) → 최종 확인 → 완료 */
const REASONS = [
  "찾는 제품이 없어요",
  "분석 결과가 정확하지 않아요",
  "사용 빈도가 낮아요",
  "다른 서비스를 사용해요",
  "기타",
];

const DELETED = ["찜한 제품", "검색 이력", "저장한 필터", "문의 내역"];

export default function WithdrawPage() {
  const router = useRouter();
  useRequireAuth();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await api.del("/api/v1/users/me", { password, reason });
      setConfirmOpen(false);
      setStep(4);
      setTimeout(() => {
        auth.clear();
        router.replace("/login");
      }, 2200);
    } catch (e) {
      setError((e as Error).message);
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (step === 4)
    return (
      <Screen nav={false}>
        <div className="px-8 pt-32 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#f1f3f5] flex items-center justify-center text-sub animate-pop">
            <I.Check className="w-10 h-10" />
          </div>
          <h1 className="mt-6 text-[22px] font-extrabold">탈퇴가 완료되었습니다</h1>
          <p className="mt-2.5 text-[14px] text-sub leading-[1.6]">
            그동안 First Label을 이용해주셔서 감사합니다.
            <br />
            잠시 후 첫 화면으로 이동해요.
          </p>
        </div>
      </Screen>
    );

  return (
    <Screen nav={false}>
      <AppHeader title="회원 탈퇴" />

      <div className="px-6 pt-6">
        {step === 1 && (
          <>
            <h1 className="text-[21px] font-extrabold leading-snug">
              탈퇴하기 전에
              <br />
              꼭 확인해주세요
            </h1>
            <div className="mt-5 rounded-2xl bg-danger-bg p-4">
              <p className="font-bold text-[14.5px] text-danger mb-2">아래 정보는 삭제되어 복구할 수 없어요</p>
              <ul className="text-[13.5px] text-sub space-y-1.5">
                {DELETED.map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-2xl bg-mint-soft p-4">
              <p className="font-bold text-[14.5px] text-brand mb-2">서비스에 남는 정보</p>
              <p className="text-[13.5px] text-sub leading-[1.6]">
                회원님이 등록 요청한 제품 정보는 다른 사용자들이 함께 이용하는 공용 데이터예요. 개인 식별 정보와 분리해
                익명으로 보관됩니다.
              </p>
            </div>
            <div className="mt-6">
              <Button onClick={() => setStep(2)} variant="danger">
                네, 탈퇴를 진행할게요
              </Button>
            </div>
            <div className="mt-3">
              <Button onClick={() => router.back()} variant="ghost">
                계속 이용하기
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[21px] font-extrabold leading-snug">본인 확인이 필요해요</h1>
            <p className="mt-2 text-[14px] text-sub">계정 보호를 위해 비밀번호를 다시 입력해주세요.</p>
            <div className="mt-6">
              <Field label="비밀번호" error={error || undefined}>
                <Input value={password} onChange={setPassword} type="password" placeholder="비밀번호를 입력해주세요." />
              </Field>
            </div>
            <Button onClick={() => setStep(3)} disabled={!password}>
              다음
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-[21px] font-extrabold leading-snug">떠나시는 이유를 알려주세요</h1>
            <p className="mt-2 text-[14px] text-sub">서비스 개선에 참고할게요. (선택)</p>
            <div className="mt-5 space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full h-[52px] px-4 rounded-xl border text-left text-[14.5px] flex items-center gap-2.5 ${
                    reason === r ? "border-brand bg-mint-soft font-semibold" : "border-line"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      reason === r ? "bg-brand text-white" : "border border-[#cfd4d9]"
                    }`}
                  >
                    {reason === r && <I.Check className="w-3 h-3" />}
                  </span>
                  {r}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-[13.5px] text-danger">{error}</p>}
            <div className="mt-6">
              <Button onClick={() => setConfirmOpen(true)} variant="danger">
                탈퇴하기
              </Button>
            </div>
          </>
        )}
        <div className="h-10" />
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-danger-bg flex items-center justify-center text-danger">
            <I.Alert className="w-6 h-6" />
          </div>
          <h2 className="mt-3.5 text-[18px] font-extrabold">정말 탈퇴하시겠어요?</h2>
          <p className="mt-1.5 text-[13.5px] text-sub">이 작업은 되돌릴 수 없어요.</p>
          <div className="mt-5 space-y-2">
            <Button onClick={submit} loading={loading} variant="danger">
              탈퇴 확인
            </Button>
            <Button onClick={() => setConfirmOpen(false)} variant="ghost">
              취소
            </Button>
          </div>
        </div>
      </Modal>
    </Screen>
  );
}
