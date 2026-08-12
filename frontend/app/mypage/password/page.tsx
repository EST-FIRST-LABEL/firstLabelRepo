"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppHeader, Button, Field, Input, Screen } from "@/components/ui";
import { api, auth } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";
import { validatePassword } from "@/lib/validate";

export default function PasswordPage() {
  const router = useRouter();
  useRequireAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const nextErr = next ? validatePassword(next, auth.user?.login_id ?? "") : null;
  const confirmErr = confirm && confirm !== next ? "비밀번호가 일치하지 않습니다." : null;
  const ready = !!current && !!next && !!confirm && !nextErr && !confirmErr;

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await api.patch("/api/v1/users/me/password", {
        current_password: current,
        new_password: next,
        new_password_confirm: confirm,
      });
      setDone(true);
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen nav={false}>
      <AppHeader title="비밀번호 변경" />

      <div className="px-6 pt-6">
        <Field label="현재 비밀번호">
          <Input value={current} onChange={setCurrent} type="password" placeholder="현재 비밀번호를 입력해주세요." />
        </Field>

        <Field
          label="새 비밀번호"
          hint="영문, 숫자, 특수문자 포함 8~20자"
          error={nextErr ?? undefined}
          success={next && !nextErr ? "안전한 비밀번호입니다." : undefined}
        >
          <Input value={next} onChange={setNext} type="password" placeholder="새 비밀번호를 입력해주세요." />
        </Field>

        <Field
          label="새 비밀번호 확인"
          error={confirmErr ?? undefined}
          success={confirm && !confirmErr ? "비밀번호가 일치합니다." : undefined}
        >
          <Input value={confirm} onChange={setConfirm} type="password" placeholder="새 비밀번호를 다시 입력해주세요." />
        </Field>

        {error && <p className="mb-3 text-[13.5px] text-danger">{error}</p>}
        {done && <p className="mb-3 text-[13.5px] text-brand font-bold">비밀번호가 변경되었습니다.</p>}

        <Button onClick={submit} disabled={!ready} loading={loading}>
          변경하기
        </Button>
        <div className="h-10" />
      </div>
    </Screen>
  );
}
