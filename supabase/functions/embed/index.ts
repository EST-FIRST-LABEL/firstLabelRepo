// FIRST LABEL 임베딩 Edge Function.
//
// 텍스트 배열을 받아 Supabase 내장 gte-small 모델로 384차원 벡터를 돌려준다.
// 서버리스(Vercel) 백엔드가 임베딩 모델을 담을 수 없어 여기로 분리했다.
// (Cloud Run 대체 — 별도 컨테이너/배포 없이 Supabase에서 바로 실행)
//
// 백엔드 계약: POST { "texts": ["...", "..."] } -> { "vectors": [[...], ...], "dim": 384 }

const MAX_TEXTS = 512;
const MAX_TEXT_LEN = 2000;

// gte-small 세션은 콜드스타트 비용이 있으니 모듈 스코프에서 한 번만 만든다.
const session = new Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "POST만 허용됩니다." }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON 본문을 읽을 수 없습니다." }, 400);
  }

  const texts = (body as { texts?: unknown })?.texts;
  if (!Array.isArray(texts) || texts.length === 0) {
    return json({ error: "texts 배열이 필요합니다." }, 400);
  }
  if (texts.length > MAX_TEXTS) {
    return json({ error: `한 번에 ${MAX_TEXTS}개까지만 처리할 수 있습니다.` }, 413);
  }

  try {
    const vectors: number[][] = [];
    for (const t of texts) {
      const text = String(t ?? "").slice(0, MAX_TEXT_LEN);
      // mean_pool + normalize 로 문장 임베딩(단위벡터)을 얻는다.
      const vec = (await session.run(text, { mean_pool: true, normalize: true })) as number[];
      vectors.push(vec);
    }
    return json({ vectors, dim: vectors[0]?.length ?? 0 });
  } catch (e) {
    return json({ error: `임베딩 생성 실패: ${e instanceof Error ? e.message : String(e)}` }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
