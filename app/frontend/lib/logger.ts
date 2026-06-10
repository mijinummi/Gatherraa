/**
 * Structured frontend logger for Gathera.
 *
 * Replaces raw console.* calls with structured, level-aware logging.
 * In production, logs are sent to a configurable backend endpoint.
 * In development, logs are pretty-printed with optional console fallback.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LoggerConfig {
  /** Backend endpoint to send logs to (production only) */
  endpoint?: string;
  /** Minimum log level to report */
  minLevel: LogLevel;
  /** Whether to run in production mode (suppresses console, sends to endpoint) */
  production: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'debug',
  production: typeof window !== 'undefined'
    ? window.location.hostname !== 'localhost'
    : false,
};

let config: LoggerConfig = { ...DEFAULT_CONFIG };

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function buildEntry(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
  error?: unknown,
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (metadata) {
    entry.metadata = metadata;
  }

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error !== undefined && error !== null) {
    entry.metadata = {
      ...(entry.metadata || {}),
      error: String(error),
    };
  }

  return entry;
}

async function sendToBackend(entry: LogEntry): Promise<void> {
  if (!config.endpoint) return;

  try {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      // Don't block page unload
      keepalive: true,
    });
  } catch {
    // Silently fail — we don't want logging to cause errors
  }
}

const logger = {
  configure(customConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...customConfig };
  },

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog('debug')) return;
    const entry = buildEntry('debug', message, metadata);
    if (!config.production) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, metadata ?? '');
    }
    sendToBackend(entry);
  },

  info(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog('info')) return;
    const entry = buildEntry('info', message, metadata);
    if (!config.production) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, metadata ?? '');
    }
    sendToBackend(entry);
  },

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog('warn')) return;
    const entry = buildEntry('warn', message, metadata);
    if (!config.production) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, metadata ?? '');
    }
    sendToBackend(entry);
  },

  error(message: string, error?: unknown, metadata?: Record<string, unknown>): void {
    if (!shouldLog('error')) return;
    const entry = buildEntry('error', message, metadata, error);
    if (!config.production) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error ?? '', metadata ?? '');
    }
    sendToBackend(entry);
  },
};

export { logger };
export type { LoggerConfig, LogLevel, LogEntry };
