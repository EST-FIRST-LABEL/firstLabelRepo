"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import * as I from "./icons";
import type { RiskLevel } from "@/lib/api";

/* ---------- 레이아웃 ---------- */

export function Screen({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="min-h-dvh bg-white mx-auto w-full max-w-[430px] shadow-[0_0_60px_rgba(0,0,0,0.06)] relative">
      <div className={nav ? "pb-24" : ""}>{children}</div>
    </div>
  );
}

export function AppHeader({
  title,
  logo,
  back = true,
  right,
}: {
  title?: string;
  logo?: boolean;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-line/70">
      <div className="h-14 px-4 flex items-center gap-2">
        {back ? (
          <button onClick={() => router.back()} aria-label="뒤로" className="p-1 -ml-1 text-ink">
            <I.Back className="w-6 h-6" />
          </button>
        ) : (
          <span className="w-6" />
        )}
        <div className="flex-1 flex justify-center items-center gap-1.5">
          {logo ? (
            <img
              src="/first-label-logo-tight.png"
              alt="FIRST LABEL"
              className="h-6 w-auto object-contain"
            />
          ) : (
            <h1 className="font-bold text-[17px]">{title}</h1>
          )}
        </div>
        <div className="w-6 flex justify-end text-ink">{right}</div>
      </div>
    </header>
  );
}

export function StepBadge({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center pt-5 pb-1">
      <span className="bg-mint text-brand font-bold text-[13px] px-5 py-2 rounded-full">{children}</span>
    </div>
  );
}

const NAV = [
  { href: "/", label: "홈", Icon: I.Home },
  { href: "/analysis", label: "분석", Icon: I.Chart },
  { href: "/recommend", label: "추천", Icon: I.Tag },
  { href: "/mypage", label: "마이페이지", Icon: I.Person },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-line z-30">
      <div className="flex">
        {NAV.map(({ href, label, Icon }) => {
          const on = active === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 ${on ? "text-brand" : "text-[#b0b6bd]"}`}
            >
              <Icon className="w-6 h-6" filled={on} />
              <span className={`text-[11px] ${on ? "font-bold" : "font-medium"}`}>{label}</span>
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

/* ---------- 기본 요소 ---------- */

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  disabled,
  loading,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = {
    primary: "bg-brand text-white active:bg-brand-dark disabled:bg-[#c9d3cc]",
    outline: "bg-white text-brand border border-brand active:bg-mint-soft",
    ghost: "bg-[#f4f5f7] text-sub active:bg-[#eceef1]",
    danger: "bg-white text-danger border border-danger/40 active:bg-danger-bg",
  }[variant];
  const cls = `w-full h-[54px] rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 transition-colors ${styles} ${className}`;

  if (href && !disabled)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={cls}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <span
      className={`${className} inline-block rounded-full border-2 border-current border-t-transparent animate-spin`}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  success,
  children,
  right,
}: {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {label && <label className="block font-bold text-[15px] mb-2">{label}</label>}
      <div className="flex gap-2">
        <div className="flex-1">{children}</div>
        {right}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger flex items-center gap-1">● {error}</p>}
      {!error && success && <p className="mt-1.5 text-[13px] text-brand flex items-center gap-1">✓ {success}</p>}
      {!error && !success && hint && <p className="mt-1.5 text-[13px] text-sub">{hint}</p>}
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  counter,
  disabled,
  onEnter,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  maxLength?: number;
  counter?: boolean;
  disabled?: boolean;
  onEnter?: () => void;
  onBlur?: () => void;
}) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div
      className={`relative flex items-center h-[52px] rounded-xl border border-line px-4 ${
        disabled ? "bg-[#f7f8f9]" : "bg-white focus-within:border-brand"
      }`}
    >
      <input
        className="flex-1 bg-transparent text-[15px] placeholder:text-[#b6bcc3] disabled:text-sub"
        value={value}
        type={isPw && !show ? "password" : "text"}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      />
      {counter && maxLength && (
        <span className="text-[13px] text-[#b6bcc3] ml-2">
          {value.length}/{maxLength}
        </span>
      )}
      {isPw && (
        <button type="button" onClick={() => setShow((v) => !v)} className="ml-2 text-[#b6bcc3]" aria-label="비밀번호 표시">
          <I.Eye className="w-5 h-5" filled={show} />
        </button>
      )}
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-[52px] h-[30px] rounded-full p-[3px] transition-colors ${on ? "bg-brand" : "bg-[#d7dbe0]"}`}
      aria-pressed={on}
    >
      <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? "translate-x-[22px]" : ""}`} />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[330px] bg-white rounded-3xl p-6 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-8 animate-sheet max-h-[80dvh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}

/** 완료 화면의 체크 원 + 컨페티 */
export function SuccessMark() {
  const confetti = [
    { c: "bg-[#4ade80]", s: "w-2.5 h-2.5", p: "left-[16%] top-[24%] rotate-45" },
    { c: "bg-[#f59e0b]", s: "w-2 h-2", p: "left-[43%] top-[10%] rotate-12" },
    { c: "bg-[#ef4444]", s: "w-2.5 h-2.5", p: "right-[18%] top-[17%] -rotate-12" },
    { c: "bg-[#ec4899]", s: "w-3 h-2.5", p: "left-[8%] top-[41%] rotate-45" },
    { c: "bg-[#3b82f6]", s: "w-2 h-2", p: "left-[12%] top-[60%]" },
    { c: "bg-[#22c55e]", s: "w-3 h-3", p: "right-[10%] top-[42%] rotate-45" },
    { c: "bg-[#3b82f6]", s: "w-2.5 h-2.5", p: "right-[8%] top-[60%] rotate-12" },
    { c: "bg-[#facc15]", s: "w-2 h-2", p: "right-[22%] bottom-[10%]" },
    { c: "bg-[#4ade80]", s: "w-2.5 h-2.5", p: "left-[20%] bottom-[8%] rotate-45" },
  ];
  return (
    <div className="relative w-[220px] h-[190px] mx-auto">
      {confetti.map((f, i) => (
        <span key={i} className={`absolute rounded-[2px] ${f.c} ${f.s} ${f.p}`} />
      ))}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[112px] h-[112px] rounded-full bg-brand-light flex items-center justify-center text-white animate-pop">
        <I.Check className="w-14 h-14" />
      </div>
    </div>
  );
}

export function InfoBox({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "gray" }) {
  return (
    <div
      className={`rounded-2xl p-4 flex gap-2.5 text-[13.5px] leading-[1.5] ${
        tone === "green" ? "bg-mint-soft text-sub" : "bg-[#f7f8f9] text-sub"
      }`}
    >
      <I.Info className="w-[18px] h-[18px] shrink-0 mt-[1px] text-brand" />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="py-16 text-center text-sub text-[14px]">
      <p className="whitespace-pre-line">{text}</p>
      {action && <div className="mt-4 px-10">{action}</div>}
    </div>
  );
}

/* ---------- 위험도 ---------- */

export const RISK: Record<RiskLevel, { label: string; dot: string; chip: string; text: string }> = {
  DANGER: { label: "주의 필요", dot: "bg-danger", chip: "bg-danger-bg text-danger", text: "text-danger" },
  WARNING: { label: "주의", dot: "bg-warn", chip: "bg-warn-bg text-warn", text: "text-warn" },
  CAUTION: { label: "낮은 주의", dot: "bg-caution", chip: "bg-caution-bg text-[#a1801a]", text: "text-[#a1801a]" },
  SAFE: { label: "안심", dot: "bg-safe", chip: "bg-safe-bg text-brand", text: "text-brand" },
};

/** 등록 요청 상태 뱃지 색 */
export const STATUS_CHIP: Record<string, string> = {
  PENDING: "bg-mint text-brand",
  REVIEWING: "bg-warn-bg text-warn",
  DONE: "bg-safe-bg text-brand",
  CANCELED: "bg-[#f1f3f5] text-sub",
};

export function RiskDot({ level }: { level: RiskLevel }) {
  return <span className={`w-[14px] h-[14px] rounded-full shrink-0 ${RISK[level].dot}`} />;
}

export function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${RISK[level].chip}`}>{RISK[level].label}</span>
  );
}

/* ---------- 제품 ---------- */

// 이미지가 없을 때 쓰는 색상 팔레트. 제품명 해시로 고르므로 항상 같은 제품 = 같은 색.
const THUMB_COLORS = [
  { bg: "#eaf6ee", fg: "#0c7a3d" },
  { bg: "#fff2e6", fg: "#b45309" },
  { bg: "#fdecec", fg: "#b91c1c" },
  { bg: "#eef2ff", fg: "#4338ca" },
  { bg: "#fdf4ff", fg: "#a21caf" },
  { bg: "#ecfeff", fg: "#0e7490" },
];

function thumbStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return THUMB_COLORS[h % THUMB_COLORS.length];
}

/** 제품 썸네일. 이미지 URL이 없으면 제품명 기반 색상 + 앞 두 글자로 대체한다. */
export function ProductThumb({ url, name, className = "w-14 h-16" }: { url?: string; name: string; className?: string }) {
  if (url)
    // 외부 이미지 URL을 그대로 참조 (§9 이미지 처리 방침)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${className} object-contain shrink-0`} />;

  const { bg, fg } = thumbStyle(name);
  // 브랜드명을 빼고 제품 고유명에서 두 글자를 뽑는다 (예: "빙그레 딸기맛우유" → "딸기")
  const core = name.split(" ").slice(-1)[0] || name;
  const label = core.replace(/[^가-힣a-zA-Z0-9]/g, "").slice(0, 2) || name.slice(0, 2);

  return (
    <div
      className={`${className} rounded-xl flex flex-col items-center justify-center gap-0.5 shrink-0 overflow-hidden`}
      style={{ background: bg }}
      aria-label={name}
    >
      <span className="shrink-0 leading-none" style={{ color: fg, opacity: 0.45 }}>
        <I.Milk className="w-4 h-4" />
      </span>
      <span className="text-[13px] font-extrabold leading-none" style={{ color: fg }}>
        {label}
      </span>
    </div>
  );
}

export function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-[13px] text-sub">
      <I.Star className="w-[14px] h-[14px] text-[#ffc44d]" />
      <b className="text-ink font-semibold">{rating.toFixed(1)}</b>
      <span>({count})</span>
    </span>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-ink/90 text-white text-[14px] px-5 py-3 rounded-full animate-pop">
      {message}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  return {
    message,
    show: (m: string) => {
      setMessage(m);
      setTimeout(() => setMessage(null), 2000);
    },
  };
}
