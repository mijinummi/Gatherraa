// src/monitoring/logger.ts

type LogLevel = 'error' | 'warn' | 'info';

interface LogPayload {
  level: LogLevel;
  message: string;
  stack?: string;
  metadata?: any;
  url: string;
  userAgent: string;
  timestamp: string;
}

const BACKEND_LOG_ENDPOINT = '/api/logs';

class Logger {
  private async sendToBackend(payload: LogPayload) {
    try {
      await fetch(BACKEND_LOG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Logging infrastructure failure - fallback to structured stderr
      if (typeof process !== 'undefined' && process.stderr) {
        process.stderr.write(JSON.stringify({ level: 'error', message: 'Failed to send log to backend', error: String(err), timestamp: new Date().toISOString() }) + '\n');
      }
    }
  }

  private buildPayload(
    level: LogLevel,
    message: string,
    stack?: string,
    metadata?: any,
  ): LogPayload {
    return {
      level,
      message,
      stack,
      metadata,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
    };
  }

  error(message: string, error?: any, metadata?: any) {
    const payload = this.buildPayload('error', message, error?.stack, metadata);

    // Development: structured console output
    if (typeof process === 'undefined' || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error ?? '', metadata ?? '');
    }
    this.sendToBackend(payload);
  }

  warn(message: string, metadata?: any) {
    const payload = this.buildPayload('warn', message, undefined, metadata);
    if (typeof process === 'undefined' || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, metadata ?? '');
    }
    this.sendToBackend(payload);
  }

  info(message: string, metadata?: any) {
    const payload = this.buildPayload('info', message, undefined, metadata);
    if (typeof process === 'undefined' || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, metadata ?? '');
    }
    this.sendToBackend(payload);
  }
}

export const logger = new Logger();
