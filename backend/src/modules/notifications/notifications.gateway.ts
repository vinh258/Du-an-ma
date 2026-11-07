import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/** Client kết nối: io(`${API}/notifications`, { auth: { token } }) rồi lắng nghe sự kiện "notification" */
@WebSocketGateway({ namespace: 'notifications', cors: { origin: true, credentials: true } })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string) || '';
      const payload = await this.jwt.verifyAsync(token);
      client.join(`user:${payload.sub}`); // mỗi user 1 room → nhiều tab/thiết bị đều nhận
    } catch {
      this.logger.debug('Socket bị từ chối: token không hợp lệ');
      client.disconnect(true);
    }
  }

  pushToUser(userId: number, data: unknown) {
    this.server?.to(`user:${userId}`).emit('notification', data);
  }
}
