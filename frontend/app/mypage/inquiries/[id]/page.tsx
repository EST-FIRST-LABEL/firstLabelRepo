"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader, Button, Screen, Spinner } from "@/components/ui";
import { api, type Inquiry } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  useRequireAuth();
  const [i, setI] = useState<Inquiry | null>(null);

  useEffect(() => {
    api.get<Inquiry>(`/api/v1/users/me/inquiries/${id}`).then(setI).catch(() => {});
  }, [id]);

  if (!i)
    return (
      <Screen nav={false}>
        <AppHeader title="문의 상세" />
        <div className="py-24 flex justify-center text-brand">
          <Spinner className="w-7 h-7" />
        </div>
      </Screen>
    );

  return (
    <Screen nav={false}>
      <AppHeader title="문의 상세" />

      <div className="px-6 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-mint text-brand">{i.category}</span>
          <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${i.answered ? "bg-safe-bg text-brand" : "bg-warn-bg text-warn"}`}>
            {i.status_label}
          </span>
        </div>

        <h1 className="mt-4 text-[19px] font-extrabold leading-snug">{i.title}</h1>
        <p className="mt-1.5 text-[12.5px] text-sub">{i.created_at.slice(0, 16).replace("T", " ").replace(/-/g, ".")}</p>

        <p className="mt-5 text-[14.5px] leading-[1.65] whitespace-pre-line">{i.body || "-"}</p>

        {i.answered && (
          <section className="mt-7 rounded-2xl bg-mint-soft p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-[14px] text-brand">답변</p>
              <span className="text-[12px] text-sub">
                {i.answered_at?.slice(0, 16).replace("T", " ").replace(/-/g, ".")}
              </span>
            </div>
            <p className="text-[14px] leading-[1.65] whitespace-pre-line text-ink/80">{i.answer}</p>
          </section>
        )}

        <div className="mt-8">
          <Link href="/mypage/inquiries">
            <Button variant="outline">문의 목록으로</Button>
          </Link>
        </div>
        <div className="h-10" />
      </div>
    </Screen>
  );
}
