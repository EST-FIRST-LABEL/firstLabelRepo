"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, Field, Input, Screen, Toast, useToast } from "@/components/ui";
import { api, auth } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";
import { validateNickname } from "@/lib/validate";

export default function ProfilePage() {
  useRequireAuth();
  const toast = useToast();
  const [nickname, setNickname] = useState("");
  const [loginId, setLoginId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ nickname: string; login_id: string }>("/api/v1/users/me")
      .then((r) => {
        setNickname(r.nickname);
        setLoginId(r.login_id);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    const err = validateNickname(nickname);
    if (err) return setError(err);
    setError("");
    try {
      await api.patch("/api/v1/users/me", { nickname });
      const u = auth.user;
      if (u) auth.save(auth.token!, { ...u, nickname });
      toast.show("닉네임이 변경되었습니다.");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen nav={false}>
      <AppHeader title="내 정보 관리" />

      <div className="px-6 pt-6">
        <p className="font-bold text-[15px] mb-4">프로필</p>
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-[92px] h-[92px] rounded-full bg-[#e9ecef] flex items-center justify-center text-[#adb5bd]">
              <I.Person className="w-11 h-11" />
            </div>
            <span className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center border-2 border-white">
              <I.Camera className="w-4 h-4" />
            </span>
          </div>
        </div>

        <Field label="닉네임" error={error || undefined}>
          <Input value={nickname} onChange={setNickname} onBlur={save} maxLength={10} counter placeholder="닉네임" />
        </Field>

        <Field label="아이디">
          <Input value={loginId} onChange={() => {}} disabled />
        </Field>

        <Link
          href="/mypage/password"
          className="flex items-center h-[56px] border-t border-line text-[15px] font-medium"
        >
          <span className="flex-1">비밀번호 변경</span>
          <I.Chevron className="w-4 h-4 text-[#c3c9cf]" />
        </Link>

        <Link href="/mypage/withdraw" className="block mt-6 text-[14px] font-bold text-danger">
          회원 탈퇴
        </Link>
        <div className="h-10" />
      </div>

      <Toast message={toast.message} />
    </Screen>
  );
}
