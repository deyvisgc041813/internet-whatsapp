/**
 * sessionManager.js
 * -----------------
 * Administra las sesiones activas de WhatsApp.
 * Cada sesión activa se almacena temporalmente en memoria (Map).
 * Puedes extenderlo fácilmente para persistir sesiones en BD.
 */

const sessions = new Map();

/**
 * ✅ Registrar una nueva sesión
 * @param {string} sessionId - ID único de la sesión (por ejemplo "localhost")
 * @param {object} sock - Instancia del socket de Baileys (makeWASocket)
 */
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
export function getSessionSock(sessionId) {
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
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