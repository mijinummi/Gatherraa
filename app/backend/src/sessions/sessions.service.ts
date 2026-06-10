import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;

  private readonly logger = new Logger(SessionsService.name);

  constructor(private configService: ConfigService) {
    this.redisClient = createClient({
      url: this.configService.get<string>('REDIS_URL'),
    });
    
    this.redisClient.on('error', (err) => {
      this.logger.error('Redis Client Error', err instanceof Error ? err.stack : undefined);
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.connect();
      this.logger.log('Redis client connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error instanceof Error ? error.stack : undefined);
      // In development, we can continue without Redis
      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        this.logger.warn('Running without Redis session storage');
      }
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  async createSession(sessionId: string, userId: string, data: any = {}, ttl: number = 86400): Promise<boolean> {
    try {
      const sessionData = {
        userId,
        ...data,
        createdAt: new Date().toISOString(),
      };
      
      await this.redisClient.setEx(
        `session:${sessionId}`,
        ttl,
        JSON.stringify(sessionData),
      );
      
      // Also store session in user's session list
      await this.redisClient.sAdd(`user:sessions:${userId}`, sessionId);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to create session', error instanceof Error ? error.stack : undefined);
      return false;
    }
  }

  async getSession(sessionId: string): Promise<any> {
    try {
      const sessionData = await this.redisClient.get(`session:${sessionId}`);
      if (!sessionData) return null;
      
      return JSON.parse(sessionData);
    } catch (error) {
      this.logger.error('Failed to get session', error instanceof Error ? error.stack : undefined);
      return null;
    }
  }

  async updateSession(sessionId: string, data: any): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      const updatedSession = {
        ...session,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      await this.redisClient.setEx(
        `session:${sessionId}`,
        86400, // 24 hours
        JSON.stringify(updatedSession),
      );
      
      return true;
    } catch (error) {
      this.logger.error('Failed to update session', error instanceof Error ? error.stack : undefined);
      return false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        await this.redisClient.sRem(`user:sessions:${session.userId}`, sessionId);
      }
      
      await this.redisClient.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete session', error instanceof Error ? error.stack : undefined);
      return false;
    }
  }

  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const sessionIds = await this.redisClient.sMembers(`user:sessions:${userId}`);
      return sessionIds;
    } catch (error) {
      this.logger.error('Failed to get user sessions', error instanceof Error ? error.stack : undefined);
      return [];
    }
  }

  async invalidateUserSessions(userId: string): Promise<boolean> {
    try {
      const sessionIds = await this.getUserSessions(userId);
      
      // Delete all sessions
      const deletePromises = sessionIds.map(sessionId => 
        this.redisClient.del(`session:${sessionId}`)
      );
      
      await Promise.all(deletePromises);
      
      // Remove session list
      await this.redisClient.del(`user:sessions:${userId}`);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to invalidate user sessions', error instanceof Error ? error.stack : undefined);
      return false;
    }
  }

  async extendSession(sessionId: string, ttl: number = 86400): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;
      
      await this.redisClient.expire(`session:${sessionId}`, ttl);
      return true;
    } catch (error) {
      this.logger.error('Failed to extend session', error instanceof Error ? error.stack : undefined);
      return false;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      // This is handled automatically by Redis with EXPIRE
      // But we can implement additional cleanup logic if needed
      return 0;
    } catch (error) {
      this.logger.error('Failed to cleanup sessions', error instanceof Error ? error.stack : undefined);
      return 0;
    }
  }
}