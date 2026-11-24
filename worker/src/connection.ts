import makeWASocket, {
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
} from "baileys";
import { mkdir, chmod } from "node:fs/promises";
import path from "node:path";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { handleIncoming } from "./message-handler.js";

const logger = pino({ level: process.env.LOG_LEVEL?.trim() || "info" });
const authDirectory = path.resolve(
  process.env.BAILEYS_AUTH_DIR?.trim() || "./.baileys-auth",
);

export async function connectBaileys(): Promise<WASocket> {
  process.umask(0o077);
  await mkdir(authDirectory, { recursive: true, mode: 0o700 });
  await chmod(authDirectory, 0o700);

  const { state, saveCreds } = await useMultiFileAuthState(authDirectory);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("Leia este QR Code pelo WhatsApp > Aparelhos conectados:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("Baileys conectado ao WhatsApp.");
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
        ?.output?.statusCode;
      console.warn("Conexão Baileys encerrada. Código:", statusCode ?? "indisponível");
    }
  });

  socket.ev.on("messages.upsert", async ({ type, messages }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      try {
        await handleIncoming(message);
      } catch (error) {
        console.error("Falha ao processar mensagem recebida:", error);
      }
    }
  });

  return socket;
}
