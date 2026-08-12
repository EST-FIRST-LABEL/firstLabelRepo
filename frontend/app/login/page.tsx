"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { Button, Input, Modal, Screen } from "@/components/ui";
import { api, auth, type User } from "@/lib/api";

const SAVED_ID_KEY = "fl_saved_id";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_ID_KEY);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage(외부 저장소) 동기화
      setLoginId(saved);
      setRemember(true);
    }
  }, []);

  const submit = async () => {
    if (!loginId || !password) return setError("아이디와 비밀번호를 모두 입력해주세요.");
    setLoading(true);
    setError("");
    try {
      const r = await api.post<{ token: string; user: User }>("/api/v1/auth/login", {
        login_id: loginId,
        password,
      });
      auth.save(r.token, r.user);
      if (remember) localStorage.setItem(SAVED_ID_KEY, loginId);
      else localStorage.removeItem(SAVED_ID_KEY);
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen nav={false}>
      <div className="px-7 pt-16 pb-10">
        <div className="flex items-center gap-2 justify-center">
          <I.Logo className="w-7 h-7 text-brand" />
          <span className="font-extrabold tracking-[0.06em] text-brand text-[19px]">FIRST LABEL</span>
        </div>

        <h1 className="mt-12 text-[28px] font-extrabold">로그인</h1>
        <p className="mt-2 text-[14.5px] text-sub leading-[1.5]">
          First Label의 다양한 기능을
          <br />
          이용하려면 로그인해주세요.
        </p>

        <div className="mt-8 space-y-3">
          <Input value={loginId} onChange={setLoginId} placeholder="아이디를 입력해주세요." />
          <Input
            value={password}
            onChange={setPassword}
            placeholder="비밀번호를 입력해주세요."
            type="password"
            onEnter={submit}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => setRemember((v) => !v)} className="flex items-center gap-2 text-[14px]">
            <span
              className={`w-5 h-5 rounded-[6px] flex items-center justify-center ${
                remember ? "bg-brand text-white" : "border border-[#cfd4d9]"
              }`}
            >
              {remember && <I.Check className="w-3.5 h-3.5" />}
            </span>
            아이디 저장
          </button>
          <Link href="/login/find" className="text-[14px] text-sub">
            비밀번호 찾기
          </Link>
        </div>

        <div className="mt-6">
          <Button onClick={submit} loading={loading}>
            로그인
          </Button>
        </div>

        {error && (
          <p className="mt-3.5 text-[13.5px] text-danger leading-[1.5] flex gap-1.5">
            <I.Alert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}

        <p className="mt-8 text-center text-[14px] text-sub">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-bold text-brand">
            회원가입
          </Link>
        </p>
      </div>

      <Modal open={success}>
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-mint flex items-center justify-center text-brand">
            <I.Check className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-[19px] font-extrabold">로그인에 성공했어요!</h2>
          <p className="mt-1.5 text-[14px] text-sub">환영합니다, 건강한 선택을 도와드릴게요.</p>
          <div className="mt-6">
            <Button onClick={() => router.replace("/")}>확인</Button>
          </div>
        </div>
      </Modal>
    </Screen>
  );
}
