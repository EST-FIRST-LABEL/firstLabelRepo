"use client";

import Link from "next/link";

import * as I from "./icons";

const NAV = [
  { href: "/", label: "홈", Icon: I.Home },
  { href: "/recommend", label: "추천", Icon: I.Tag },
  { href: "/mypage", label: "마이", Icon: I.Person },
] as const;

export function ThreeTabNav({ active }: { active: "/" | "/recommend" | "/mypage" }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-line z-30">
      <div className="flex">
        {NAV.map(({ href, label, Icon }) => {
          const on = active === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 ${on ? "text-brand" : "text-[#657080]"}`}
            >
              <Icon className="w-6 h-6" filled={on} />
              <span className={`text-[11.5px] ${on ? "font-bold" : "font-medium"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] min-h-[6px]" />
      <div className="flex justify-center pb-1.5">
        <span className="w-[120px] h-[4px] rounded-full bg-ink/80" />
      </div>
    </nav>
  );
}
