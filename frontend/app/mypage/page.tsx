"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import * as I from "@/components/icons";
import { Button, Modal, Screen } from "@/components/ui";
import { ThreeTabNav } from "@/components/three-tab-nav";
import { api, auth } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuth";

type Me = {
  nickname: string;
  login_id: string;
  grade: string;
  counts: { pending_registrations: number; analyzed_products: number; wishlists: number };
};

const MENU = [
  { href: "/mypage/profile", label: "내 정보 관리", Icon: I.Person },
  { href: "/register", label: "제품 등록", Icon: I.Plus },
  { href: "/mypage/registrations", label: "등록 요청 내역", Icon: I.Doc },
  { href: "/mypage/favorites", label: "찜한 제품", Icon: I.Heart },
  { href: "/mypage/filters", label: "저장한 필터", Icon: I.Bookmark },
  { href: "/mypage/inquiries", label: "문의 내역", Icon: I.Chat },
];

export default function MyPage() {
  const router = useRouter();
  useRequireAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    api.get<Me>("/api/v1/users/me").then(setMe).catch(() => {});
  }, []);

  const logout = () => {
    auth.clear();
    router.replace("/login");
  };

  return (
    <Screen>
      <header className="h-14 px-5 flex items-center justify-center border-b border-line/70">
        <h1 className="font-bold text-[17px] text-center">마이페이지</h1>
      </header>

      <div className="px-5 pt-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-[72px] h-[72px] rounded-full bg-[#e9ecef] flex items-center justify-center text-[#adb5bd]">
              <I.Person className="w-9 h-9" />
            </div>
            <span className="absolute -right-0.5 bottom-0 w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center border-2 border-white">
              <I.Camera className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <p className="text-[18px] font-extrabold">
              {me?.nickname ?? "…"}님 <span className="text-[14px] font-medium text-sub">안녕하세요!</span>
            </p>
            <span className="inline-block mt-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full bg-mint text-brand">
              {me?.grade ?? "일반 회원"}
            </span>
          </div>
        </div>

        <section className="mt-6 fl-card p-4">
          <p className="font-bold text-[14.5px] mb-3">나의 활동 요약</p>
          <div className="flex">
            <Stat n={me?.counts.pending_registrations ?? 0} label="등록 대기" Icon={I.Doc} href="/mypage/registrations" />
            <Stat n={me?.counts.analyzed_products ?? 0} label="분석한 제품" Icon={I.Chart} href="/analysis" />
            <Stat n={me?.counts.wishlists ?? 0} label="찜한 제품" Icon={I.Heart} href="/mypage/favorites" />
          </div>
        </section>

        <Link href="/register" className="mt-4 flex items-center gap-3 rounded-2xl bg-mint-soft border border-brand/15 p-4 active:bg-mint">
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
            <I.Plus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-extrabold">제품 등록</p>
            <p className="text-[12.5px] text-sub mt-0.5">새 제품을 등록하거나 검토를 요청할 수 있어요.</p>
          </div>
          <I.Chevron className="w-4 h-4 text-brand" />
        </Link>

        <nav className="mt-4 fl-card divide-y divide-line">
          {MENU.filter((item) => item.href !== "/register").map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 px-4 h-[56px] active:bg-mint-soft">
              <Icon className="w-[20px] h-[20px] text-sub" />
              <span className="flex-1 text-[15px]">{label}</span>
              <I.Chevron className="w-4 h-4 text-[#c3c9cf]" />
            </Link>
          ))}
          <button onClick={() => setLogoutOpen(true)} className="w-full flex items-center gap-3 px-4 h-[56px]">
            <I.Logout className="w-[20px] h-[20px] text-sub" />
            <span className="flex-1 text-left text-[15px]">로그아웃</span>
          </button>
        </nav>

        <div className="h-6" />
      </div>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-mint flex items-center justify-center text-brand">
            <I.Logout className="w-6 h-6" />
          </div>
          <h2 className="mt-3.5 text-[18px] font-extrabold">로그아웃 하시겠어요?</h2>
          <p className="mt-1.5 text-[13.5px] text-sub leading-[1.5]">
            로그아웃하면 다시 로그인해야
            <br />서비스를 이용할 수 있습니다.
          </p>
          <div className="mt-5 space-y-2">
            <Button onClick={logout}>로그아웃</Button>
            <Button onClick={() => setLogoutOpen(false)} variant="ghost">취소</Button>
          </div>
        </div>
      </Modal>

      <ThreeTabNav active="/mypage" />
    </Screen>
  );
}

function Stat({
  n,
  label,
  Icon,
  href,
}: {
  n: number;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  href: string;
}) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center gap-1">
      <Icon className="w-[18px] h-[18px] text-sub" />
      <span className="text-[19px] font-extrabold leading-tight">{n}</span>
      <span className="text-[12px] text-sub">{label}</span>
    </Link>
  );
}
