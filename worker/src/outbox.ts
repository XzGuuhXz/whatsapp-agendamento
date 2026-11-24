import type { WASocket } from "baileys";
import { supabase } from "./supabase.js";

type OutboxReply = {
  id: number;
  phone: string;
  content: string;
  claim_token: string;
};

export async function flushOutbox(socket: WASocket, limit = 10): Promise<number> {
  let sent = 0;

  for (let index = 0; index < limit; index += 1) {
    const { data, error } = await supabase.rpc("chatbot_claim_reply", {
      p_phone: null,
    });

    if (error) throw new Error(`chatbot_claim_reply falhou: ${error.code ?? "erro"}`);

    const reply = (data?.[0] ?? null) as OutboxReply | null;
    if (!reply) break;

    try {
      const jid = `${reply.phone}@s.whatsapp.net`;
      const result = await socket.sendMessage(jid, { text: reply.content });
      if (!result?.key?.id) throw new Error("Baileys não retornou o ID da mensagem enviada.");

      const { error: finishError } = await supabase.rpc("chatbot_finish_reply", {
        p_id: reply.id,
        p_claim: reply.claim_token,
        p_whatsapp_id: `baileys:${result.key.id}`,
        p_error: null,
      });

      if (finishError) throw new Error(`chatbot_finish_reply falhou: ${finishError.code ?? "erro"}`);
      sent += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Falha de envio Baileys";
      const { error: finishError } = await supabase.rpc("chatbot_finish_reply", {
        p_id: reply.id,
        p_claim: reply.claim_token,
        p_whatsapp_id: null,
        p_error: reason.slice(0, 200),
      });

      if (finishError) {
        console.error("Não foi possível registrar a falha da outbox:", finishError.code);
      }
      throw error;
    }
  }

  return sent;
}
