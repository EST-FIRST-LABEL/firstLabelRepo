type P = { className?: string; filled?: boolean };

const s = (className?: string) => className ?? "w-6 h-6";

export const Logo = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none">
    <path
      d="M20 4c0 8.5-4.2 13-9.4 13C7.4 17 5 14.8 5 11.6 5 7.4 9.4 4 20 4Z"
      fill="currentColor"
    />
    <path d="M4.5 20c1.6-4.2 4.4-7.2 8.5-9.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const Home = ({ className, filled }: P) =>
  filled ? (
    <svg viewBox="0 0 24 24" className={s(className)} fill="currentColor">
      <path d="M11.3 2.6a1 1 0 0 1 1.4 0l8 7.2c.2.2.3.5.3.8V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-9.4c0-.3.1-.6.3-.8l8-7.2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.6 10.2 12 3l8.4 7.2V20a1.6 1.6 0 0 1-1.6 1.6h-3.6V15H8.8v6.6H5.2A1.6 1.6 0 0 1 3.6 20v-9.8Z" strokeLinejoin="round" />
    </svg>
  );

export const Chart = ({ className, filled }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill={filled ? "currentColor" : "none"} />
    <path d="m7.5 14 3-3.2 2.4 2.4 3.6-4.2" stroke={filled ? "#fff" : "currentColor"} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Tag = ({ className, filled }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
    <path
      d="M12 2.8c1.2 0 2.2 1.5 3.3 1.9 1.1.3 2.8-.4 3.6.5.9.9.2 2.5.5 3.6.4 1.1 1.9 2.1 1.9 3.3s-1.5 2.2-1.9 3.3c-.3 1.1.4 2.7-.5 3.6-.8.9-2.5.2-3.6.5-1.1.4-2.1 1.9-3.3 1.9s-2.2-1.5-3.3-1.9c-1.1-.3-2.8.4-3.6-.5-.9-.9-.2-2.5-.5-3.6-.4-1.1-1.9-2.1-1.9-3.3s1.5-2.2 1.9-3.3c.3-1.1-.4-2.7.5-3.6.8-.9 2.5-.2 3.6-.5C9.8 4.3 10.8 2.8 12 2.8Z"
      strokeLinejoin="round"
    />
  </svg>
);

export const Person = ({ className, filled }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" strokeLinecap="round" />
  </svg>
);

export const Bell = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.3 5.4 2 6H4c.7-.6 2-2 2-6Z" strokeLinejoin="round" />
    <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
  </svg>
);

export const Search = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" strokeLinecap="round" />
  </svg>
);

export const Back = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 4.5 7.5 12 15 19.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Chevron = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 4.5 7.5 7.5L9 19.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Camera = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3.5 8.5h3l1.5-2.2h8L17.5 8.5h3v10h-17v-10Z" strokeLinejoin="round" />
    <circle cx="12" cy="13.2" r="3.4" />
  </svg>
);

export const Sliders = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 7.5h16M4 16.5h16" strokeLinecap="round" />
    <circle cx="9" cy="7.5" r="2.3" fill="#fff" />
    <circle cx="15.5" cy="16.5" r="2.3" fill="#fff" />
  </svg>
);

export const Check = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="2.6">
    <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Alert = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6.8v6.4M12 16.4v.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const Info = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10.8v5.4M12 7.8v.4" strokeLinecap="round" />
  </svg>
);

export const Shield = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M12 2.8 19.5 6v5.6c0 4.4-3 8-7.5 9.6-4.5-1.6-7.5-5.2-7.5-9.6V6L12 2.8Z" strokeLinejoin="round" />
    <path d="m8.8 12.2 2.2 2.2 4.2-4.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Plus = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M12 5.5v13M5.5 12h13" strokeLinecap="round" />
  </svg>
);

export const Close = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
  </svg>
);

export const Clock = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Star = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="currentColor">
    <path d="m12 3.4 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.6l5.9-.8L12 3.4Z" />
  </svg>
);

export const Heart = ({ className, filled }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20.2 4.6 13c-2-2-2-5.2 0-7.1a5 5 0 0 1 7.4.4 5 5 0 0 1 7.4-.4c2 1.9 2 5.1 0 7.1L12 20.2Z" strokeLinejoin="round" />
  </svg>
);

export const Image = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="currentColor">
    <circle cx="9.2" cy="9" r="2.2" />
    <path d="M3 17.5 8.6 12l3.4 3.4L15.6 11l5.4 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1.5Z" />
  </svg>
);

export const Doc = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M6 3.5h7.5L18 8v12.5H6V3.5Z" strokeLinejoin="round" />
    <path d="M8.8 12.5h6.4M8.8 16h4.4" strokeLinecap="round" />
  </svg>
);

export const Bookmark = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M6.5 3.8h11v16.4L12 16.4l-5.5 3.8V3.8Z" strokeLinejoin="round" />
  </svg>
);

export const Chat = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M4 5.5h16v11H13l-4.5 3.5v-3.5H4v-11Z" strokeLinejoin="round" />
  </svg>
);

export const Logout = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M14 4.5H5.5v15H14" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 12h8m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Eye = ({ className, filled }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
    {!filled && <path d="m4 20 16-16" strokeLinecap="round" />}
  </svg>
);

export const Milk = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M8 2.8h8l-1 3.2v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V6L8 2.8Z" strokeLinejoin="round" />
    <path d="M9 11h6" strokeLinecap="round" />
  </svg>
);

export const Drink = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M10 2.5h4v2.2l1.5 1.8v13a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-13L10 4.7V2.5Z" strokeLinejoin="round" />
  </svg>
);

export const Snack = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 3.5c4.7 0 8.5 3.8 8.5 8.5S16.7 20.5 12 20.5 3.5 16.7 3.5 12 7.3 3.5 12 3.5Z" />
    <circle cx="10" cy="10" r="1" fill="currentColor" />
    <circle cx="14.5" cy="12.5" r="1" fill="currentColor" />
    <circle cx="10.5" cy="15" r="1" fill="currentColor" />
  </svg>
);

export const Bakery = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 13.5c0-3 3.6-5.5 8-5.5s8 2.5 8 5.5v4H4v-4Z" strokeLinejoin="round" />
    <path d="M7.5 8.5 9 5.5M12 8V5M16.5 8.5 15 5.5" strokeLinecap="round" />
  </svg>
);

export const Dots = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="currentColor">
    <circle cx="5.5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="18.5" cy="12" r="1.7" />
  </svg>
);

export const Bot = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="4" y="7.5" width="16" height="12" rx="4" />
    <circle cx="9.5" cy="13.5" r="1.2" fill="currentColor" />
    <circle cx="14.5" cy="13.5" r="1.2" fill="currentColor" />
    <path d="M12 4v3.5" strokeLinecap="round" />
  </svg>
);

export const Help = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.7 9.4a2.4 2.4 0 1 1 3.1 2.3c-.6.2-.9.7-.9 1.3v.5" strokeLinecap="round" />
    <path d="M12 16.4v.4" strokeLinecap="round" strokeWidth="2.2" />
  </svg>
);

/** 3-1 미등록 상품 안내 일러스트: 우유팩 + 돋보기 */
export const UnknownProduct = ({ className }: P) => (
  <svg viewBox="0 0 160 160" className={className ?? "w-[160px] h-[160px]"} fill="none">
    <path d="M52 34h56v82a8 8 0 0 1-8 8H60a8 8 0 0 1-8-8V34Z" fill="#eceff2" />
    <path d="M52 34 62 20h36l10 14H52Z" fill="#e2e6ea" />
    <rect x="62" y="44" width="14" height="14" rx="3" fill="#ced4da" />
    <rect x="62" y="70" width="30" height="10" rx="3" fill="#dee2e6" />
    <circle cx="99" cy="97" r="27" fill="#fff" fillOpacity="0.75" stroke="#c9ced4" strokeWidth="7" />
    <path
      d="M93.6 89.6a5.9 5.9 0 1 1 7.6 5.7c-1.4.5-2.2 1.7-2.2 3.2v1.2"
      stroke="#0c7a3d"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path d="M99 105.5v.8" stroke="#0c7a3d" strokeWidth="5.4" strokeLinecap="round" />
    <path d="m119 117 11 11" stroke="#c9ced4" strokeWidth="7" strokeLinecap="round" />
  </svg>
);

export const Share = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={s(className)} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 15.5V3.8m0 0L8.2 7.6M12 3.8l3.8 3.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13" strokeLinecap="round" />
  </svg>
);
