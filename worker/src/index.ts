import { DisconnectReason, type WASocket } from "baileys";
import { connectBaileys } from "./connection.js";
import { flushOutbox } from "./outbox.js";

if (process.env.WHATSAPP_TRANSPORT?.trim().toLowerCase() !== "baileys") {
  throw new Error("Worker não iniciado: defina WHATSAPP_TRANSPORT=baileys no ambiente.");
}

let stopping = false;
let activeSocket: WASocket | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runOutboxLoop(): Promise<void> {
  while (!stopping) {
    if (activeSocket) {
      try {
        const sent = await flushOutbox(activeSocket, 10);
        if (sent > 0) console.log(`Respostas enviadas: ${sent}`);
      } catch (error) {
        console.error("Falha ao processar a fila de respostas:", error instanceof Error ? error.message : error);
      }
    }
    await sleep(1500);
  }
}

const shutdown = () => {
  if (stopping) return;
  stopping = true;
  activeSocket?.end(undefined);
  console.log("Encerrando worker...");
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

async function main(): Promise<void> {
  const outboxTask = runOutboxLoop();

  while (!stopping) {
    try {
      activeSocket = await connectBaileys();
      const closeStatus = await new Promise<number | undefined>((resolve) => {
        activeSocket!.ev.on("connection.update", ({ connection, lastDisconnect }) => {
          if (connection === "close") {
            const status = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
              ?.output?.statusCode;
            resolve(status);
          }
        });
      });

      activeSocket = null;
      if (closeStatus === DisconnectReason.loggedOut) {
        stopping = true;
        throw new Error("Sessão desconectada pelo WhatsApp. É necessária uma nova autenticação.");
      }
    } catch (error) {
      activeSocket = null;
      console.error("Conexão Baileys:", error instanceof Error ? error.message : error);
      if (stopping) break;
    }

    if (!stopping) {
      console.log("Nova tentativa de conexão em 5 segundos...");
      await sleep(5000);
    }
  }

  stopping = true;
  await outboxTask;
}

void main().catch((error) => {
  console.error("Erro fatal no worker:", error);
  process.exitCode = 1;
});
