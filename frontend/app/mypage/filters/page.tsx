"use client";

import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { AppHeader, Button, Field, Input, Screen, Sheet, Spinner } from "@/components/ui";
import { api, type SavedFilter } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

type Group = { group_code: string; group_name: string; keywords: string[] };

export default function FiltersPage() {
  useRequireAuth();
  const [items, setItems] = useState<SavedFilter[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [editing, setEditing] = useState<SavedFilter | "new" | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const load = () => api.get<{ items: SavedFilter[] }>("/api/v1/users/me/filters").then((r) => setItems(r.items));

  useEffect(() => {
    load().catch(() => setItems([]));
    api.get<{ groups: Group[] }>("/api/v1/keywords").then((r) => setGroups(r.groups)).catch(() => {});
  }, []);

  const remove = async (id: number) => {
    setMenuFor(null);
    setItems((prev) => prev?.filter((f) => f.id !== id) ?? null);
    await api.del(`/api/v1/users/me/filters/${id}`).catch(() => {});
  };

  return (
    <Screen nav={false}>
      <AppHeader title="저장한 필터" />

      <div className="px-6 pt-5">
        <p className="text-[14px] text-sub leading-[1.55]">
          분석할 때 사용할 필터 조건을 저장하고
          <br />
          나중에 다시 사용할 수 있어요.
        </p>

        <button
          onClick={() => setEditing("new")}
          className="mt-5 w-full h-[52px] rounded-2xl border-[1.5px] border-dashed border-brand/50 text-brand font-bold text-[14.5px] flex items-center justify-center gap-1.5"
        >
          <I.Plus className="w-4 h-4" /> 새 필터 만들기
        </button>

        {items === null ? (
          <div className="py-16 flex justify-center text-brand">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {items.map((f) => (
              <div key={f.id} className="fl-card p-4 relative">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px]">{f.name}</p>
                    <p className="text-[13px] text-sub mt-1 leading-[1.5]">{f.summary || f.keywords.join(", ")}</p>
                    <p className="text-[12px] text-[#adb5bd] mt-2">
                      수정일 {f.updated_at.slice(0, 10).replace(/-/g, ".")}
                    </p>
                  </div>
                  <button
                    onClick={() => setMenuFor(menuFor === f.id ? null : f.id)}
                    aria-label="더보기"
                    className="text-[#adb5bd] p-1"
                  >
                    <I.Dots className="w-5 h-5" />
                  </button>
                </div>
                {menuFor === f.id && (
                  <div className="absolute right-3 top-11 z-10 bg-white rounded-xl border border-line shadow-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setEditing(f);
                        setMenuFor(null);
                      }}
                      className="block w-28 px-4 py-2.5 text-left text-[14px] active:bg-mint-soft"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => remove(f.id)}
                      className="block w-28 px-4 py-2.5 text-left text-[14px] text-danger active:bg-danger-bg"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && <p className="py-12 text-center text-[14px] text-sub">저장한 필터가 없어요.</p>}
          </div>
        )}
        <div className="h-10" />
      </div>

      <FilterEditor
        target={editing}
        groups={groups}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </Screen>
  );
}

function FilterEditor({
  target,
  groups,
  onClose,
  onSaved,
}: {
  target: SavedFilter | "new" | null;
  groups: Group[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = target === "new";
  const filter = isNew || !target ? null : target;
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 편집 대상 변경 시 폼 초기화
    setName(filter?.name ?? "");
    setSummary(filter?.summary ?? "");
    setKeywords(filter?.keywords ?? ["LACTOSE"]);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setLoading(true);
    try {
      const body = { name, summary, keywords };
      if (filter) await api.patch(`/api/v1/users/me/filters/${filter.id}`, body);
      else await api.post("/api/v1/users/me/filters", body);
      onSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={!!target} onClose={onClose}>
      <h2 className="text-[19px] font-extrabold mb-5">{isNew ? "새 필터 만들기" : "필터 수정"}</h2>
      <Field label="필터 이름">
        <Input value={name} onChange={setName} placeholder="예) 유당불내증 필터" maxLength={20} />
      </Field>
      <Field label="설명 (선택)">
        <Input value={summary} onChange={setSummary} placeholder="예) WPC 제외, 락토오스 주의" maxLength={40} />
      </Field>
      <p className="font-bold text-[15px] mb-2">주의 성분 그룹</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {groups.map((g) => {
          const on = keywords.includes(g.group_code);
          return (
            <button
              key={g.group_code}
              onClick={() => setKeywords((k) => (on ? k.filter((x) => x !== g.group_code) : [...k, g.group_code]))}
              className={`text-[13px] font-bold px-3.5 py-2 rounded-full border ${
                on ? "bg-brand text-white border-brand" : "bg-white text-sub border-line"
              }`}
            >
              {g.group_name}
            </button>
          );
        })}
      </div>
      <Button onClick={save} disabled={!name.trim()} loading={loading}>
        저장하기
      </Button>
    </Sheet>
  );
}
