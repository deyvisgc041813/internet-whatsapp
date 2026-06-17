// import makeWASocket, {
//   useMultiFileAuthState,
//   DisconnectReason,
//   Browsers,
//   fetchLatestBaileysVersion
// } from "baileys";
// import qrcode from "qrcode";
// import { Boom } from "@hapi/boom";
// import { backupAuthToDB } from "../whatsapp/sqlAuthMirror.js";
// const sessions = new Map();
// import logger from "../utils/logger.js";
// import pino from "pino";

// // const baileysLogger = pino({
// //   level: "silent",
// // });

// /**
//  * Obtiene o inicializa una entrada de sesión.
//  */
// function getOrInitEntry(sessionId) {
//   if (!sessions.has(sessionId)) {
//     sessions.set(sessionId, {
//       sock: null,
//       status: "idle", // idle | connecting | qr | open | close | logged_out | error_405
//       readyPromise: null,
//       readyResolve: null,
//       readyReject: null,
//       creatingPromise: null,
//       reconnecting: false
//     });
//   }

//   return sessions.get(sessionId);
// }

// /**
//  * Crea promesa de espera si no existe.
//  */
// function setReadyPromise(entry) {
//   if (!entry.readyPromise) {
//     entry.readyPromise = new Promise((resolve, reject) => {
//       entry.readyResolve = resolve;
//       entry.readyReject = reject;
//     });
//   }
// }

// /**
//  * Resuelve espera cuando WhatsApp conecta.
//  */
// function resolveReady(entry) {
//   if (entry.readyResolve) {
//     entry.readyResolve(true);
//   }

//   entry.readyPromise = null;
//   entry.readyResolve = null;
//   entry.readyReject = null;
// }

// /**
//  * Rechaza espera solo en errores definitivos.
//  */
// function rejectReady(entry, error) {
//   if (entry.readyReject) {
//     entry.readyReject(error);
//   }

//   entry.readyPromise = null;
//   entry.readyResolve = null;
//   entry.readyReject = null;
// }

// /**
//  * Espera hasta que la sesión esté lista para enviar mensajes.
//  */
// async function waitUntilSendReady(entry, timeoutMs = 30000) {
//   if (entry.status === "open" && entry.sock?.user) {
//     await new Promise((resolve) => setTimeout(resolve, 300));
//     return;
//   }

//   setReadyPromise(entry);

//   const timeout = new Promise((_, reject) => {
//     setTimeout(() => {
//       reject(new Error("Timeout esperando WhatsApp conectado"));
//     }, timeoutMs);
//   });

//   await Promise.race([entry.readyPromise, timeout]);

//   await new Promise((resolve) => setTimeout(resolve, 300));
// }

// /**
//  * Crea socket Baileys.
//  */
// async function createSocket(sessionId, entry, manager = {}) {
//   entry.status = "connecting";
//   entry.reconnecting = false;

//   setReadyPromise(entry);

//   const authBase = manager.authBase || "./auth";
//   const authPath = `${authBase}/${sessionId}`;

//   const { state, saveCreds } = await useMultiFileAuthState(authPath);

//   /**
//    * MUY IMPORTANTE:
//    * Esto evita usar una versión vieja de WhatsApp Web.
//    */
//   const { version, isLatest } = await fetchLatestBaileysVersion();

//   console.log("=================================");
//   console.log("Creando sesión:", sessionId);
//   console.log("Auth path:", authPath);
//   console.log("Baileys version:", version);
//   console.log("Baileys isLatest:", isLatest);
//   console.log("=================================");

//   // const sock = makeWASocket({
//   //   auth: state,
//   //   version,
//   //   browser: Browsers.ubuntu("Chrome"),
//   //   syncFullHistory: false,
//   //   markOnlineOnConnect: false
//   // });
//   const baileysLogger = pino({
//     level: "silent"
//   });

//   const sock = makeWASocket({
//     auth: state,
//     version,
//     browser: Browsers.ubuntu("Chrome"),
//     logger: baileysLogger,
//     syncFullHistory: false,
//     markOnlineOnConnect: false,
//     shouldSyncHistoryMessage: () => false,
//   });
//   // const sock = makeWASocket({
//   //   auth: state,
//   //   version,
//   //   browser: Browsers.ubuntu("Chrome"),
//   //   syncFullHistory: false,
//   //   markOnlineOnConnect: false,
//   //   logger: baileysLogger
//   // });
//   entry.sock = sock;

//   //sock.ev.on("creds.update", saveCreds);
//   sock.ev.on("creds.update", async () => {
//     await saveCreds();
//     await backupAuthToDB(sessionId, authPath, "Inactive");
//   });


//   sock.ev.on("connection.update", async (update) => {
//     const {
//       connection,
//       qr,
//       lastDisconnect,
//       isNewLogin,
//       receivedPendingNotifications
//     } = update;
//     const session = sessions.get(sessionId);
//     if (!session) return;
//     console.log("=================================");
//     console.log("SESSION:", sessionId);
//     console.log("connection:", connection);
//     console.log("qr:", qr ? "SI HAY QR" : "NO HAY QR");
//     console.log("isNewLogin:", isNewLogin);
//     console.log("receivedPendingNotifications:", receivedPendingNotifications);
//     console.log("lastDisconnect:", lastDisconnect?.error);
//     console.log("=================================");
//     let isConnected = false;
//     /**
//      * QR generado.
//      * El QR se envía al frontend por socket.
//      */
//     if (qr) {
//       entry.status = "qr";
//       if (qr && !isConnected) {
//         const qrBase64 = await qrcode.toDataURL(qr);
//         manager.io?.emit(`qr-${sessionId}`, qrBase64);
//         console.log("QR generado. Escanea el código para vincular WhatsApp");
//       }
//       // manager.io?.emit("whatsapp:qr", {
//       //   sessionId,
//       //   qr
//       // });

//       // manager.io?.emit("whatsapp:status", {
//       //   sessionId,
//       //   status: "qr",
//       //   message: "QR generado. Escanea el código para vincular WhatsApp."
//       // });
//       console.log(`QR generado para sesión: ${sessionId}`);
//     }


//     if (connection === "open") {
//       isConnected = true
//       entry.status = "open";
//       entry.sock = sock;
//       entry.creatingPromise = null;
//       entry.reconnecting = false;
//       resolveReady(entry);
//       setSessionSock(sessionId, sock);
//       manager.io?.emit(`session-active-${sessionId}`);
//       //onStatus?.("connected");
//       logger.info({ sessionId }, "Sesión conectada");
//       await backupAuthToDB(sessionId, authPath, "Active");
//       console.log(`WhatsApp conectado correctamente: ${sessionId}`);
//     }

//     /**
//      * WhatsApp cerró conexión.
//      */
//     if (connection === "close") {
//       const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
//       isConnected = false;
//       console.log(`WhatsApp cerrado para sesión: ${sessionId}`);
//       console.log("Código cierre:", statusCode);
//       console.log("Error cierre:", lastDisconnect?.error);

//       entry.sock = null;
//       entry.status = "close";
//       entry.creatingPromise = null;

//       /**
//        * ERROR 405:
//        * WhatsApp rechazó la conexión antes de generar QR.
//        * No conviene reintentar infinito.
//        */
//       if (statusCode === 405) {
//         entry.status = "error_405";
//         entry.reconnecting = false;

//         rejectReady(
//           entry,
//           new Error(
//             "WhatsApp rechazó la conexión con código 405. Actualiza Baileys, borra la sesión y vuelve a intentar."
//           )
//         );

//         manager.io?.emit("whatsapp:status", {
//           sessionId,
//           status: "error_405",
//           message:
//             "WhatsApp rechazó la conexión. Actualiza Baileys, borra la sesión y vuelve a vincular."
//         });

//         console.log("Error 405 detectado. No se reintentará automáticamente.");
//         return;
//       }

//       /**
//        * Sesión cerrada definitivamente.
//        */
//       const isLoggedOut = statusCode === DisconnectReason.loggedOut;

//       if (isLoggedOut) {
//         entry.status = "logged_out";
//         entry.reconnecting = false;

//         rejectReady(
//           entry,
//           new Error("Sesión cerrada. Debes escanear el QR nuevamente.")
//         );

//         manager.io?.emit("whatsapp:status", {
//           sessionId,
//           status: "logged_out",
//           message: "Sesión cerrada. Debes escanear el QR nuevamente."
//         });

//         console.log(`Sesión cerrada definitivamente: ${sessionId}`);
//         return;
//       }

//       /**
//        * Cierre temporal.
//        */
//       manager.io?.emit(`session-inactive-${sessionId}`, {
//         sessionId,
//         status: "close",
//         message: "Conexión cerrada temporalmente. Reintentando..."
//       });
//       console.log("Conexión cerrada temporalmente.");
//       /**
//        * Evita múltiples reconexiones al mismo tiempo.
//        */
//       if (!entry.reconnecting) {
//         entry.reconnecting = true;

//         setTimeout(() => {
//           console.log(`Reintentando sesión: ${sessionId}`);

//           const currentEntry = getOrInitEntry(sessionId);

//           if (
//             !currentEntry.sock &&
//             currentEntry.status !== "logged_out" &&
//             currentEntry.status !== "error_405"
//           ) {
//             currentEntry.creatingPromise = createSocket(
//               sessionId,
//               currentEntry,
//               manager
//             ).catch((error) => {
//               console.error(`Error recreando sesión ${sessionId}:`, error);
//               currentEntry.creatingPromise = null;
//               currentEntry.reconnecting = false;
//             });
//           }
//         }, 5000);
//       }
//       await backupAuthToDB(sessionId, authPath, "Inactive"); 
//     }
//   });

//   return sock;
// }

// /**
//  * Registra manualmente un socket.
//  */
// export function setSessionSock(sessionId, sock) {
//   if (!sessionId || !sock) return;

//   const entry = getOrInitEntry(sessionId);

//   entry.sock = sock;
//   entry.status = "open";

//   console.log(`Sesión registrada manualmente: ${sessionId}`);
// }

// /**
//  * Obtiene o crea una sesión.
//  * Usa lock para evitar sockets duplicados.
//  */
// export async function getSessionSock(sessionId, manager = {}) {
//   if (!sessionId) return null;

//   const entry = getOrInitEntry(sessionId);

//   /**
//    * Si hay socket existente, lo retorna.
//    */
//   if (entry.sock) {
//     await waitUntilSendReady(entry).catch((error) => {
//       console.warn(`Sesión ${sessionId} aún no está lista:`, error.message);
//     });

//     return entry.sock;
//   }

//   /**
//    * Si se está creando, espera el mismo proceso.
//    */
//   if (entry.creatingPromise) {
//     await entry.creatingPromise.catch((error) => {
//       console.warn(`Creación previa falló para ${sessionId}:`, error.message);
//     });

//     return entry.sock;
//   }

//   /**
//    * Crear socket una sola vez.
//    */
//   entry.creatingPromise = createSocket(sessionId, entry, manager);

//   await entry.creatingPromise.catch((error) => {
//     console.error(`Error creando sesión ${sessionId}:`, error.message);
//     entry.creatingPromise = null;
//   });

//   return entry.sock;
// }

// /**
//  * Espera explícitamente a que una sesión esté lista.
//  */
// export async function waitSessionReady(sessionId, timeoutMs = 30000) {
//   const entry = getOrInitEntry(sessionId);

//   await waitUntilSendReady(entry, timeoutMs);

//   return entry.sock;
// }

// /**
//  * Fuerza reinicio de una sesión.
//  */
// export async function recreateSession(sessionId, manager = {}) {
//   const entry = getOrInitEntry(sessionId);

//   try {
//     entry.sock?.end?.();
//   } catch (error) {
//     console.warn(`Error cerrando socket ${sessionId}:`, error.message);
//   }

//   entry.sock = null;
//   entry.status = "idle";
//   entry.creatingPromise = null;
//   entry.readyPromise = null;
//   entry.readyResolve = null;
//   entry.readyReject = null;
//   entry.reconnecting = false;

//   return await getSessionSock(sessionId, manager);
// }
// async function getReadySock(sessionId) {
//   const session = sessions.get(sessionId);

//   if (!session) {
//     return null;
//   }

//   if (session.status === "open" && session.sock) {
//     return session.sock;
//   }

//   if (session.status === "connecting") {
//     return await waitUntilOpen(sessionId, 20000);
//   }

//   if (session.status === "close") {
//     await recreateSession(sessionId);
//     return await waitUntilOpen(sessionId, 20000);
//   }

//   return null;
// }
// function waitUntilOpen(sessionId, timeoutMs = 20000) {
//   return new Promise((resolve, reject) => {
//     const startedAt = Date.now();

//     const interval = setInterval(() => {
//       const session = sessions.get(sessionId);

//       if (session?.status === "open" && session?.sock) {
//         clearInterval(interval);
//         return resolve(session.sock);
//       }

//       if (Date.now() - startedAt > timeoutMs) {
//         clearInterval(interval);
//         return reject(
//           new Error(`La sesión '${sessionId}' no conectó dentro del tiempo esperado`)
//         );
//       }
//     }, 500);
//   });
// }
// /**
//  * Elimina una sesión.
//  */
// export function removeSessionSock(sessionId) {
//   if (!sessionId) return;

//   const entry = sessions.get(sessionId);

//   if (entry?.sock) {
//     try {
//       entry.sock.end?.();
//     } catch (error) {
//       console.warn(`Error cerrando sesión ${sessionId}:`, error.message);
//     }
//   }

//   sessions.delete(sessionId);

//   console.log(`Sesión eliminada: ${sessionId}`);
// }

// /**
//  * Lista sesiones registradas.
//  */
// export function listActiveSessions() {
//   return Array.from(sessions.keys());
// }

// /**
//  * Verifica si una sesión está activa.
//  */
// export function isSessionActive(sessionId) {
//   if (!sessionId) return false;

//   const entry = sessions.get(sessionId);

//   return !!entry?.sock && entry.status === "open";
// }

// /**
//  * Obtiene estado de una sesión.
//  */
// export function getSessionStatus(sessionId) {
//   const entry = sessions.get(sessionId);

//   if (!entry) {
//     return {
//       sessionId,
//       status: "not_found",
//       active: false
//     };
//   }

//   return {
//     sessionId,
//     status: entry.status,
//     active: !!entry.sock && entry.status === "open"
//   };
// }

// /**
//  * Limpia todas las sesiones.
//  */
// export function clearAllSessions() {
//   for (const [sessionId, entry] of sessions.entries()) {
//     try {
//       entry.sock?.end?.();
//     } catch (error) {
//       console.warn(`Error cerrando sesión ${sessionId}:`, error.message);
//     }
//   }

//   sessions.clear();

//   console.log("Todas las sesiones han sido limpiadas");
// }

// export default {
//   setSessionSock,
//   getSessionSock,
//   waitSessionReady,
//   recreateSession,
//   removeSessionSock,
//   listActiveSessions,
//   isSessionActive,
//   getSessionStatus,
//   clearAllSessions
// };



import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} from "baileys";

import qrcode from "qrcode";
import { Boom } from "@hapi/boom";
import { backupAuthToDB } from "../whatsapp/sqlAuthMirror.js";
import logger from "../utils/logger.js";
import pino from "pino";

const sessions = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Obtiene o inicializa una entrada de sesión.
 */
function getOrInitEntry(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sock: null,
      status: "idle", // idle | connecting | qr | open | close | logged_out | error_405
      readyPromise: null,
      readyResolve: null,
      readyReject: null,
      creatingPromise: null,
      reconnecting: false,
    });
  }

  return sessions.get(sessionId);
}

/**
 * Crea promesa de espera si no existe.
 */
function setReadyPromise(entry) {
  if (!entry.readyPromise) {
    entry.readyPromise = new Promise((resolve, reject) => {
      entry.readyResolve = resolve;
      entry.readyReject = reject;
    });
  }
}

/**
 * Resuelve espera cuando WhatsApp conecta.
 */
function resolveReady(entry) {
  if (entry.readyResolve) {
    entry.readyResolve(true);
  }

  entry.readyPromise = null;
  entry.readyResolve = null;
  entry.readyReject = null;
}

/**
 * Rechaza espera solo en errores definitivos.
 */
function rejectReady(entry, error) {
  if (entry.readyReject) {
    entry.readyReject(error);
  }

  entry.readyPromise = null;
  entry.readyResolve = null;
  entry.readyReject = null;
}

/**
 * Espera hasta que la sesión esté lista para enviar mensajes.
 */
async function waitUntilSendReady(entry, timeoutMs = 30000) {
  if (entry.status === "open" && entry.sock?.user) {
    await sleep(300);
    return;
  }

  setReadyPromise(entry);

  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Timeout esperando WhatsApp conectado"));
    }, timeoutMs);
  });

  await Promise.race([entry.readyPromise, timeout]);

  await sleep(300);
}

/**
 * Espera hasta que una sesión esté realmente OPEN.
 */
function waitUntilOpen(sessionId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const interval = setInterval(() => {
      const session = sessions.get(sessionId);

      if (session?.status === "open" && session?.sock) {
        clearInterval(interval);
        return resolve(session.sock);
      }

      if (session?.status === "qr") {
        clearInterval(interval);
        return reject(
          new Error(`La sesión '${sessionId}' requiere escanear QR.`)
        );
      }

      if (session?.status === "logged_out") {
        clearInterval(interval);
        return reject(
          new Error(
            `La sesión '${sessionId}' fue cerrada. Debes escanear QR nuevamente.`
          )
        );
      }

      if (session?.status === "error_405") {
        clearInterval(interval);
        return reject(
          new Error(`La sesión '${sessionId}' tiene error 405.`)
        );
      }

      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(interval);
        return reject(
          new Error(
            `La sesión '${sessionId}' no conectó dentro del tiempo esperado.`
          )
        );
      }
    }, 500);
  });
}

/**
 * Crea socket Baileys.
 */
async function createSocket(sessionId, entry, manager = {}) {
  entry.status = "connecting";
  entry.reconnecting = false;

  setReadyPromise(entry);

  const authBase = manager.authBase || "./auth";
  const authPath = `${authBase}/${sessionId}`;

  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  /**
   * Evita usar una versión vieja de WhatsApp Web.
   */
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log("=================================");
  console.log("Creando sesión:", sessionId);
  console.log("Auth path:", authPath);
  console.log("Baileys version:", version);
  console.log("Baileys isLatest:", isLatest);
  console.log("=================================");

  const baileysLogger = pino({
    level: "silent",
  });

  const sock = makeWASocket({
    auth: state,
    version,
    browser: Browsers.ubuntu("Chrome"),
    logger: baileysLogger,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    shouldSyncHistoryMessage: () => false,
    keepAliveIntervalMs: 15000,
    connectTimeoutMs: 30000,
    defaultQueryTimeoutMs: 60000,
  });

  entry.sock = sock;

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    await backupAuthToDB(sessionId, authPath, "Inactive");
  });

  /**
   * Tus eventos se mantienen.
   */
  sock.ev.on("connection.update", async (update) => {
    const {
      connection,
      qr,
      lastDisconnect,
      isNewLogin,
      receivedPendingNotifications,
    } = update;

    const session = sessions.get(sessionId);
    if (!session) return;

    console.log("=================================");
    console.log("SESSION:", sessionId);
    console.log("connection:", connection);
    console.log("qr:", qr ? "SI HAY QR" : "NO HAY QR");
    console.log("isNewLogin:", isNewLogin);
    console.log("receivedPendingNotifications:", receivedPendingNotifications);
    console.log("lastDisconnect:", lastDisconnect?.error);
    console.log("=================================");

    let isConnected = false;

    /**
     * QR generado.
     * El QR se envía al frontend por socket.
     */
    if (qr) {
      entry.status = "qr";

      if (qr && !isConnected) {
        const qrBase64 = await qrcode.toDataURL(qr);
        manager.io?.emit(`qr-${sessionId}`, qrBase64);
        console.log("QR generado. Escanea el código para vincular WhatsApp");
      }

      console.log(`QR generado para sesión: ${sessionId}`);
    }

    if (connection === "open") {
      isConnected = true;
      entry.status = "open";
      entry.sock = sock;
      entry.creatingPromise = null;
      entry.reconnecting = false;

      resolveReady(entry);

      setSessionSock(sessionId, sock);

      manager.io?.emit(`session-active-${sessionId}`);

      logger.info({ sessionId }, "Sesión conectada");

      await backupAuthToDB(sessionId, authPath, "Active");

      console.log(`WhatsApp conectado correctamente: ${sessionId}`);
    }

    /**
     * WhatsApp cerró conexión.
     */
    if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;

      isConnected = false;

      console.log(`WhatsApp cerrado para sesión: ${sessionId}`);
      console.log("Código cierre:", statusCode);
      console.log("Error cierre:", lastDisconnect?.error);

      entry.sock = null;
      entry.status = "close";
      entry.creatingPromise = null;

      /**
       * ERROR 405.
       */
      if (statusCode === 405) {
        entry.status = "error_405";
        entry.reconnecting = false;
        removeSessionSock(sessionId);
        rejectReady(
          entry,
          new Error(
            "WhatsApp rechazó la conexión con código 405. Actualiza Baileys, borra la sesión y vuelve a intentar."
          )
        );

        manager.io?.emit("whatsapp:status", {
          sessionId,
          status: "error_405",
          message:
            "WhatsApp rechazó la conexión. Actualiza Baileys, borra la sesión y vuelve a vincular.",
        });

        console.log("Error 405 detectado. No se reintentará automáticamente.");
        return;
      }

      /**
       * Sesión cerrada definitivamente.
       */
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      if (isLoggedOut) {
        entry.status = "logged_out";
        entry.reconnecting = false;

        rejectReady(
          entry,
          new Error("Sesión cerrada. Debes escanear el QR nuevamente.")
        );

        // manager.io?.emit("whatsapp:status", {
        //   sessionId,
        //   status: "logged_out",
        //   message: "Sesión cerrada. Debes escanear el QR nuevamente.",
        // });

        removeSessionSock(sessionId);
        console.log(`Sesión cerrada definitivamente: ${sessionId}`);
        return;
      }

      /**
       * Cierre temporal.
       */
      manager.io?.emit(`session-inactive-${sessionId}`, {
        sessionId,
        status: "close",
        message: "Conexión cerrada temporalmente. Reintentando...",
      });

      console.log("Sesión cerrada. Debes escanear el QR nuevamente.");

      /**
       * Evita múltiples reconexiones al mismo tiempo.
       */
      if (!entry.reconnecting) {
        entry.reconnecting = true;

        setTimeout(() => {
          console.log(`Reintentando sesión: ${sessionId}`);

          const currentEntry = getOrInitEntry(sessionId);

          if (
            !currentEntry.sock &&
            currentEntry.status !== "logged_out" &&
            currentEntry.status !== "error_405"
          ) {
            currentEntry.creatingPromise = createSocket(
              sessionId,
              currentEntry,
              manager
            ).catch((error) => {
              console.error(`Error recreando sesión ${sessionId}:`, error);
              currentEntry.creatingPromise = null;
              currentEntry.reconnecting = false;
            });
          }
        }, 5000);
      }

      await backupAuthToDB(sessionId, authPath, "Inactive");
    }
  });

  return sock;
}

/**
 * Registra manualmente un socket.
 */
export function setSessionSock(sessionId, sock) {
  if (!sessionId || !sock) return;

  const entry = getOrInitEntry(sessionId);

  entry.sock = sock;
  entry.status = "open";

  console.log(`Sesión registrada manualmente: ${sessionId}`);
}

/**
 * Obtiene o crea una sesión.
 * Usa lock para evitar sockets duplicados.
 */
export async function getSessionSock(sessionId, manager = {}) {
  if (!sessionId) return null;

  const entry = getOrInitEntry(sessionId);

  /**
   * Si hay socket existente, lo retorna.
   */
  if (entry.sock) {
    await waitUntilSendReady(entry).catch((error) => {
      console.warn(`Sesión ${sessionId} aún no está lista:`, error.message);
    });

    return entry.sock;
  }

  /**
   * Si se está creando, espera el mismo proceso.
   */
  if (entry.creatingPromise) {
    await entry.creatingPromise.catch((error) => {
      console.warn(`Creación previa falló para ${sessionId}:`, error.message);
    });

    return entry.sock;
  }

  /**
   * Crear socket una sola vez.
   */
  entry.creatingPromise = createSocket(sessionId, entry, manager);

  await entry.creatingPromise.catch((error) => {
    console.error(`Error creando sesión ${sessionId}:`, error.message);
    entry.creatingPromise = null;
  });

  return entry.sock;
}

/**
 * Espera explícitamente a que una sesión esté lista.
 */
export async function waitSessionReady(sessionId, timeoutMs = 30000) {
  const entry = getOrInitEntry(sessionId);

  await waitUntilSendReady(entry, timeoutMs);

  return entry.sock;
}

/**
 * Fuerza reinicio de una sesión.
 */
export async function recreateSession(sessionId, manager = {}) {
  const entry = getOrInitEntry(sessionId);

  try {
    entry.sock?.end?.();
  } catch (error) {
    console.warn(`Error cerrando socket ${sessionId}:`, error.message);
  }

  entry.sock = null;
  entry.status = "idle";
  entry.creatingPromise = null;
  entry.readyPromise = null;
  entry.readyResolve = null;
  entry.readyReject = null;
  entry.reconnecting = false;

  return await getSessionSock(sessionId, manager);
}

/**
 * Obtiene socket realmente listo para enviar.
 */
export async function getReadySock(sessionId, manager = {}) {
  const session = getOrInitEntry(sessionId);

  if (!session) {
    return null;
  }

  if (session.status === "open" && session.sock) {
    return session.sock;
  }

  if (session.status === "qr") {
    throw new Error(`La sesión '${sessionId}' requiere escanear QR.`);
  }

  if (session.status === "logged_out") {
    throw new Error(
      `La sesión '${sessionId}' fue cerrada. Debes escanear QR nuevamente.`
    );
  }

  if (session.status === "error_405") {
    throw new Error(
      `La sesión '${sessionId}' tiene error 405. Borra la sesión y vuelve a vincular.`
    );
  }

  if (session.status === "connecting") {
    return await waitUntilOpen(sessionId, 20000);
  }

  if (session.status === "idle" || session.status === "close" || !session.sock) {
    await recreateSession(sessionId, manager);
    return await waitUntilOpen(sessionId, 20000);
  }

  return null;
}

/**
 * Elimina una sesión.
 */
export function removeSessionSock(sessionId) {
  if (!sessionId) return;

  const entry = sessions.get(sessionId);

  if (entry?.sock) {
    try {
      entry.sock.end?.();
    } catch (error) {
      console.warn(`Error cerrando sesión ${sessionId}:`, error.message);
    }
  }

  sessions.delete(sessionId);

  console.log(`Sesión eliminada: ${sessionId}`);
}

/**
 * Lista sesiones registradas.
 */
export function listActiveSessions() {
  return Array.from(sessions.keys());
}

/**
 * Verifica si una sesión está activa.
 */
export function isSessionActive(sessionId) {
  if (!sessionId) return false;

  const entry = sessions.get(sessionId);

  return !!entry?.sock && entry.status === "open";
}

/**
 * Obtiene estado de una sesión.
 */
export function getSessionStatus(sessionId) {
  const entry = sessions.get(sessionId);

  if (!entry) {
    return {
      sessionId,
      status: "not_found",
      active: false,
    };
  }

  return {
    sessionId,
    status: entry.status,
    active: !!entry.sock && entry.status === "open",
  };
}

/**
 * Debug de sesión.
 */
export function debugSession(sessionId) {
  const entry = sessions.get(sessionId);

  if (!entry) {
    return {
      sessionId,
      exists: false,
      status: "not_found",
      hasSock: false,
      hasUser: false,
      reconnecting: false,
      creating: false,
      readyWaiting: false,
    };
  }

  return {
    sessionId,
    exists: true,
    status: entry.status,
    hasSock: !!entry.sock,
    hasUser: !!entry.sock?.user,
    reconnecting: entry.reconnecting,
    creating: !!entry.creatingPromise,
    readyWaiting: !!entry.readyPromise,
  };
}

/**
 * Limpia todas las sesiones.
 */
export function clearAllSessions() {
  for (const [sessionId, entry] of sessions.entries()) {
    try {
      entry.sock?.end?.();
    } catch (error) {
      console.warn(`Error cerrando sesión ${sessionId}:`, error.message);
    }
  }

  sessions.clear();

  console.log("Todas las sesiones han sido limpiadas");
}

export default {
  setSessionSock,
  getSessionSock,
  waitSessionReady,
  recreateSession,
  getReadySock,
  waitUntilOpen,
  debugSession,
  removeSessionSock,
  listActiveSessions,
  isSessionActive,
  getSessionStatus,
  clearAllSessions,
};