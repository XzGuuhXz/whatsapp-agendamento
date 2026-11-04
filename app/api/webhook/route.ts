import { NextRequest, NextResponse } from "next/server";
import { extractMessages, validSignature } from "@/lib/whatsapp";
import { flushOutbox, receiveMessage } from "@/lib/chatbot";
import { requiredEnv } from "@/lib/env";
export const runtime = "nodejs";
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (!expected) return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  if (params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === expected && params.get("hub.challenge")) {
    return new NextResponse(params.get("hub.challenge"), { status: 200 });
  }
  return NextResponse.json({ error: "Verificação inválida" }, { status: 403 });
}
export async function POST(request: NextRequest) {
  try {
    const secret = requiredEnv("WHATSAPP_APP_SECRET");
    const phoneId = requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
    const body = Buffer.from(await request.arrayBuffer());
    if (body.length > 1_048_576) return NextResponse.json({ error: "Payload muito grande" }, { status: 413 });
    if (!validSignature(body, request.headers.get("x-hub-signature-256"), secret)) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
    let payload: unknown;
    try { payload = JSON.parse(body.toString("utf8")); }
    catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
    const messages = extractMessages(payload, phoneId);
    for (const message of messages) await receiveMessage(message);
    for (const phone of new Set(messages.map(message => message.phone))) await flushOutbox(phone);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Falha no webhook", error instanceof Error ? error.message : "Erro interno");
    return NextResponse.json({ error: "Falha temporária" }, { status: 503 });
  }
}
