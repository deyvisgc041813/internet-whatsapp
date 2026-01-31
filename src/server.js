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
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:4300',
  'https://app.miempresa.com',
  'https://admin.miempresa.com'
];

// app.use(cors({
//   // origin: (origin, callback) => {
//   //   callback(null, true); // acepta cualquier origen dinámicamente
//   // },
//   origin: "http://localhost:4200",
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin); // 👈 devuelve el origin real
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const server = http.createServer(app);
// const io = initSocket(server, process.env.CORS_ORIGIN || '*');

const io = initSocket(server, allowedOrigins);

const authBase = './auth';
const manager = {
	io,
	authBase
}

// ✅ Rutas
app.use('/api/v1/sessions', sessionsRoutesFactory(manager));
app.use('/api/v1/messages', messagesRoutes); // 👈 Aquí pasas el router directamente

// ✅ Servidor activo
const PORT = process.env.PORT || 8001;
server.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
