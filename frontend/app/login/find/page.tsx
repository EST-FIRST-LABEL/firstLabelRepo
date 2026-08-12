"use client";

import { AppHeader, Button, InfoBox, Screen } from "@/components/ui";

export default function FindPasswordPage() {
  return (
    <Screen nav={false}>
      <AppHeader title="비밀번호 찾기" />
      <div className="px-7 pt-10">
        <h1 className="text-[22px] font-extrabold leading-snug">
          비밀번호를
          <br />
          잊으셨나요?
        </h1>
        <p className="mt-3 text-[14.5px] text-sub leading-[1.6]">
          FIRST LABEL은 이메일·휴대폰 번호를 수집하지 않아, 자동 재설정을 제공하지 않아요. 문의를 남겨주시면 본인 확인 후
          도와드릴게요.
        </p>

        <div className="mt-7 space-y-2.5">
          <Button href="/mypage/inquiries">문의 남기기</Button>
          <Button href="/login" variant="ghost">
            로그인으로 돌아가기
          </Button>
        </div>

        <div className="mt-7">
          <InfoBox>
            개인정보 수집을 최소화하기 위한 정책이에요. 이메일 기반 재설정이 필요하면 회원가입 항목에 이메일을 추가해야
            해요.
          </InfoBox>
        </div>
      </div>
    </Screen>
  );
}
