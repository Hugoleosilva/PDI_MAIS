// "lite": testado direto contra a API com um prompt do tamanho real de um
// PDI — gemini-flash-latest (sem "lite") respondeu entre 14s e mais de 1
// minuto (modelo sobrecarregado no nível gratuito agora); gemini-flash-
// lite-latest respondeu em ~1,2s com o mesmo prompt. "-latest": alias que
// o Google recomenda — não trava numa versão que pode ser descontinuada.
const MODEL = "gemini-flash-lite-latest";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chama o Gemini de verdade (a chave mora só no servidor) com retry — o
 * nível gratuito vive com picos de "modelo sobrecarregado" (503/429),
 * transitório, geralmente some em poucos segundos. Usado por `/api/insight`
 * e `/api/diagnosis` — mesma receita, um helper só em vez de duplicar.
 */
export async function callGemini(
  prompt: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY não configurada no servidor (.env.local)." };
  }

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        const retryable = res.status === 503 || res.status === 429;
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(attempt * 1500);
          continue;
        }
        return { ok: false, error: data?.error?.message ?? `Gemini respondeu ${res.status}` };
      }

      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim();
      if (!text) {
        return { ok: false, error: "Gemini não devolveu texto." };
      }
      return { ok: true, text };
    } catch (e) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1500);
        continue;
      }
      return { ok: false, error: e instanceof Error ? e.message : "Erro ao chamar o Gemini." };
    }
  }

  // Inalcançável (o loop sempre retorna ou tenta de novo) — só pra o
  // TypeScript ver um caminho de saída em toda função.
  return { ok: false, error: "Falhou depois de várias tentativas." };
}
