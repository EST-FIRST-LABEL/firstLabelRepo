"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader, Button, Empty, Field, Input, Screen, Sheet, Spinner } from "@/components/ui";
import { api, type Inquiry } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

const TABS = [
  { key: "", label: "전체" },
  { key: "true", label: "답변 완료" },
  { key: "false", label: "답변 대기" },
];

const CATEGORIES = ["제품 등록 문의", "분석 결과 문의", "계정 문의", "기타 문의"];

export default function InquiriesPage() {
  useRequireAuth();
  const [tab, setTab] = useState("");
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [writing, setWriting] = useState(false);

  const load = (answered: string) =>
    api
      .get<{ items: Inquiry[] }>(`/api/v1/users/me/inquiries${answered ? `?answered=${answered}` : ""}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭 변경 시 로딩 상태로 초기화
    setItems(null);
    load(tab);
  }, [tab]);

  return (
    <Screen nav={false}>
      <AppHeader title="문의 내역" />

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
          <Empty text={"문의 내역이 없어요."} />
        ) : (
          <div className="fl-card divide-y divide-line">
            {items.map((i) => (
              <Link key={i.id} href={`/mypage/inquiries/${i.id}`} className="block px-4 py-3.5 active:bg-mint-soft">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[14.5px] truncate">{i.category}</p>
                  <span className="text-[12.5px] text-sub shrink-0">{i.created_at.slice(0, 10).replace(/-/g, ".")}</span>
                </div>
                <p className="text-[13px] text-sub mt-1 truncate">{i.title}</p>
                <p className={`text-[12.5px] font-bold mt-1.5 ${i.answered ? "text-brand" : "text-warn"}`}>
                  {i.status_label}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-5">
          <Button onClick={() => setWriting(true)} variant="outline">
            문의하기
          </Button>
        </div>
        <div className="h-10" />
      </div>

      <InquiryForm
        open={writing}
        onClose={() => setWriting(false)}
        onSaved={() => {
          setWriting(false);
          load(tab);
        }}
      />
    </Screen>
  );
}

function InquiryForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post("/api/v1/users/me/inquiries", { category, title, body });
      setTitle("");
      setBody("");
      onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="text-[19px] font-extrabold mb-5">문의하기</h2>
      <p className="font-bold text-[15px] mb-2">문의 유형</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`text-[13px] font-bold px-3.5 py-2 rounded-full border ${
              category === c ? "bg-brand text-white border-brand" : "bg-white text-sub border-line"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <Field label="제목">
        <Input value={title} onChange={setTitle} placeholder="문의 제목을 입력해주세요." maxLength={60} />
      </Field>
      <Field label="내용">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="문의 내용을 자세히 적어주세요."
          className="w-full rounded-xl border border-line p-3.5 text-[15px] resize-none"
        />
      </Field>
      <Button onClick={submit} disabled={!title.trim()} loading={loading}>
        문의 등록하기
      </Button>
    </Sheet>
  );
}
