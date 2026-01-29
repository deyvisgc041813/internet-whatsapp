import express from 'express';
import { createBaileysClient } from '../whatsapp/baileysClient.js';
import { getSessionSock, setSessionSock } from '../whatsapp/sessionManager.js';

const router = express.Router();

/**
 * Fábrica de rutas de sesión
 */
export default function sessionsRoutesFactory(manager) {
  /**
   * 📲 Iniciar o verificar una sesión
   */
  router.post('/start/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    try {
      // 1️⃣ Verificar si ya existe una sesión activa
      const existing = getSessionSock(sessionId);
      if (existing) {
        return res.json({
          ok: true,
          qr: false,
          message: `✅ La sesión '${sessionId}' ya está activa`,
        });
      }

      // 2️⃣ Crear una nueva sesión y emitir QR
      const client = await createBaileysClient({
        sessionId,
        io: manager.io,          // Accede al socket.io desde el manager
        authBase: manager.authBase,
        onStatus: (status) => console.log(`📡 Estado de sesión ${sessionId}:`, status),
      });

      // 3️⃣ Registrar el socket en el SessionManager
      setSessionSock(sessionId, client);

      res.json({
        ok: true,
        qr: true,
        message: `📲 Escanea el código QR para conectar la sesión '${sessionId}'`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        ok: false,
        qr: false,
        error: 'Error al iniciar la sesión',
        details: err.message,
      });
    }
  });

  /**
   * ✅ Verificar estado de sesión
   */
  router.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const sock = getSessionSock(sessionId);

    if (sock) {
      return res.json({ ok: true, active: true, message: `✅ Sesión '${sessionId}' activa` });
    }

    return res.json({ ok: false, active: false, message: `⚠️ Sesión '${sessionId}' no encontrada` });
  });

  return router;
}
