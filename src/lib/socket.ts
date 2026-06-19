import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export const initSocket = (server: NetServer) => {
  if (!io) {
    io = new SocketIOServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
      console.log('Socket Client Connected:', socket.id);

      socket.on('join_room', (roomData) => {
        if (roomData.role === 'ROOT_ADMIN') {
          socket.join('ROOT_ADMIN_ROOM');
        }
        if (roomData.hotelId) {
          socket.join(`HOTEL_${roomData.hotelId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket Client Disconnected:', socket.id);
      });
    });
  }
  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn('Socket.io not initialized. Real-time updates skipped.');
    return null;
  }
  return io;
};