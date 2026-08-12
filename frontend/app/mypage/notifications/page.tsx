"use client";

import { useEffect, useState } from "react";

import { AppHeader, Screen, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

type Settings = {
  notify_push: boolean;
  notify_registration: boolean;
  notify_analysis: boolean;
  notify_recommend: boolean;
  notify_event: boolean;
};

const ITEMS: { key: keyof Settings; label: string; desc: string }[] = [
  { key: "notify_registration", label: "등록 요청 결과", desc: "요청한 제품의 등록 진행 상황" },
  { key: "notify_analysis", label: "분석 결과", desc: "분석 완료 및 결과 안내" },
  { key: "notify_recommend", label: "신제품 추천", desc: "AI 추천 제품 및 유사 제품" },
  { key: "notify_event", label: "이벤트 / 공지", desc: "이벤트 및 서비스 공지사항" },
];

export default function NotificationsPage() {
  useRequireAuth();
  const [s, setS] = useState<Settings | null>(null);

  useEffect(() => {
    api.get<Settings>("/api/v1/users/me/notifications").then(setS).catch(() => {});
  }, []);

  const update = async (key: keyof Settings, value: boolean) => {
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));
    await api.patch("/api/v1/users/me/notifications", { [key]: value }).catch(() => {});
  };

  return (
    <Screen nav={false}>
      <AppHeader title="알림 설정" />

      <div className="px-6 pt-6">
        <h2 className="font-bold text-[15px] mb-3">푸시 알림</h2>
        <div className="fl-card px-4 py-3.5 flex items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-[15px]">푸시 알림 받기</p>
            <p className="text-[13px] text-sub mt-0.5">서비스의 주요 알림을 받습니다.</p>
          </div>
          <Toggle on={!!s?.notify_push} onChange={(v) => update("notify_push", v)} />
        </div>

        <h2 className="font-bold text-[15px] mt-7 mb-3">알림 항목</h2>
        <div className="fl-card divide-y divide-line">
          {ITEMS.map((it) => (
            <div key={it.key} className="px-4 py-3.5 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-[15px]">{it.label}</p>
                <p className="text-[13px] text-sub mt-0.5">{it.desc}</p>
              </div>
              <Toggle
                on={!!s?.[it.key] && !!s?.notify_push}
                onChange={(v) => update(it.key, v)}
              />
            </div>
          ))}
        </div>

        <p className="mt-4 text-[12.5px] text-sub leading-[1.6]">
          푸시 알림 받기를 끄면 모든 항목의 알림이 발송되지 않아요.
        </p>
        <div className="h-10" />
      </div>
    </Screen>
  );
}
