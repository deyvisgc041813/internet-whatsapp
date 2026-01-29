import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { initSocket } from './socket.js';
import sessionsRoutesFactory from './routes/sessions.routes.js';
import messagesRoutes from './routes/messages.routes.js'; // ✅ Import directo

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true); // acepta cualquier origen dinámicamente
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

const server = http.createServer(app);
const io = initSocket(server, process.env.CORS_ORIGIN || '*');

const authBase = './auth';
const manager = {
	io,
	authBase
}

// ✅ Rutas
app.use('/api/sessions', sessionsRoutesFactory(manager));
app.use('/api/messages', messagesRoutes); // 👈 Aquí pasas el router directamente

// ✅ Servidor activo
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
