"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader, Button, Empty, ProductThumb, Screen, Spinner, STATUS_CHIP } from "@/components/ui";
import { api, type Registration } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

const TABS = [
  { key: "", label: "전체" },
  { key: "PENDING", label: "등록 대기" },
  { key: "REVIEWING", label: "검증 중" },
  { key: "DONE", label: "등록 완료" },
];

export default function RegistrationsPage() {
  useRequireAuth();
  const [tab, setTab] = useState("");
  const [items, setItems] = useState<Registration[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭 변경 시 로딩 상태로 초기화
    setItems(null);
    api
      .get<{ items: Registration[] }>(`/api/v1/registrations/me${tab ? `?status=${tab}` : ""}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [tab]);

  return (
    <Screen nav={false}>
      <AppHeader title="등록 요청 내역" />

      <div className="px-6 pt-4">
        <div className="flex gap-1.5 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-[13px] font-bold px-3.5 py-2 rounded-full ${
                tab === t.key ? "bg-brand text-white" : "bg-[#f4f5f7] text-sub"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {items === null ? (
          <div className="py-16 flex justify-center text-brand">
            <Spinner className="w-6 h-6" />
          </div>
        ) : items.length === 0 ? (
          <Empty
            text={"아직 등록 요청한 제품이 없어요.\n찾는 제품이 없다면 등록을 요청해보세요."}
            action={<Button href="/register">미등록 제품 등록하기</Button>}
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {items.map((r) => (
                <Link
                  key={r.id}
                  href={`/mypage/registrations/${r.id}`}
                  className="flex items-center gap-3 fl-card fl-card-tap p-3 active:bg-mint-soft"
                >
                  <ProductThumb url={r.representative_image_url || r.front_image_url} name={r.product_name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] leading-snug line-clamp-1">{r.product_name}</p>
                    <p className="text-[12.5px] text-sub mt-1">
                      요청일 {r.created_at.slice(0, 10).replace(/-/g, ".")}
                    </p>
                  </div>
                  <span
                    className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CHIP[r.status]}`}
                  >
                    {r.status_label}
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-5 text-center text-[12.5px] text-sub">최대 30개까지 확인할 수 있어요.</p>
          </>
        )}
        <div className="h-10" />
      </div>
    </Screen>
  );
}
