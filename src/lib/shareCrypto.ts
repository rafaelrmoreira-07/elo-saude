/**
 * Proteção do link do médico com código de acesso.
 *
 * O link leva os dados no fragmento (#e=...), cifrados com AES-GCM de 256 bits.
 * A chave vem do código de acesso (8 caracteres) por PBKDF2-SHA-256 com 600 mil
 * iterações e sal aleatório. Quem tiver só o link não lê nada: o paciente passa
 * o código ao médico por outro canal (falando, ou numa mensagem separada).
 *
 * Formato: base64url( versão(1) | sal(16) | iv(12) | dados cifrados ).
 */

const ITERATIONS = 600_000;
/** Sem letras e números que se confundem (0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const VERSION = 1;

/** Código como "K7M4-PX9Q": 31^8 combinações (cerca de 850 bilhões). */
export function newAccessCode(): string {
  const out: string[] = [];
  const max = 256 - (256 % ALPHABET.length); // evita viés
  while (out.length < 8) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b < max && out.length < 8) out.push(ALPHABET[b % ALPHABET.length]);
    }
  }
  return `${out.slice(0, 4).join("")}-${out.slice(4).join("")}`;
}

/** Aceita o código digitado com ou sem hífen, espaços e minúsculas. */
export function normalizeCode(code: string): string {
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

async function deriveKey(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(normalizeCode(code)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptWithCode(plain: Uint8Array, code: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain as BufferSource));
  const out = new Uint8Array(1 + salt.length + iv.length + cipher.length);
  out[0] = VERSION;
  out.set(salt, 1);
  out.set(iv, 17);
  out.set(cipher, 29);
  return out;
}

export class WrongCodeError extends Error {}

export async function decryptWithCode(data: Uint8Array, code: string): Promise<Uint8Array> {
  if (data[0] !== VERSION || data.length < 30) throw new Error("link em formato desconhecido");
  const key = await deriveKey(code, data.slice(1, 17));
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(17, 29) }, key, data.slice(29)));
  } catch {
    throw new WrongCodeError("Código incorreto.");
  }
}
