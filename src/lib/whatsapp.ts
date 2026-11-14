import { formatDateTime } from "./dates";

/**
 * Link do WhatsApp com a mensagem pronta para o médico (wa.me abre o app no
 * celular e o WhatsApp Web no computador; a pessoa escolhe o contato).
 * Não usa a API do WhatsApp: nada é enviado sem a pessoa tocar em "Enviar".
 */
/** O código de acesso nunca vai na mesma mensagem do link. */
export function whatsappDoctorUrl(doctorName: string, expiresAt: string, link: string, hasCode = false): string {
  const name = doctorName.trim();
  const greeting = /^(dr|dra|doutor|doutora)\b\.?/i.test(name) ? `Olá, ${name}.` : `Olá, Dr(a). ${name}.`;
  const text = `${greeting} Segue o acesso ao meu histórico de saúde pelo Elo Saúde, válido até ${formatDateTime(expiresAt)}:\n${link}${hasCode ? "\nO código de acesso eu te passo à parte." : ""}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
