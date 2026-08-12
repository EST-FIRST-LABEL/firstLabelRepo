/** 서버(app/core/security.py)와 동일한 규칙. 서버에서도 반드시 재검증된다. */

export function validateNickname(v: string): string | null {
  if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(v)) return "닉네임은 한글/영문/숫자 2~10자여야 합니다.";
  return null;
}

export function validateLoginId(v: string): string | null {
  if (!/^[a-z][a-z0-9]{5,15}$/.test(v)) return "영문 소문자로 시작하는 영문/숫자 조합 6~16자여야 합니다.";
  return null;
}

export function validatePassword(pw: string, loginId = ""): string | null {
  if (pw.length < 8 || pw.length > 20) return "비밀번호는 8~20자여야 합니다.";
  if (/\s/.test(pw)) return "비밀번호에 공백은 사용할 수 없습니다.";
  const kinds = [/[A-Za-z]/, /[0-9]/, /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/].filter((re) => re.test(pw)).length;
  if (kinds < 2) return "영문/숫자/특수문자 중 2종류 이상을 조합해주세요.";
  if (loginId && pw === loginId) return "아이디와 동일한 비밀번호는 사용할 수 없습니다.";
  if (hasRun(pw, 4)) return "동일하거나 연속된 문자를 4자 이상 사용할 수 없습니다. (예: 1111, abcd, aaaa)";
  return null;
}

function hasRun(pw: string, n: number): boolean {
  let same = 1;
  let up = 1;
  let down = 1;
  for (let i = 1; i < pw.length; i++) {
    const d = pw.charCodeAt(i) - pw.charCodeAt(i - 1);
    same = pw[i] === pw[i - 1] ? same + 1 : 1;
    up = d === 1 ? up + 1 : 1;
    down = d === -1 ? down + 1 : 1;
    if (Math.max(same, up, down) >= n) return true;
  }
  return false;
}
