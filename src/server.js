import { installSafeConsoleFilter } from './utils/safeConsole.js';
installSafeConsoleFilter();

import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';

import { initSocket } from './socket.js';
import sessionsRoutesFactory from './routes/sessions.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import authRoutes from './routes/auth.routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';
dotenv.config();

const app = express();

app.use(express.json());

const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:4300',
  'https://app.miempresa.com',
  'https://admin.miempresa.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

const server = http.createServer(app);

const io = initSocket(server, allowedOrigins);

const authBase = './auth';

const manager = {
  io,
  authBase
};

app.use('/api/v1/sessions', authMiddleware, sessionsRoutesFactory(manager));
app.use('/api/v1/messages', authMiddleware, messagesRoutes);
app.use('/api/v1/auth', authRoutes);

const PORT = process.env.PORT || 8001;

server.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});