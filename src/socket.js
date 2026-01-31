// src/socket.js
// import { Server } from 'socket.io';

// export function initSocket(server, corsOrigin) {
//   const io = new Server(server, { cors: { origin: corsOrigin } });

//   io.on('connection', (socket) => {
//     console.log(`🟢 Cliente conectado al socket: ${socket.id}`);

//     socket.on('disconnect', (reason) => {
//       console.log(`🔴 Cliente desconectado (${socket.id}) -> ${reason}`);
//     });
//   });

//   return io;
// }

// src/socket.js
import { Server } from 'socket.io';

export function initSocket(server, allowedOrigins) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, origin); // devuelve el origin real
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🟢 Cliente conectado al socket: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`🔴 Cliente desconectado (${socket.id}) -> ${reason}`);
    });
  });

  return io;
}
