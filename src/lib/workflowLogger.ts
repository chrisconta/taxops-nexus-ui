export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogSource = 'ui' | 'api' | 'ai' | 'execution' | 'validation';

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  executionId?: string;
  stepIndex?: number;
}

export class WorkflowLogger {
  private static instance: WorkflowLogger;
  private logs: LogEntry[] = [];
  private listeners: ((entry: LogEntry) => void)[] = [];
  private maxLogs = 1000;

  static getInstance(): WorkflowLogger {
    if (!WorkflowLogger.instance) {
      WorkflowLogger.instance = new WorkflowLogger();
    }
    return WorkflowLogger.instance;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  log(level: LogLevel, source: LogSource, message: string, details?: Record<string, any>, executionId?: string, stepIndex?: number) {
    const entry: LogEntry = {
      id: this.generateId(),
      level,
      source,
      message,
      details,
      timestamp: new Date(),
      executionId,
      stepIndex
    };

    this.logs.unshift(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const color = this.getLogColor(level);
      console.log(
        `%c[${source.toUpperCase()}] ${message}`,
        `color: ${color}; font-weight: bold;`,
        details || ''
      );
    }
  }

  private getLogColor(level: LogLevel): string {
    switch (level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'debug': return '#6b7280';
      default: return '#000000';
    }
  }

  // Convenience methods
  info(source: LogSource, message: string, details?: Record<string, any>, executionId?: string, stepIndex?: number) {
    this.log('info', source, message, details, executionId, stepIndex);
  }

  warn(source: LogSource, message: string, details?: Record<string, any>, executionId?: string, stepIndex?: number) {
    this.log('warn', source, message, details, executionId, stepIndex);
  }

  error(source: LogSource, message: string, details?: Record<string, any>, executionId?: string, stepIndex?: number) {
    this.log('error', source, message, details, executionId, stepIndex);
  }

  debug(source: LogSource, message: string, details?: Record<string, any>, executionId?: string, stepIndex?: number) {
    this.log('debug', source, message, details, executionId, stepIndex);
  }

  // Listeners for real-time log updates
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get filtered logs
  getLogs(filters?: {
    level?: LogLevel[];
    source?: LogSource[];
    executionId?: string;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = this.logs;

    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => filters.level!.includes(log.level));
    }

    if (filters?.source) {
      filteredLogs = filteredLogs.filter(log => filters.source!.includes(log.source));
    }

    if (filters?.executionId) {
      filteredLogs = filteredLogs.filter(log => log.executionId === filters.executionId);
    }

    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  clear() {
    this.logs = [];
  }

  // API call logging helper
  logApiCall(source: LogSource, url: string, method: string, startTime: number, response?: any, error?: any) {
    const duration = Date.now() - startTime;
    const success = !error;
    
    this.log(
      success ? 'info' : 'error',
      source,
      `${method.toUpperCase()} ${url} ${success ? 'completed' : 'failed'}`,
      {
        method,
        url,
        duration,
        success,
        response: success ? response : undefined,
        error: error ? { message: error.message, stack: error.stack } : undefined
      }
    );
  }

  // AI integration logging helper
  logAiInteraction(prompt: string, response: string, confidence?: number, startTime?: number) {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    this.log('info', 'ai', 'DeepSeek interaction completed', {
      prompt: prompt.substring(0, 100) + '...',
      response: response.substring(0, 200) + '...',
      confidence,
      duration,
      promptLength: prompt.length,
      responseLength: response.length
    });
  }

  // UI interaction logging helper
  logUiEvent(event: string, component: string, details?: Record<string, any>) {
    this.log('debug', 'ui', `${component}: ${event}`, details);
  }
}
