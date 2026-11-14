/**
 * Cliente da Gemini API chamado direto do navegador. A chave vem do próprio
 * app (NEXT_PUBLIC_GEMINI_API_KEY, no arquivo .env.local, fora do git). Uma
 * chave salva neste navegador (localStorage), se houver, tem preferência.
 *
 * Atenção: no site estático, NEXT_PUBLIC_* vai dentro do JavaScript publicado.
 * Use uma chave temporária, restrita por site (HTTP referrer) e só à Gemini API.
 * Para as lojas, use NEXT_PUBLIC_AI_PROXY_URL (a chave fica no servidor).
 *
 * Tenta cada modelo em ordem; se um estiver sobrecarregado ou demorar demais,
 * passa para o próximo.
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const KEY_STORAGE = "elo-saude:gemini-key";
/** Chave embutida pelo app no build (temporária para a demonstração). */
const APP_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() || null;
/**
 * Servidor intermediário (server/ai-proxy) que guarda a chave. Com ele
 * configurado, o app não leva chave nenhuma: é o caminho para as lojas.
 * Ex.: https://elo-ia.seu-dominio.workers.dev/models
 */
const PROXY = process.env.NEXT_PUBLIC_AI_PROXY_URL?.trim().replace(/\/$/, "") || null;
export const MODELS = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.8-flash"];

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export class GeminiUnavailableError extends Error {}

export function getGeminiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_STORAGE) || APP_KEY;
}

export function setGeminiKey(key: string | null) {
  if (key) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
  window.dispatchEvent(new Event("elo-saude:gemini-key"));
}

/** false quando a pessoa desligou a leitura por IA (LGPD): nada é enviado à Gemini. */
export function aiConsented(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("elo-saude:ia-consent") !== "nao";
}

export function geminiConfigured(): boolean {
  return Boolean(PROXY || getGeminiKey()) && aiConsented();
}

export async function generateJson<T>(opts: {
  system: string;
  parts: GeminiPart[];
  schema: object;
  timeoutMs?: number;
}): Promise<{ data: T; model: string }> {
  if (!aiConsented()) throw new GeminiUnavailableError("Leitura por IA desligada nas Configurações");
  const key = PROXY ? "" : getGeminiKey();
  if (!PROXY && !key) throw new GeminiUnavailableError("Chave da Gemini não configurada");

  const errors: string[] = [];
  for (const model of MODELS) {
    try {
      return { data: await attempt<T>(model, key, opts), model };
    } catch (err) {
      const msg = `${model}: ${(err as Error).message}`;
      console.warn("[gemini]", msg.slice(0, 200));
      errors.push(msg);
      // Chave inválida: não adianta tentar outro modelo.
      if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) break;
    }
  }
  throw new GeminiUnavailableError(errors.join(" | "));
}

async function attempt<T>(
  model: string,
  key: string | null,
  opts: { system: string; parts: GeminiPart[]; schema: object; timeoutMs?: number },
): Promise<T> {
  // Com o servidor intermediário, a chave fica nele e não vai para o aparelho
  const url = `${PROXY ?? API}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: PROXY ? { "Content-Type": "application/json" } : { "Content-Type": "application/json", "x-goog-api-key": key ?? "" },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 40_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: opts.parts }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: opts.schema,
        thinkingConfig: { thinkingLevel: "low" },
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${body?.error?.message ?? ""}`.trim());
  const text: string | undefined = body?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new Error(`resposta vazia (${body?.candidates?.[0]?.finishReason ?? "sem candidato"})`);
  return JSON.parse(text) as T;
}

/** Teste rápido da chave, usado na tela de Configurações. */
export async function testGeminiKey(): Promise<{ ok: true; model: string } | { ok: false; error: string }> {
  try {
    const { model } = await generateJson<{ ok: boolean }>({
      system: "Responda apenas o JSON pedido.",
      parts: [{ text: 'Responda {"ok": true}' }],
      schema: { type: "OBJECT", properties: { ok: { type: "BOOLEAN" } }, required: ["ok"] },
      timeoutMs: 20_000,
    });
    return { ok: true, model };
  } catch (err) {
    const msg = (err as Error).message;
    return { ok: false, error: /API key not valid|API_KEY_INVALID/i.test(msg) ? "Chave inválida." : "Não foi possível falar com a Gemini agora." };
  }
}
