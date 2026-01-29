import express from 'express';
import * as sessionManager from '../whatsapp/sessionManager.js'; // 🔹 Importa TODO el módulo

const router = express.Router();

// ✅ Ruta para envío masivo de mensajes
router.post('/send-bulk/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { messages } = req.body;

  try {
    // 1️⃣ Validar sesión
    const sock = sessionManager.getSessionSock(sessionId); // 🔹 sin await
    if (!sock) {
      return res.status(404).json({
        ok: false,
        message: `⚠️ La sesión '${sessionId}' no está activa o no existe.`,
      });
    }

    // 2️⃣ Validar mensajes
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'Debes enviar un array con formato [{ to, text }]',
      });
    }

    // 3️⃣ Enviar mensajes
    const results = [];
    for (const msg of messages) {
      try {
        const jid = `${msg.to}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: msg.text });
        results.push({ to: msg.to, status: 'sent' });
      } catch (e) {
        results.push({ to: msg.to, status: 'failed', error: e.message });
      }
    }

    return res.json({
      ok: true,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    });
  } catch (err) {
    console.error('❌ Error en /send-bulk:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error enviando mensajes masivos',
      details: err.message,
    });
  }
});

/**
 * ✅ Enviar mensaje a grupo
 * Ejemplo:
 * POST /api/messages/send-group/localhost
 * Body: { "groupId": "120363025306210129@g.us", "text": "Hola grupo 👋" }
 */
router.post('/send-group/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { groupId, text } = req.body;

  try {
    // 1️⃣ Verificar sesión activa
    const sock = sessionManager.getSessionSock(sessionId);
    if (!sock) {
      return res.status(404).json({
        ok: false,
        message: `⚠️ La sesión '${sessionId}' no está activa o no existe.`,
      });
    }

    // 2️⃣ Validar datos
    if (!groupId || !text) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar 'groupId' y 'text' en el cuerpo de la solicitud.",
      });
    }

    // 3️⃣ Asegurar que el ID tenga el sufijo correcto
    const chatId = groupId.endsWith('@g.us') ? groupId : `${groupId}@g.us`;

    // 4️⃣ Enviar mensaje
    await sock.sendMessage(chatId, { text });

    console.log(`📢 Mensaje enviado al grupo: ${chatId}`);

    res.json({
      ok: true,
      message: '✅ Mensaje enviado correctamente al grupo',
      data: { groupId: chatId, text },
    });
  } catch (err) {
    console.error('❌ Error al enviar mensaje al grupo:', err);
    res.status(500).json({
      ok: false,
      message: 'Error enviando mensaje al grupo',
      details: err.message,
    });
  }
});

/**
 * ✅ Obtener lista de grupos donde está unida la sesión
 * Ejemplo:
 * GET /api/messages/groups/localhost
 */
router.get('/groups/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sock = sessionManager.getSessionSock(sessionId);
    if (!sock) {
      return res.status(404).json({
        ok: false,
        message: `⚠️ La sesión '${sessionId}' no está activa o no existe.`,
      });
    }

    // 🔹 Obtener todos los grupos
    const groups = await sock.groupFetchAllParticipating();

    // 🔹 Transformar en un arreglo limpio
    const groupList = Object.values(groups).map((g) => ({
      id: g.id,
      name: g.subject,
      participants: g.participants?.length || 0,
    }));

    res.json({
      ok: true,
      total: groupList.length,
      groups: groupList,
    });
  } catch (err) {
    console.error('❌ Error al obtener grupos:', err);
    res.status(500).json({
      ok: false,
      message: 'Error obteniendo lista de grupos',
      details: err.message,
    });
  }
});

/**
 * ✅ Enviar archivos o medios a un grupo
 * Ejemplo:
 * POST /api/messages/send-group-media/localhost
 * Body:
 * {
 *   "groupId": "120363025306210129@g.us",
 *   "caption": "Promoción exclusiva 🎄",
 *   "mediaUrl": "https://greenhomeperu.com/images/promo.jpg"
 * }
 */
router.post('/send-group-media/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { groupId, caption, mediaUrl, filePath } = req.body;

  try {
    const sock = sessionManager.getSessionSock(sessionId);
    if (!sock) {
      return res.status(404).json({
        ok: false,
        message: `⚠️ La sesión '${sessionId}' no está activa o no existe.`,
      });
    }

    if (!groupId || (!mediaUrl && !filePath)) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar 'groupId' y al menos 'mediaUrl' o 'filePath'.",
      });
    }

    const chatId = groupId.endsWith('@g.us') ? groupId : `${groupId}@g.us`;
    let buffer;

    // 📦 Si es URL remota, descargar
    if (mediaUrl) {
      const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
      buffer = Buffer.from(response.data, 'binary');
    }

    // 📁 Si es archivo local
    else if (filePath && fs.existsSync(filePath)) {
      buffer = fs.readFileSync(path.resolve(filePath));
    } else {
      return res.status(404).json({ ok: false, message: 'Archivo no encontrado o URL inválida.' });
    }

    // 📤 Enviar archivo con o sin caption
    await sock.sendMessage(chatId, { image: buffer, caption });

    console.log(`📎 Archivo enviado al grupo: ${chatId}`);

    res.json({
      ok: true,
      message: '✅ Archivo o imagen enviada correctamente al grupo',
      data: { groupId: chatId, caption, mediaUrl, filePath },
    });
  } catch (err) {
    console.error('❌ Error al enviar archivo al grupo:', err);
    res.status(500).json({
      ok: false,
      message: 'Error enviando archivo al grupo',
      details: err.message,
    });
  }
});

export default router;
