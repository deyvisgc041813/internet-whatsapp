import express from 'express';
import { createBaileysClient } from '../whatsapp/baileysClient.js';
import { getSessionSock, setSessionSock, getSessionStatus } from '../whatsapp/sessionManager.js';

const router = express.Router();

/**
 * Fábrica de rutas de sesión
 */
export default function sessionsRoutesFactory(manager) {
  /**
   *Iniciar o verificar una sesión
   */
  // router.post('/start/', async (req, res) => {
  //   const { sessionId } = req.body;
  //   try {
  //     //Verificar si ya existe una sesión activa
  //     if(!sessionId) {
  //       return res.json({
  //         ok: false,
  //         qr: false,
  //         message: 'No se envió el sessionId. Este campo es obligatorio para configurar WhatsApp.'
  //       });
  //     }
  //     const existing = await getSessionSock(sessionId);
  //     console.log("existing ", existing)
  //     if (existing) {
  //       return res.json({
  //         ok: true,
  //         qr: false,
  //         message: ` La sesión '${sessionId}' ya está activa`,
  //       });
  //     }
  //     //Crear una nueva sesión y emitir QR
  //     const client = await createBaileysClient({
  //       sessionId,
  //       io: manager.io,          // Accede al socket.io desde el manager
  //       authBase: manager.authBase,
  //       onStatus: (status) => console.log(`📡 Estado de sesión ${sessionId}:`, status),
  //     });

  //     // Registrar el socket en el SessionManager
  //     setSessionSock(sessionId, client);
  //     res.json({
  //       ok: true,
  //       qr: true,
  //       message: `📲 Escanea el código QR para conectar la sesión '${sessionId}'`,
  //     });
  //   } catch (err) {
  //     console.error(err);
  //     res.status(500).json({
  //       ok: false,
  //       qr: false,
  //       error: 'Error al iniciar la sesión',
  //       message: err.message,
  //     });
  //   }
  // });
router.post("/start", async (req, res) => {
  const { sessionId } = req.body;

  try {
    if (!sessionId) {
      return res.json({
        ok: false,
        qr: false,
        message: "No se envió el sessionId. Este campo es obligatorio para configurar WhatsApp."
      });
    }

    const status = getSessionStatus(sessionId);

    console.log("Estado actual:", status);

    if (status.active) {
      return res.json({
        ok: true,
        qr: false,
        status: status.status,
        message: `La sesión '${sessionId}' ya está activa.`
      });
    }

    await getSessionSock(sessionId, {
      io: manager.io,
      authBase: manager.authBase
    });

    return res.json({
      ok: true,
      qr: true,
      status: "starting",
      message: `Iniciando sesión '${sessionId}'. Espera el QR por socket.`
    });

  } catch (err) {
    console.error("Error al iniciar sesión:", err);

    return res.status(500).json({
      ok: false,
      qr: false,
      error: "Error al iniciar la sesión",
      message: err.message
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
