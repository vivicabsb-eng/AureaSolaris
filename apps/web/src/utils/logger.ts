type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  duration?: number;
  success?: boolean;
}

interface MetricEntry extends LogEntry {
  metric: 'IPC' | 'ASTRO' | 'AI';
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDevelopment = import.meta.env.DEV;
const minLevel: LogLevel = isDevelopment ? 'debug' : 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatOutput(entry: LogEntry | MetricEntry): string {
  if (isDevelopment) {
    const icon = entry.level === 'error' ? '❌' 
               : entry.level === 'warn' ? '⚠️' 
               : entry.level === 'info' ? 'ℹ️' : '🔍';
    const meta = entry.duration !== undefined ? ` [${entry.duration}ms]` : '';
    const success = entry.success !== undefined ? ` (${entry.success ? 'OK' : 'FAIL'})` : '';
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `${icon} [${entry.category}] ${entry.message}${meta}${success}${data}`;
  }
  return JSON.stringify(entry);
}

function createEntry(
  level: LogLevel,
  category: string,
  message: string,
  data?: unknown,
  duration?: number,
  success?: boolean
): LogEntry | MetricEntry {
  const base: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...(data !== undefined && { data }),
    ...(duration !== undefined && { duration }),
    ...(success !== undefined && { success }),
  };
  return base as LogEntry | MetricEntry;
}

export const logger = {
  debug(category: string, message: string, data?: unknown) {
    if (!shouldLog('debug')) return;
    const entry = createEntry('debug', category, message, data);
    console.debug(formatOutput(entry));
  },

  info(category: string, message: string, data?: unknown) {
    if (!shouldLog('info')) return;
    const entry = createEntry('info', category, message, data);
    console.info(formatOutput(entry));
  },

  warn(category: string, message: string, data?: unknown) {
    if (!shouldLog('warn')) return;
    const entry = createEntry('warn', category, message, data);
    console.warn(formatOutput(entry));
  },

  error(category: string, message: string, data?: unknown) {
    if (!shouldLog('error')) return;
    const entry = createEntry('error', category, message, data);
    console.error(formatOutput(entry));
  },

  metricIPC(method: string, duration: number, success: boolean) {
    if (!shouldLog('info')) return;
    const entry: MetricEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'IPC',
      message: method,
      duration,
      success,
      metric: 'IPC',
    };
    console.info(formatOutput(entry));
  },

  metricAstro(operation: string, duration: number) {
    if (!shouldLog('info')) return;
    const entry: MetricEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'ASTRO',
      message: operation,
      duration,
      metric: 'ASTRO',
    };
    console.info(formatOutput(entry));
  },

  metricAI(agent: string, model: string, duration: number, tokens?: number) {
    if (!shouldLog('info')) return;
    const entry: MetricEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'AI',
      message: agent,
      data: { model, ...(tokens !== undefined && { tokens }) },
      duration,
      metric: 'AI',
    };
    console.info(formatOutput(entry));
  },

  startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  },
};

export function createLogger(category: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(category, message, data),
    info: (message: string, data?: unknown) => logger.info(category, message, data),
    warn: (message: string, data?: unknown) => logger.warn(category, message, data),
    error: (message: string, data?: unknown) => logger.error(category, message, data),
    metricIPC: (method: string, duration: number, success: boolean) => 
      logger.metricIPC(`${category}:${method}`, duration, success),
    metricAstro: (operation: string, duration: number) => 
      logger.metricAstro(`${category}:${operation}`, duration),
    metricAI: (agent: string, model: string, duration: number, tokens?: number) => 
      logger.metricAI(`${category}:${agent}`, model, duration, tokens),
    startTimer: () => logger.startTimer(),
  };
}

export const ipcLogger = createLogger('IPC');
export const astroLogger = createLogger('ASTRO');
export const aiLogger = createLogger('AI');
export const uiLogger = createLogger('UI');
export const appLogger = createLogger('APP');
