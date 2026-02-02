/**
 * sessionManager.js
 * -----------------
 * Administra las sesiones activas de WhatsApp.
 * Cada sesión activa se almacena temporalmente en memoria (Map).
 * Puedes extenderlo fácilmente para persistir sesiones en BD.
 */

import makeWASocket, { useMultiFileAuthState } from "baileys";

const sessions = new Map();

/**
 * ✅ Registrar una nueva sesión
 * @param {string} sessionId - ID único de la sesión (por ejemplo "localhost")
 * @param {object} sock - Instancia del socket de Baileys (makeWASocket)
 */

function getOrInitEntry(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sock: null,
      status: 'idle', // idle | connecting | open | close
      readyPromise: null,
      readyResolve: null,
      readyReject: null,
      creatingPromise: null,
    });
  }
  return sessions.get(sessionId);
}
function setReadyPromise(entry) {
  if (!entry.readyPromise) {
    entry.readyPromise = new Promise((resolve, reject) => {
      entry.readyResolve = resolve;
      entry.readyReject = reject;
    });
  }
}

function resolveReady(entry) {
  if (entry.readyResolve) entry.readyResolve(true);
  entry.readyPromise = null;
  entry.readyResolve = null;
  entry.readyReject = null;
}

function rejectReady(entry, err) {
  if (entry.readyReject) entry.readyReject(err);
  entry.readyPromise = null;
  entry.readyResolve = null;
  entry.readyReject = null;
}
/**
 * Espera a que el socket esté listo para enviar:
 * - connection === 'open'
 * - y un pequeño warmup (login/sync)
 */
async function waitUntilSendReady(entry, timeoutMs = 30000) {
  // Si ya está abierto, igual hacemos warmup corto.
  if (entry.status === 'open' && entry.sock?.user) {
    await new Promise(r => setTimeout(r, 300)); // warmup corto
    return;
  }

  setReadyPromise(entry);

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout esperando WhatsApp (open)')), timeoutMs)
  );

  await Promise.race([entry.readyPromise, timeout]);

  // Warmup extra (muy común que el primer send falle si mandas al milisegundo exacto)
  await new Promise(r => setTimeout(r, 300));
}
async function createSocket(sessionId, entry) {
  entry.status = 'connecting';
  setReadyPromise(entry);

  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${sessionId}`);

  const sock = makeWASocket({
    auth: state,
    // QR solo si NO está registrada la sesión
    printQRInTerminal: !state.creds?.registered,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    entry.status = connection || entry.status;

    if (connection === 'open') {
      resolveReady(entry);
      // console.log(`✅ Sesión lista: ${sessionId}`);
    }

    if (connection === 'close') {
      // socket murió: limpiar entrada
      entry.sock = null;
      entry.status = 'close';
      // si alguien está esperando, rechazamos
      rejectReady(entry, new Error('Conexión cerrada'));
      // permitimos recreación en la próxima petición
      entry.creatingPromise = null;
      // console.log(`🧹 Sesión cerrada: ${sessionId}`, lastDisconnect?.error);
    }
  });

  entry.sock = sock;
  return sock;
}
export function setSessionSock(sessionId, sock) {
  if (!sessionId || !sock) return;
  sessions.set(sessionId, sock);
  console.log(`✅ Sesión registrada: ${sessionId}`);
}




/**
 * 🔍 Obtener una sesión activa
 * @param {string} sessionId
 * @returns {object|null} - Instancia del socket activo o null si no existe
 */
//  export async function getSessionSock(sessionId) {
//    // ¿Ya hay conexión activa en memoria?
//    if (!sessionId) return null;
//   if (sessions.has(sessionId)) {
//     return sockets.get(sessionId) // reutiliza el socket vivo
//   }

//   // 2️⃣ No hay socket → crear uno nuevo
//   const { state, saveCreds } =
//     await useMultiFileAuthState(`./auth/${sessionId}`)

//   // const sock = makeWASocket({ auth: state })
//   const sock = makeWASocket({
//     auth: state,
//     printQRInTerminal: !state.creds?.registered
//   });

//   sock.ev.on('creds.update', saveCreds)
//   // 3️⃣ Guardar el socket activo en memoria
//   setSessionSock(sessionId, sock)
//   //sockets.set(phone, sock)
//   return sock
//   // if (!sessionId) return null;
//   // console.log("sessionId ", sessionId)
//   // return sessions.get(sessionId) || null;
// }
// export async function getSessionSock(sessionId) {
//   if (!sessionId) return null;

//   // 1️⃣ Reutilizar socket vivo
//   if (sessions.has(sessionId)) {
//     return sessions.get(sessionId);
//   }

//   console.log(`♻️ Creando / restaurando sesión: ${sessionId}`);

//   // 2️⃣ Cargar credenciales (NO QR si existen)
//   const { state, saveCreds } =
//     await useMultiFileAuthState(`./auth/${sessionId}`);

//   const sock = makeWASocket({
//     auth: state,
//     printQRInTerminal: !state.creds?.registered,
//   });

//   // 3️⃣ Guardar cambios de credenciales
//   sock.ev.on('creds.update', saveCreds);

//   // 4️⃣ Limpiar socket muerto
//   sock.ev.on('connection.update', ({ connection }) => {
//     if (connection === 'close') {
//       console.log(`🧹 Sesión cerrada: ${sessionId}`);
//       sessions.delete(sessionId);
//     }
//     if (connection === 'open') {
//       console.log(`✅ Sesión lista: ${sessionId}`);
//     }
//   });

//   // 5️⃣ Guardar socket en memoria
//   sessions.set(sessionId, sock);

//   // 6️⃣ Esperar a que esté LISTO (clave)
//   await waitUntilReady(sock);

//   return sock;
// }

/**
 * Obtiene o crea sesión (con LOCK para evitar sockets duplicados)
 */
export async function getSessionSock(sessionId) {
  if (!sessionId) return null;

  const entry = getOrInitEntry(sessionId);

  // ✅ Si ya hay socket y está abierto, listo
  if (entry.sock) {
    await waitUntilSendReady(entry).catch(() => {});
    return entry.sock;
  }

  // ✅ Lock: si ya se está creando, espera ese mismo proceso
  if (entry.creatingPromise) {
    await entry.creatingPromise;
    await waitUntilSendReady(entry).catch(() => {});
    return entry.sock;
  }

  // Crear una sola vez
  entry.creatingPromise = (async () => {
    await createSocket(sessionId, entry);
    await waitUntilSendReady(entry);
  })();

  await entry.creatingPromise;
  return entry.sock;
}

/**
 * Forzar reinicio de sesión (por si se rompió)
 */
export async function recreateSession(sessionId) {
  const entry = getOrInitEntry(sessionId);
  try {
    entry.sock?.end?.();
  } catch {}
  entry.sock = null;
  entry.status = 'idle';
  entry.creatingPromise = null;
  entry.readyPromise = null;

  return await getSessionSock(sessionId);
}

/**
 * ❌ Eliminar una sesión
 * @param {string} sessionId
 */
export function removeSessionSock(sessionId) {
  if (!sessionId) return;
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    console.log(`🧹 Sesión eliminada: ${sessionId}`);
  }
}

/**
 * 📋 Obtener todas las sesiones activas
 * @returns {string[]} - Lista de IDs de sesiones activas
 */
export function listActiveSessions() {
  return Array.from(sessions.keys());
}

/**
 * ⚠️ Verificar si una sesión está activa
 * @param {string} sessionId
 * @returns {boolean}
 */
export function isSessionActive(sessionId) {
  return sessions.has(sessionId);
}

/**
 * 🧠 Cerrar todas las sesiones (opcional, útil al reiniciar el servidor)
 */
export function clearAllSessions() {
  sessions.clear();
  console.log('🚫 Todas las sesiones han sido limpiadas');
}

export default {
  setSessionSock,
  getSessionSock,
  removeSessionSock,
  listActiveSessions,
  isSessionActive,
  clearAllSessions,
};