import { normalizeMessageContent, type WAMessage } from "baileys";
import { supabase } from "./supabase.js";

function getText(message: WAMessage): string | null {
  const content = normalizeMessageContent(message.message);
  const text = content?.conversation ?? content?.extendedTextMessage?.text;
  return typeof text === "string" ? text.slice(0, 4096) : null;
}

export async function handleIncoming(message: WAMessage): Promise<void> {
  if (message.key.fromMe) return;

  const jid = message.key.remoteJid;
  const id = message.key.id;
  if (!jid || !id) return;

  // O schema atual trabalha com telefones em dígitos. Não convertemos LIDs,
  // grupos, canais ou status por suposição.
  if (!jid.endsWith("@s.whatsapp.net")) {
    if (jid.endsWith("@lid")) {
      console.warn("Mensagem LID ignorada: mapeamento de identidade ainda não configurado.");
    }
    return;
  }

  const phone = jid.slice(0, jid.length - "@s.whatsapp.net".length);
  if (!/^\d{8,15}$/.test(phone)) return;

  const text = getText(message);
  if (text === null) return;

  const { error } = await supabase.rpc("chatbot_receive", {
    p_message_id: `baileys:${id}`,
    p_phone: phone,
    p_text: text,
    p_name: (message.pushName || "Cliente WhatsApp").slice(0, 100),
    p_timezone: process.env.BUSINESS_TIMEZONE?.trim() || "America/Campo_Grande",
  });

  if (error) {
    throw new Error(`chatbot_receive falhou: ${error.code ?? "erro"}`);
  }
}
