"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppHeader, Button, Modal, ProductThumb, Screen, Spinner, STATUS_CHIP } from "@/components/ui";
import { api, type Registration } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

export default function RegistrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  useRequireAuth();
  const [r, setR] = useState<Registration | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<Registration>(`/api/v1/registrations/${id}`).then(setR).catch(() => {});
  }, [id]);

  const cancel = async () => {
    setLoading(true);
    try {
      const updated = await api.post<Registration>(`/api/v1/registrations/${id}/cancel`);
      setR(updated);
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!r)
    return (
      <Screen nav={false}>
        <AppHeader title="등록 요청 상세" />
        <div className="py-24 flex justify-center text-brand">
          <Spinner className="w-7 h-7" />
        </div>
      </Screen>
    );

  const rows = [
    ["제품명", r.product_name],
    ["브랜드", r.brand || "-"],
    ["카테고리", r.category || "-"],
    ["요청 사유", r.reason || "-"],
  ];

  return (
    <Screen nav={false}>
      <AppHeader title="등록 요청 상세" />

      <div className="px-6 pt-5">
        <div className="flex items-center gap-3">
          <ProductThumb url={r.representative_image_url || r.front_image_url} name={r.product_name} />
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[17px] leading-snug">{r.product_name}</p>
            <p className="text-[12.5px] text-sub mt-1">요청일 {r.created_at.slice(0, 10).replace(/-/g, ".")}</p>
          </div>
          <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${STATUS_CHIP[r.status]}`}>
            {r.status_label}
          </span>
        </div>

        <section className="mt-6">
          <h2 className="font-bold text-[15px] mb-3">요청 정보</h2>
          <div className="space-y-3">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-4 text-[14px]">
                <span className="w-[68px] shrink-0 text-sub">{k}</span>
                <span className="flex-1 leading-[1.5]">{v}</span>
              </div>
            ))}
            <div className="flex gap-4 text-[14px]">
              <span className="w-[68px] shrink-0 text-sub">대표 이미지</span>
              <span className="flex-1">{r.image_source === "ai_search" ? "AI 자동 검색" : "직접 업로드"}</span>
            </div>
          </div>
        </section>

        {(r.front_image_url || r.back_image_url) && (
          <section className="mt-6">
            <h2 className="font-bold text-[15px] mb-3">첨부 사진</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {[r.front_image_url, r.back_image_url].filter(Boolean).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="첨부 사진" className="w-full h-[120px] object-cover rounded-xl border border-line" />
              ))}
            </div>
          </section>
        )}

        {r.ocr_text && (
          <section className="mt-6">
            <h2 className="font-bold text-[15px] mb-2">인식된 원재료</h2>
            <p className="rounded-xl bg-[#fafbfc] p-3.5 text-[13px] text-sub leading-[1.6]">{r.ocr_text}</p>
          </section>
        )}

        <div className="mt-8">
          {r.status === "CANCELED" ? (
            <Button variant="ghost" disabled>
              취소된 요청이에요
            </Button>
          ) : r.status === "DONE" ? (
            <Button href={r.product_id ? `/products/${r.product_id}` : "/"}>등록된 제품 보기</Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} variant="ghost">
              요청 취소
            </Button>
          )}
        </div>
        <div className="h-10" />
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="text-center">
          <h2 className="text-[18px] font-extrabold">요청을 취소할까요?</h2>
          <p className="mt-1.5 text-[13.5px] text-sub">취소하면 등록 검토가 진행되지 않아요.</p>
          <div className="mt-5 space-y-2">
            <Button onClick={cancel} loading={loading} variant="danger">
              요청 취소하기
            </Button>
            <Button onClick={() => setConfirmOpen(false)} variant="ghost">
              닫기
            </Button>
          </div>
        </div>
      </Modal>
    </Screen>
  );
}
