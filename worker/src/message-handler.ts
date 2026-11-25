import { normalizeMessageContent, type WAMessage } from "baileys";
import { supabase } from "./supabase.js";

type LidResolver = (lid: string) => Promise<string | null>;

function getText(message: WAMessage): string | null {
  const content = normalizeMessageContent(message.message);
  const text = content?.conversation ?? content?.extendedTextMessage?.text;
  return typeof text === "string" ? text.slice(0, 4096) : null;
}

function getPhoneFromPnJid(jid: string | undefined): string | null {
  if (!jid) return null;

  // Baileys pode fornecer JIDs com sufixo de dispositivo, por exemplo
  // 5511999999999:1@s.whatsapp.net. O banco armazena apenas os dígitos do telefone.
  const match = /^(\d{8,15})(?::\d+)?@s\.whatsapp\.net$/.exec(jid);
  return match?.[1] ?? null;
}

async function resolveSenderPhone(
  message: WAMessage,
  resolveLid?: LidResolver,
): Promise<string | null> {
  const remoteJid = message.key.remoteJid;
  if (!remoteJid) return null;

  const directPhone = getPhoneFromPnJid(remoteJid);
  if (directPhone) return directPhone;

  // Em conversas endereçadas por LID, o WhatsApp pode incluir o JID PN
  // alternativo na própria chave da mensagem. Preferimos essa informação
  // explícita antes de consultar o armazenamento de mapeamentos do Baileys.
  if (remoteJid.endsWith("@lid")) {
    const alternatePhone = getPhoneFromPnJid(message.key.remoteJidAlt);
    if (alternatePhone) return alternatePhone;

    if (resolveLid) {
      try {
        const mappedPnJid = await resolveLid(remoteJid);
        const mappedPhone = getPhoneFromPnJid(mappedPnJid ?? undefined);
        if (mappedPhone) return mappedPhone;
      } catch (error) {
        console.warn(
          "Não foi possível consultar o mapeamento LID:",
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.warn(
      "Mensagem LID recebida, mas ainda sem número PN correspondente. Mensagem não encaminhada.",
    );
  }

  return null;
}

export async function handleIncoming(
  message: WAMessage,
  resolveLid?: LidResolver,
): Promise<void> {
  if (message.key.fromMe) return;

  const remoteJid = message.key.remoteJid;
  const id = message.key.id;
  if (!remoteJid || !id) return;

  // O worker atende somente conversas individuais. Não tenta converter
  // grupos, canais, status ou outros domínios em números de telefone.
  if (
    remoteJid.endsWith("@g.us") ||
    remoteJid.endsWith("@broadcast") ||
    remoteJid === "status@broadcast"
  ) {
    return;
  }

  const phone = await resolveSenderPhone(message, resolveLid);
  if (!phone) return;

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

  console.log("Mensagem recebida e encaminhada ao chatbot.");
}
