import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { backupAuthToDB } from "./sqlAuthMirror.js";
import logger from "../utils/logger.js";
import { setSessionSock, removeSessionSock } from "./sessionManager.js";

export async function createBaileysClient({
  sessionId,
  io,
  authBase,
  onStatus,
}) {
  try {
    //console.log("sessionId ", sessionId)
    const authDir = path.join(authBase, sessionId);
    let isConnected = false;
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    const { version } = await fetchLatestBaileysVersion();
    logger.info({ version }, "Versión Baileys actualizada");

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ["Windows", "Edge", "120.0.0.0"],
      connectTimeoutMs: 60000,
    });

    // Guardar cambios de credenciales
    sock.ev.on("creds.update", async () => {
      await saveCreds();
      await backupAuthToDB(sessionId, authDir, "Inactive");
    });

    // Evento principal de conexión
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // 🔹 Emitir QR al cliente
      // if (qr) {
      //   const qrBase64 = await qrcode.toDataURL(qr);
      //   io?.emit(`qr-${sessionId}`, qrBase64);
      //   onStatus?.('waiting_qr');
      //   logger.info({ sessionId }, '📲 QR emitido al cliente');
      // }

      if (qr && !isConnected) {
        const qrBase64 = await qrcode.toDataURL(qr);
        io.emit(`qr-${sessionId}`, qrBase64);
        onStatus?.('waiting_qr');
        console.log("QR emitido");
      }
      // 🔹 Sesión conectada
      if (connection === "open") {
        isConnected = true;
        setSessionSock(sessionId, sock);
        io?.emit(`session-active-${sessionId}`);
        onStatus?.("connected");
        logger.info({ sessionId }, "Sesión conectada");
        await backupAuthToDB(sessionId, authDir, "Active");
        //sock.ev.removeAllListeners('connection.update'); // Evita que Baileys siga mandando QR fantasmas.
      }

      // 🔹 Sesión cerrada
      if (connection === "close") {
        removeSessionSock(sessionId);
        isConnected = false;
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || "unknown";
        logger.warn({ sessionId, code, reason }, " Conexión cerrada");

        // Evitar duplicación de eventos
        if (sock.__closingHandled) return;
        sock.__closingHandled = true;

        const invalidSession =
          reason === DisconnectReason.loggedOut ||
          code === 401 ||
          reason.includes("logged out");

        if (invalidSession) {
          console.log(
            "Sesión cerrada desde el teléfono. Esperando para limpiar...",
          );

          // Darle tiempo a Baileys para liberar los archivos
          setTimeout(() => {
            try {
              if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true });
                console.log(`Carpeta eliminada correctamente: ${authDir}`);
              } else {
                console.log(
                  "Carpeta ya no existe, no hay nada que eliminar",
                );
              }
            } catch (err) {
              console.error("Error al eliminar carpeta:", err.message);
            }

            io?.emit(`session-inactive-${sessionId}`, { reason: "logged_out" });
            onStatus?.("inactive");

            // Volver a generar QR automáticamente
            console.log(`Reintentando crear sesión ${sessionId}...`);
            createBaileysClient({ sessionId, io, authBase, onStatus });
          }, 2000); // espera 2 segundos antes de eliminar y recrear
          return;
        }
        await backupAuthToDB(sessionId, authDir, "Inactive");

        // Reintento automático si fue desconexión temporal
        io?.emit(`session-inactive-${sessionId}`, {
          reason: "connection_closed",
        });
        onStatus?.("inactive");
        setTimeout(
          () => createBaileysClient({ sessionId, io, authBase, onStatus }),
          5000,
        );
      }
    });

    return { stop: () => sock?.end?.() };
  } catch (err) {
    logger.error(err);
    throw err;
  }
}
