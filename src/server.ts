import express from 'express';
import compression from 'compression';
import http from 'http';
import { Server, Socket } from 'socket.io';
import next from 'next';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db';
import { config } from './config/config';
import { User } from './models/User';
import { CommunityMessage } from './models/CommunityMessage';
import { CommunityGroup } from './models/CommunityGroup';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '5000', 10);

// Initialize Next.js programmatic application
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

// Memory store for online users: maps userId -> Set of socketIds
const onlineUsers = new Map<string, { socketIds: Set<string>; name: string; email: string; status?: string }>();

// Helper to check authorization and extract user details
const authenticateSocket = async (socket: Socket, nextFn: (err?: any) => void) => {
  try {
    let token = socket.handshake.auth?.token;

    // Fallback: search cookie
    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';').reduce((acc: any, cookieStr: string) => {
        const parts = cookieStr.split('=');
        acc[parts[0].trim()] = (parts[1] || '').trim();
        return acc;
      }, {});
      token = cookies.accessToken;
    }

    if (!token) {
      return nextFn(new Error('Authentication failed: Token missing'));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return nextFn(new Error('Authentication failed: User not found'));
    }

    socket.data.userId = user._id.toString();
    socket.data.user = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      hotelId: user.hotel?.toString() || null,
      department: user.department || null
    };

    nextFn();
  } catch (error) {
    return nextFn(new Error('Authentication failed: Invalid token'));
  }
};

nextApp.prepare().then(async () => {
  const app = express();
  app.use(compression());
  const server = http.createServer(app);

  // Setup Socket.IO with CORS settings
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingInterval: 10000,
    pingTimeout: 5000
  });

  // Assign globally for API Route access
  (global as any).io = io;

  // Ensure database connection is online
  await connectDB();

  // Socket authentication middleware
  io.use(authenticateSocket);

  // Socket Connection Handlers
  io.on('connection', (socket: Socket) => {
    const { userId, user } = socket.data;
    const userDisplayName = `${user.firstName} ${user.lastName}`;

    console.log(`[Socket Connected] User: ${userDisplayName} (${userId}) | Socket: ${socket.id}`);

    // Manage online status cache mapping
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, {
        socketIds: new Set([socket.id]),
        name: userDisplayName,
        email: user.email,
        status: 'online'
      });
      // Broadcast online status to all users
      io.emit('user_status_change', { userId, status: 'online', name: userDisplayName });
    } else {
      const cache = onlineUsers.get(userId);
      if (cache) {
        cache.socketIds.add(socket.id);
        cache.status = 'online';
      }
      io.emit('user_status_change', { userId, status: 'online', name: userDisplayName });
    }

    // Join user-specific room for notifications
    socket.join(`user_${userId}`);

    // Custom user status event handler
    socket.on('user_status_set', (status: 'online' | 'away' | 'offline') => {
      const cache = onlineUsers.get(userId);
      if (cache) {
        cache.status = status === 'offline' ? 'online' : status;
      }
      io.emit('user_status_change', { userId, status, name: userDisplayName });
    });

    // Join room for root admin or specific hotel tasks monitoring
    socket.on('join_room', (roomData: any) => {
      if (roomData?.role === 'ROOT_ADMIN') {
        socket.join('ROOT_ADMIN_ROOM');
        console.log(`[Socket Room Joined] User: ${userDisplayName} joined ROOT_ADMIN_ROOM`);
      }
      if (roomData?.hotelId) {
        socket.join(`HOTEL_${roomData.hotelId}`);
        console.log(`[Socket Room Joined] User: ${userDisplayName} joined HOTEL_${roomData.hotelId}`);
      }
    });

    // Handle joining chat rooms corresponding to specific community groups
    socket.on('join_group', (groupId: string) => {
      socket.join(`group_${groupId}`);
      console.log(`[Group Joined] User: ${userDisplayName} joined group_${groupId}`);
    });

    // Handle leaving a group room
    socket.on('leave_group', (groupId: string) => {
      socket.leave(`group_${groupId}`);
      console.log(`[Group Left] User: ${userDisplayName} left group_${groupId}`);
    });

    // Typing Status Broadcasts
    socket.on('typing_start', (groupId: string) => {
      socket.to(`group_${groupId}`).emit('user_typing_start', { groupId, userId, name: userDisplayName });
    });

    socket.on('typing_stop', (groupId: string) => {
      socket.to(`group_${groupId}`).emit('user_typing_stop', { groupId, userId });
    });

    // Handle seen confirmations
    socket.on('mark_seen', async ({ messageId, groupId }: { messageId: string; groupId: string }) => {
      try {
        const updatedMsg = await CommunityMessage.findByIdAndUpdate(
          messageId,
          { 
            $addToSet: { seenBy: { user: userId, seenAt: new Date() } } 
          },
          { new: true }
        ).populate('sender', 'firstName lastName photoUrl role');

        if (updatedMsg) {
          io.to(`group_${groupId}`).emit('message_updated', updatedMsg);
        }
      } catch (err) {
        console.error('Error updating seen status via socket:', err);
      }
    });

    // Disconnection tracking
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] User: ${userDisplayName} | Socket: ${socket.id}`);
      
      const userCache = onlineUsers.get(userId);
      if (userCache) {
        userCache.socketIds.delete(socket.id);
        if (userCache.socketIds.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline status
          io.emit('user_status_change', { 
            userId, 
            status: 'offline', 
            lastSeen: new Date().toISOString() 
          });

          // Call session cleanup on disconnect
          (async () => {
            try {
              const { CallSession } = await import('./models/CallSession');
              const activeSessions = await CallSession.find({
                participants: userId,
                status: 'ongoing'
              });

              for (const session of activeSessions) {
                session.participants = session.participants.filter(
                  (pId: any) => pId.toString() !== userId
                );
                if (session.participants.length === 0) {
                  session.status = 'ended';
                  session.endedAt = new Date();

                  const duration = Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
                  const logPayload = {
                    group: session.group,
                    caller: session.caller,
                    participants: [userId],
                    startedAt: session.startedAt,
                    endedAt: session.endedAt,
                    duration
                  };

                  if (session.callType === 'video') {
                    const { VideoCallLog } = await import('./models/VideoCallLog');
                    await VideoCallLog.create(logPayload);
                  } else {
                    const { CallLog } = await import('./models/CallLog');
                    await CallLog.create(logPayload);
                  }
                }
                await session.save();

                const populatedCall = await CallSession.findById(session._id)
                  .populate('caller', 'firstName lastName photoUrl')
                  .populate('participants', 'firstName lastName photoUrl role department');

                io.to(`group_${session.group.toString()}`).emit('call_updated', populatedCall);
                if (session.status === 'ended') {
                  io.to(`group_${session.group.toString()}`).emit('call_ended', session._id.toString());
                }
              }
            } catch (err) {
              console.error('[Socket Call Cleanup Error]:', err);
            }
          })();
        }
      }
    });
  });

  // Make online list queryable by HTTP API endpoints
  app.get('/api/community/realtime/online', (req, res) => {
    const onlineList = Array.from(onlineUsers.keys());
    const onlineStatuses = Array.from(onlineUsers.entries()).reduce((acc, [uId, details]) => {
      acc[uId] = details.status || 'online';
      return acc;
    }, {} as Record<string, string>);
    res.json({ status: 'success', data: { onlineUsers: onlineList, onlineStatuses } });
  });

  // Serve Next.js requests
  app.all('*', (req, res) => {
    return nextHandler(req, res);
  });

  server.listen(port, () => {
    console.log(`====================================================`);
    console.log(` OXY-HR PRO Operations Community Server is Active!`);
    console.log(` Local Gateway: http://localhost:${port}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`====================================================`);
  });
}).catch((err) => {
  console.error('Programmatic Next.js launch error:', err);
  process.exit(1);
});
