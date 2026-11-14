/**
 * Servidor intermediário da IA do Elo Saúde (Cloudflare Workers).
 *
 * O app não leva a chave da Gemini: chama este servidor, que confere a origem,
 * o modelo e o tamanho do pedido, acrescenta a chave (guardada como segredo) e
 * repassa ao Google. Não guarda nem registra o conteúdo dos laudos.
 *
 * Variáveis (wrangler.toml / painel da Cloudflare):
 *   GEMINI_API_KEY   segredo: `npx wrangler secret put GEMINI_API_KEY`
 *   ALLOWED_ORIGINS  origens aceitas, separadas por vírgula
 *                    ex.: https://rafaelrmoreira-07.github.io,capacitor://localhost,https://localhost
 *
 * Limite de pedidos por IP: configure uma regra de "Rate limiting" no painel da
 * Cloudflare para este endereço (ex.: 30 pedidos por minuto por IP).
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELS = new Set(["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.8-flash"]);
const MAX_BYTES = 15 * 1024 * 1024; // laudo em PDF ou foto, em base64

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function reply(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...(origin ? cors(origin) : {}) },
  });
}

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!allowed.includes(origin)) return reply(403, { error: { message: "origem não autorizada" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "POST") return reply(405, { error: { message: "método não aceito" } }, origin);

    // Caminho esperado: /models/<modelo>:generateContent
    const m = new URL(request.url).pathname.match(/^\/models\/([a-z0-9.\-]+):generateContent$/);
    if (!m || !MODELS.has(m[1])) return reply(404, { error: { message: "modelo não aceito" } }, origin);

    const size = Number(request.headers.get("Content-Length") ?? 0);
    if (size > MAX_BYTES) return reply(413, { error: { message: "arquivo grande demais" } }, origin);
    const body = await request.text();
    if (body.length > MAX_BYTES) return reply(413, { error: { message: "arquivo grande demais" } }, origin);

    const upstream = await fetch(`${API}/${m[1]}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(origin) },
    });
  },
};

export default worker;
