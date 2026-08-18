"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, Button, Field, Input, Screen, SuccessMark } from "@/components/ui";
import { api, auth, type User } from "@/lib/api";
import { validateLoginId, validateNickname, validatePassword } from "@/lib/validate";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [nickname, setNickname] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [idChecked, setIdChecked] = useState<null | { ok: boolean; message: string }>(null);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const nicknameErr = nickname ? validateNickname(nickname) : null;
  const idErr = loginId ? validateLoginId(loginId) : null;
  const pwErr = password ? validatePassword(password, loginId) : null;
  const confirmErr = confirm && confirm !== password ? "비밀번호가 일치하지 않습니다." : null;

  const step1Ready =
    !!nickname &&
    !!loginId &&
    !!password &&
    !!confirm &&
    !nicknameErr &&
    !idErr &&
    !pwErr &&
    !confirmErr &&
    idChecked?.ok === true;

  const checkId = async () => {
    if (idErr || !loginId) return setIdChecked({ ok: false, message: idErr ?? "아이디를 입력해주세요." });
    const r = await api.get<{ available: boolean; message: string }>(
      `/api/v1/auth/check-id?login_id=${encodeURIComponent(loginId)}`,
    );
    setIdChecked({ ok: r.available, message: r.message });
  };

  const submit = async () => {
    setLoading(true);
    setServerError("");
    try {
      const r = await api.post<{ token: string; user: User }>("/api/v1/auth/signup", {
        nickname,
        login_id: loginId,
        password,
        password_confirm: confirm,
      });
      auth.save(r.token, r.user);
      setStep(3);
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) return <Done onStart={() => router.replace("/")} />;

  return (
    <Screen nav={false}>
      <AppHeader title="회원가입" />

      <div className="px-6 pt-6">
        <Steps current={step} />

        {step === 1 ? (
          <>
            <h2 className="mt-7 text-[17px] font-extrabold text-brand">01. 정보 입력</h2>
            <p className="mt-1.5 text-[14px] text-sub leading-[1.5]">
              서비스 이용을 위해
              <br />
              필요한 정보를 입력해주세요.
            </p>

            <div className="mt-6">
              <Field
                label="닉네임"
                hint="2~10자 이내 (한글, 영문, 숫자)"
                error={nicknameErr ?? undefined}
              >
                <Input
                  value={nickname}
                  onChange={setNickname}
                  placeholder="닉네임을 입력해주세요."
                  maxLength={10}
                  counter
                />
              </Field>

              <Field
                label="아이디"
                hint="영문, 숫자 조합 6~16자"
                error={idErr ?? (idChecked && !idChecked.ok ? idChecked.message : undefined)}
                success={idChecked?.ok ? idChecked.message : undefined}
                right={
                  <button
                    onClick={checkId}
                    className="h-[52px] px-3.5 rounded-xl border border-brand text-brand font-bold text-[13.5px] whitespace-nowrap"
                  >
                    {idChecked?.ok ? "중복 확인 완료" : "중복 확인"}
                  </button>
                }
              >
                <Input
                  value={loginId}
                  onChange={(v) => {
                    setLoginId(v.toLowerCase());
                    setIdChecked(null);
                  }}
                  placeholder="아이디를 입력해주세요."
                  maxLength={16}
                />
              </Field>

              <Field label="비밀번호" hint="영문, 숫자, 특수문자 포함 8~20자" error={pwErr ?? undefined}>
                <Input value={password} onChange={setPassword} placeholder="비밀번호를 입력해주세요." type="password" />
              </Field>

              <Field label="비밀번호 확인" error={confirmErr ?? undefined} success={confirm && !confirmErr ? "비밀번호가 일치합니다." : undefined}>
                <Input
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="비밀번호를 다시 입력해주세요."
                  type="password"
                />
              </Field>
            </div>

            <Button onClick={() => setStep(2)} disabled={!step1Ready}>
              다음
            </Button>
          </>
        ) : (
          <>
            <h2 className="mt-7 text-[17px] font-extrabold text-brand">02. 정보 검증</h2>
            <p className="mt-1.5 text-[14px] text-sub">입력하신 정보를 확인해주세요.</p>

            <div className="mt-6">
              <Field label="닉네임" success="사용 가능한 닉네임입니다.">
                <Input value={nickname} onChange={setNickname} maxLength={10} counter />
              </Field>
              <Field
                label="아이디"
                success={idChecked?.ok ? "사용 가능한 아이디입니다." : undefined}
                hint={idChecked?.ok ? undefined : "중복 확인을 해주세요."}
                right={
                  <button
                    onClick={checkId}
                    className="h-[52px] px-3.5 rounded-xl border border-brand text-brand font-bold text-[13.5px] whitespace-nowrap"
                  >
                    {idChecked?.ok ? "중복 확인 완료" : "중복 확인"}
                  </button>
                }
              >
                <Input value={loginId} onChange={() => {}} disabled />
              </Field>
              <Field label="비밀번호" success="안전한 비밀번호입니다.">
                <Input value={password} onChange={setPassword} type="password" />
              </Field>
              <Field label="비밀번호 확인" success="비밀번호가 일치합니다." error={confirmErr ?? undefined}>
                <Input value={confirm} onChange={setConfirm} type="password" />
              </Field>
            </div>

            {serverError && <p className="mb-3 text-[13.5px] text-danger">{serverError}</p>}

            <Button onClick={submit} loading={loading} disabled={!step1Ready}>
              다음
            </Button>
            <button onClick={() => setStep(1)} className="w-full mt-3 text-[14px] text-sub">
              이전으로
            </button>
          </>
        )}
        <div className="h-10" />
      </div>
    </Screen>
  );
}

function Steps({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center flex-1 last:flex-none gap-2">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold ${
              n <= current ? "bg-brand text-white" : "bg-[#e9ecef] text-[#adb5bd]"
            }`}
          >
            {n < current ? <I.Check className="w-3.5 h-3.5" /> : n}
          </span>
          {n < 3 && <span className={`flex-1 h-[2px] ${n < current ? "bg-brand" : "bg-[#e9ecef]"}`} />}
        </div>
      ))}
    </div>
  );
}

function Done({ onStart }: { onStart: () => void }) {
  const features = [
    { Icon: I.Doc, text: "미등록 상품 등록 및 관리" },
    { Icon: I.Chart, text: "분석 히스토리 저장" },
    { Icon: I.Bell, text: "맞춤 추천 및 알림" },
    { Icon: I.Person, text: "마이페이지 관리" },
  ];
  return (
    <Screen nav={false}>
      <AppHeader title="회원가입 완료" back={false} />
      <div className="px-7 pt-10 text-center">
        <SuccessMark />
        <h1 className="mt-4 text-[24px] font-extrabold">회원가입이 완료되었습니다!</h1>
        <p className="mt-2 text-[14.5px] text-sub leading-[1.5]">
          First Label의 다양한 기능을
          <br />
          이용하실 수 있어요.
        </p>

        <div className="mt-7 rounded-2xl bg-mint-soft p-5 text-left">
          <p className="flex items-center gap-1.5 font-bold text-[14px] text-brand mb-3">
            <I.Shield className="w-[18px] h-[18px]" /> 이런 기능을 이용할 수 있어요
          </p>
          <ul className="space-y-2.5">
            {features.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[14px]">
                <Icon className="w-[18px] h-[18px] text-brand" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7">
          <Button onClick={onStart}>시작하기</Button>
        </div>
        <p className="mt-5 text-[14px] text-sub">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-brand">
            로그인
          </Link>
        </p>
        <div className="h-10" />
      </div>
    </Screen>
  );
}
