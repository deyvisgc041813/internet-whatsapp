import express from "express";
import * as sessionManager from "../whatsapp/sessionManager.js"; // 🔹 Importa TODO el módulo
import multer from "multer";

const router = express.Router();
// 👉 Multer en memoria (NO guarda archivos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});
// ✅ Ruta para envío masivo de mensajes
router.post("/send-bulk/:sessionId", async (req, res) => {
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
        message: "Debes enviar un array con formato [{ to, text }]",
      });
    }

    // 3️⃣ Enviar mensajes
    const results = [];
    for (const msg of messages) {
      try {
        const jid = `${msg.to}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: msg.text });
        results.push({ to: msg.to, status: "sent" });
      } catch (e) {
        results.push({ to: msg.to, status: "failed", error: e.message });
      }
    }

    return res.json({
      ok: true,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (err) {
    console.error("❌ Error en /send-bulk:", err);
    return res.status(500).json({
      ok: false,
      message: "Error enviando mensajes masivos",
      details: err.message,
    });
  }
});
// router.post(
//   '/send-bulk-with-media/:sessionId',
//   upload.array('files'),
//   async (req, res) => {
//     const { sessionId } = req.params;
//     const { messages } = req.body;

//     try {
//       const sock = sessionManager.getSessionSock(sessionId);
//       if (!sock) {
//         return res.status(404).json({
//           ok: false,
//           message: `La sesión '${sessionId}' no está activa o no existe.`,
//         });
//       }

//       // Parsear mensajes
//       let parsedMessages;
//       try {
//         parsedMessages = JSON.parse(messages);
//       } catch {
//         return res.status(400).json({
//           ok: false,
//           message: 'El campo "messages" debe ser un JSON válido',
//         });
//       }

//       if (!Array.isArray(parsedMessages) || parsedMessages.length === 0) {
//         return res.status(400).json({
//           ok: false,
//           message: 'Debes enviar una lista de mensajes',
//         });
//       }

//       const files = req.files || [];
//       const results = [];

//       for (const msg of parsedMessages) {
//         try {
//           const jid = `${msg.to}@s.whatsapp.net`;
//           let payload = {};

//           // 📝 Texto
//           if (msg.text) {
//             payload.caption = msg.text;
//           }

//           // 📎 Archivo por mensaje
//           if (msg.fileIndex !== undefined) {
//             const file = files[msg.fileIndex];
//             if (!file) {
//               throw new Error('Archivo no encontrado para este mensaje');
//             }

//             const mimeType = file.mimetype;

//             if (mimeType.startsWith('image')) {
//               payload.image = file.buffer;
//             } else if (mimeType.startsWith('video')) {
//               payload.video = file.buffer;
//             } else if (mimeType.startsWith('audio')) {
//               payload.audio = file.buffer;
//             } else {
//               payload.document = file.buffer;
//               payload.fileName = file.originalname;
//               payload.mimetype = mimeType;
//             }
//           }

//           if (Object.keys(payload).length === 0) {
//             throw new Error('Mensaje vacío');
//           }

//           await sock.sendMessage(jid, payload);

//           results.push({ to: msg.to, status: 'sent' });

//           await new Promise((r) => setTimeout(r, 1200));
//         } catch (e) {
//           results.push({
//             to: msg.to,
//             status: 'failed',
//             error: e.message,
//           });
//         }
//       }

//       return res.json({
//         ok: true,
//         sent: results.filter((r) => r.status === 'sent').length,
//         failed: results.filter((r) => r.status === 'failed').length,
//         results,
//       });

//     } catch (err) {
//       console.error('❌ Error bulk media:', err);
//       return res.status(500).json({
//         ok: false,
//         message: 'Error enviando mensajes',
//         details: err.message,
//       });
//     }
//   }
// );

// router.post(
//   '/send-single-with-media/:sessionId',
//   upload.single('file'),
//   async (req, res) => {
//     const { sessionId } = req.params;
//     const { to, text } = req.body;

//     try {
//       // 1️⃣ Validar sesión
//       const sock = await sessionManager.getSessionSock(sessionId);
//       if (!sock) {
//         return res.status(404).json({
//           ok: false,
//           message: `La sesión '${sessionId}' no está activa o no existe.`,
//         });
//       }

//       // 2️⃣ Validar datos mínimos
//       if (!to) {
//         return res.status(400).json({
//           ok: false,
//           message: 'Debes enviar el número (to)',
//         });
//       }

//       const jid = `${to}@s.whatsapp.net`;
//       let payload = {};

//       // 3️⃣ Si viene archivo
//       if (req.file) {
//         const mimeType = req.file.mimetype;

//         if (mimeType.startsWith('image')) {
//           payload.image = req.file.buffer;
//         } else if (mimeType.startsWith('video')) {
//           payload.video = req.file.buffer;
//         } else if (mimeType.startsWith('audio')) {
//           payload.audio = req.file.buffer;
//         } else {
//           payload.document = req.file.buffer;
//           payload.fileName = req.file.originalname;
//           payload.mimetype = mimeType;
//         }

//         // 📌 Texto con archivo → caption
//         if (text) {
//           payload.caption = text;
//         }
//       }

//       // 4️⃣ Solo texto (sin archivo)
//       else {
//         if (!text) {
//           return res.status(400).json({
//             ok: false,
//             message: 'Debes enviar texto o un archivo',
//           });
//         }

//         payload.text = text;
//       }

//       // 5️⃣ Enviar mensaje
//       await sock.sendMessage(jid, payload);

//       return res.json({
//         ok: true,
//         message: 'Mensaje enviado correctamente',
//       });

//     } catch (error) {
//       console.error('❌ Error enviando mensaje:', error);
//       return res.status(500).json({
//         ok: false,
//         message: 'Error enviando mensaje',
//         details: error.message,
//       });
//     }
//   }
// );
router.post(
  "/send-single-with-media/:sessionId",
  upload.single("file"),
  async (req, res) => {
    const { sessionId } = req.params;
    const { to, text } = req.body;

    try {
      if (!to) {
        return res
          .status(400)
          .json({ ok: false, message: "Debes enviar el número (to)" });
      }

      const jid = `${to}@s.whatsapp.net`;

      let payload = {};
      if (req.file) {
        const mimeType = req.file.mimetype;

        if (mimeType.startsWith("image")) payload.image = req.file.buffer;
        else if (mimeType.startsWith("video")) payload.video = req.file.buffer;
        else if (mimeType.startsWith("audio")) payload.audio = req.file.buffer;
        else {
          payload.document = req.file.buffer;
          payload.fileName = req.file.originalname;
          payload.mimetype = mimeType;
        }

        if (text) payload.caption = text;
      } else {
        if (!text) {
          return res
            .status(400)
            .json({ ok: false, message: "Debes enviar texto o un archivo" });
        }
        payload.text = text;
      }

      // 1) obtener socket listo
      let sock = await sessionManager.getSessionSock(sessionId);
      if (!sock) {
        return res.status(404).json({
          ok: false,
          message: `La sesión '${sessionId}' no existe.`,
        });
      }

      // 2) enviar con 1 retry si falla en frío
      try {
        await sock.sendMessage(jid, payload);
      } catch (err) {
        const msg = String(err?.message || "");
        const code = err?.output?.statusCode || err?.statusCode || err?.code;

        const isColdStartClose =
          msg.includes("Connection Closed") ||
          msg.includes("Connection Terminated") ||
          code === 1006;

        if (!isColdStartClose) throw err;

        // Recreate + retry 1 vez
        sock = await sessionManager.recreateSession(sessionId);
        await sock.sendMessage(jid, payload);
      }
      return res.json({ ok: true, message: "Mensaje enviado correctamente" });
    } catch (error) {
      console.error("❌ Error enviando mensaje:", error);
      return res.status(500).json({
        ok: false,
        message: "Error enviando mensaje",
        details: error.message,
      });
    }
  },
);
router.post(
  "/send-bulk-with-media/:sessionId",
  upload.single("file"),
  async (req, res) => {
    const { sessionId } = req.params;
    const { messages } = req.body;

    try {
      // 1) obtener socket activo
      let sock = await sessionManager.getSessionSock(sessionId);
      if (!sock) {
        return res.status(404).json({
          ok: false,
          message: `La sesión '${sessionId}' no está activa o no existe.`,
        });
      }
      if (!messages) {
        return res.status(400).json({
          ok: false,
          message: "Debes enviar el campo messages",
        });
      }

      const parsedMessages = JSON.parse(messages);

      if (!Array.isArray(parsedMessages) || parsedMessages.length === 0) {
        return res.status(400).json({
          ok: false,
          message: "messages debe ser un array de mensajes",
        });
      }

      // 2) payload del archivo (una sola vez)
      let mediaPayload = null;

      if (req.file) {
        const mimeType = req.file.mimetype;

        if (mimeType.startsWith("image"))
          mediaPayload = { image: req.file.buffer };
        else if (mimeType.startsWith("video"))
          mediaPayload = { video: req.file.buffer };
        else if (mimeType.startsWith("audio"))
          mediaPayload = { audio: req.file.buffer };
        else {
          mediaPayload = {
            document: req.file.buffer,
            fileName: req.file.originalname,
            mimetype: mimeType,
          };
        }
      }

      // 3) enviar mensajes (reutilizando socket)
      for (const msg of parsedMessages) {
        const { to, text, mediaUrl } = msg;
        if (!to) continue;

        const jid = `${to}@s.whatsapp.net`;
        let payload = {};

        if (mediaPayload) {
          payload = { ...mediaPayload };
          let caption = text ?? "";

          if (mediaUrl) {
            caption += `\n\n📎 Ver comprobante:\n${mediaUrl}`;
          }
          if (caption) payload.caption = caption;

        } else {
          if (!text) continue;
          payload.text = text;
          if (mediaUrl) {
            payload.text += `\n\n📎 Ver comprobante:\n${mediaUrl}`;
          }
        }
        try {
          await sock.sendMessage(jid, payload);
        } catch (err) {
          const msgText = String(err?.message || "");
          const code = err?.output?.statusCode || err?.statusCode || err?.code;

          const isColdStartClose =
            msgText.includes("Connection Closed") ||
            msgText.includes("Connection Terminated") ||
            code === 1006;

          if (!isColdStartClose) throw err;
          // recreate + retry 1 vez
          sock = await sessionManager.recreateSession(sessionId);
          await sock.sendMessage(jid, payload);
        }
      }
      return res.json({
        ok: true,
        message: "Mensajes enviados correctamente",
      });
    } catch (error) {
      console.error("❌ Error enviando mensajes:", error);
      return res.status(500).json({
        ok: false,
        message: "Error enviando mensajes",
        details: error.message,
      });
    }
  },
);

// router.post(
//   '/send-bulk-with-media/:sessionId',
//   upload.single('file'),
//   async (req, res) => {
//     const { sessionId } = req.params;
//     const { messages } = req.body;

//     try {
//       // Validar sesión
//       const sock = sessionManager.getSessionSock(sessionId);
//       if (!sock) {
//         return res.status(404).json({
//           ok: false,
//           message: `La sesión '${sessionId}' no está activa o no existe.`,
//         });
//       }

//       //  Parsear mensajes
//       if (!messages) {
//         return res.status(400).json({
//           ok: false,
//           message: 'Debes enviar el campo messages',
//         });
//       }

//       const parsedMessages = JSON.parse(messages);

//       if (!Array.isArray(parsedMessages) || parsedMessages.length === 0) {
//         return res.status(400).json({
//           ok: false,
//           message: 'messages debe ser un array de mensajes',
//         });
//       }

//       //  Construir payload del archivo (UNA SOLA VEZ)
//       let mediaPayload = null;

//       if (req.file) {
//         const mimeType = req.file.mimetype;

//         if (mimeType.startsWith('image')) {
//           mediaPayload = { image: req.file.buffer };
//         } else if (mimeType.startsWith('video')) {
//           mediaPayload = { video: req.file.buffer };
//         } else if (mimeType.startsWith('audio')) {
//           mediaPayload = { audio: req.file.buffer };
//         } else {
//           mediaPayload = {
//             document: req.file.buffer,
//             fileName: req.file.originalname,
//             mimetype: mimeType,
//           };
//         }
//       }

//       // Enviar mensajes
//       for (const msg of parsedMessages) {
//         const { to, text } = msg;
//         if (!to) continue;

//         const jid = `${to}@s.whatsapp.net`;
//         let payload = {};

//         if (mediaPayload) {
//           // Clonar payload base
//           payload = { ...mediaPayload };

//           // Texto con archivo → caption
//           if (text) {
//             payload.caption = text;
//           }
//         } else {
//           // Solo texto
//           if (!text) continue;
//           payload.text = text;
//         }
//          // 1) obtener socket listo
//       let sock = await sessionManager.getSessionSock(sessionId);
//       if (!sock) {
//         return res.status(404).json({
//           ok: false,
//           message: `La sesión '${sessionId}' no existe.`,
//         });
//       }

//       // 2) enviar con 1 retry si falla en frío
//       try {
//         await sock.sendMessage(jid, payload);
//       } catch (err) {
//         const msg = String(err?.message || '');
//         const code = err?.output?.statusCode || err?.statusCode || err?.code;

//         const isColdStartClose =
//           msg.includes('Connection Closed') ||
//           msg.includes('Connection Terminated') ||
//           code === 1006;

//         if (!isColdStartClose) throw err;

//         // Recreate + retry 1 vez
//         sock = await sessionManager.recreateSession(sessionId);
//         await sock.sendMessage(jid, payload);
//       }
//         //await sock.sendMessage(jid, payload);
//       }
//       return res.json({
//         ok: true,
//         message: 'Mensajes enviados correctamente',
//       });

//     } catch (error) {
//       console.error('Error enviando mensajes:', error);
//       return res.status(500).json({
//         ok: false,
//         message: 'Error enviando mensajes',
//         details: error.message,
//       });
//     }
//   }
// );
/**
 * ✅ Enviar mensaje a grupo
 * Ejemplo:
 * POST /api/messages/send-group/localhost
 * Body: { "groupId": "120363025306210129@g.us", "text": "Hola grupo 👋" }
 */
router.post("/send-group/:sessionId", async (req, res) => {
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
        message:
          "Debes enviar 'groupId' y 'text' en el cuerpo de la solicitud.",
      });
    }

    // 3️⃣ Asegurar que el ID tenga el sufijo correcto
    const chatId = groupId.endsWith("@g.us") ? groupId : `${groupId}@g.us`;

    // 4️⃣ Enviar mensaje
    await sock.sendMessage(chatId, { text });

    console.log(`📢 Mensaje enviado al grupo: ${chatId}`);

    res.json({
      ok: true,
      message: "✅ Mensaje enviado correctamente al grupo",
      data: { groupId: chatId, text },
    });
  } catch (err) {
    console.error("❌ Error al enviar mensaje al grupo:", err);
    res.status(500).json({
      ok: false,
      message: "Error enviando mensaje al grupo",
      details: err.message,
    });
  }
});

/**
 * ✅ Obtener lista de grupos donde está unida la sesión
 * Ejemplo:
 * GET /api/messages/groups/localhost
 */
router.get("/groups/:sessionId", async (req, res) => {
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
    console.error("❌ Error al obtener grupos:", err);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo lista de grupos",
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
router.post("/send-group-media/:sessionId", async (req, res) => {
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

    const chatId = groupId.endsWith("@g.us") ? groupId : `${groupId}@g.us`;
    let buffer;

    // 📦 Si es URL remota, descargar
    if (mediaUrl) {
      const response = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
      });
      buffer = Buffer.from(response.data, "binary");
    }

    // 📁 Si es archivo local
    else if (filePath && fs.existsSync(filePath)) {
      buffer = fs.readFileSync(path.resolve(filePath));
    } else {
      return res
        .status(404)
        .json({ ok: false, message: "Archivo no encontrado o URL inválida." });
    }

    // 📤 Enviar archivo con o sin caption
    await sock.sendMessage(chatId, { image: buffer, caption });

    console.log(`📎 Archivo enviado al grupo: ${chatId}`);

    res.json({
      ok: true,
      message: "✅ Archivo o imagen enviada correctamente al grupo",
      data: { groupId: chatId, caption, mediaUrl, filePath },
    });
  } catch (err) {
    console.error("❌ Error al enviar archivo al grupo:", err);
    res.status(500).json({
      ok: false,
      message: "Error enviando archivo al grupo",
      details: err.message,
    });
  }
});

export default router;
