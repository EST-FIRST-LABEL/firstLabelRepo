export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const TOKEN_KEY = "fl_token";
const USER_KEY = "fl_user";

export type User = { id: string; login_id: string; nickname: string };

export const auth = {
  get token() {
    return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
  },
  get user(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  save(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("fl-auth"));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("fl-auth"));
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body) headers.set("Content-Type", "application/json");
  const token = auth.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401) auth.clear();
    const detail = data?.detail;
    throw new ApiError(res.status, typeof detail === "string" ? detail : "요청을 처리하지 못했어요.");
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};

// --- 공용 타입 ---

export type RiskLevel = "DANGER" | "WARNING" | "CAUTION" | "SAFE";

export type Product = {
  id: number;
  name: string;
  maker_name: string;
  category: string;
  volume: string;
  calories: number;
  image_url: string;
  image_source: string;
  rating: number;
  rating_count: number;
  is_lactose_free: boolean;
  is_plant_based: boolean;
  is_wished: boolean;
  raw_ingredients?: string;
};

export type Ingredient = {
  name: string;
  risk_level: RiskLevel;
  is_highlight: boolean;
  matched_keyword: string | null;
  description: string;
};

export type AnalysisResult = {
  has_warning: boolean;
  warning_count: number;
  score: number;
  score_label: string;
  counts: { total: number; safe: number; caution: number; warning: number; danger: number };
  first_card: { ingredient_name: string; risk_level: RiskLevel; matched_keyword: string | null; description: string }[];
  all_ingredients: Ingredient[];
  ai_comment?: string;
  raw_text?: string;
  image_url?: string;
  product?: Product;
};

export type Registration = {
  id: number;
  product_name: string;
  brand: string;
  category: string;
  reason: string;
  status: "PENDING" | "REVIEWING" | "DONE" | "CANCELED";
  status_label: string;
  front_image_url: string;
  back_image_url: string;
  representative_image_url: string;
  image_source: string;
  ocr_text: string;
  product_id: number | null;
  created_at: string;
};

export type Inquiry = {
  id: number;
  category: string;
  title: string;
  body: string;
  answer: string;
  answered: boolean;
  status_label: string;
  answered_at: string | null;
  created_at: string;
};

export type SavedFilter = {
  id: number;
  name: string;
  summary: string;
  keywords: string[];
  updated_at: string;
};
