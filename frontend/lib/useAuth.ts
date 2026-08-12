"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { auth, type User } from "./api";

/** 로그인이 필요한 화면에서 사용. 토큰이 없으면 /login 으로 보낸다. */
export function useRequireAuth(): User | null {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth.token) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage(외부 저장소) 동기화
    setUser(auth.user);
  }, [router]);

  return user;
}
