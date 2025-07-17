import { useState, useCallback, useEffect } from 'react';

export interface ChatLogEntry {
  id: string;
  timestamp: string;
  conversationId: string;
  type: 'message' | 'system' | 'process' | 'error';
  action: string;
  details: string;
  data?: any;
  status: 'success' | 'error' | 'pending' | 'info';
}

export interface ChatLogSession {
  id: string;
  conversationId: string;
  title: string;
  startTime: string;
  endTime?: string;
  entries: ChatLogEntry[];
  status: 'active' | 'completed' | 'failed';
}

const MAX_LOG_ENTRIES = 1000;
const MAX_SESSIONS = 50;

class ChatLogger {
  private sessions: ChatLogSession[] = [];
  private currentSession: ChatLogSession | null = null;
  private listeners: ((sessions: ChatLogSession[]) => void)[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('chat-logger-sessions');
      if (stored) {
        this.sessions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load chat logger sessions:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('chat-logger-sessions', JSON.stringify(this.sessions));
    } catch (error) {
      console.error('Failed to save chat logger sessions:', error);
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.sessions));
  }

  subscribe(listener: (sessions: ChatLogSession[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  startSession(conversationId: string, title: string) {
    // End current session if exists
    if (this.currentSession) {
      this.endSession();
    }

    this.currentSession = {
      id: crypto.randomUUID(),
      conversationId,
      title,
      startTime: new Date().toISOString(),
      entries: [],
      status: 'active'
    };

    this.sessions.unshift(this.currentSession);
    
    // Keep only the most recent sessions
    if (this.sessions.length > MAX_SESSIONS) {
      this.sessions = this.sessions.slice(0, MAX_SESSIONS);
    }

    this.log('system', 'Session Started', `New chat session: ${title}`);
    this.saveToStorage();
    this.notify();
  }

  endSession(status: 'completed' | 'failed' = 'completed') {
    if (this.currentSession) {
      this.currentSession.endTime = new Date().toISOString();
      this.currentSession.status = status;
      this.log('system', 'Session Ended', `Session completed with status: ${status}`);
      this.currentSession = null;
      this.saveToStorage();
      this.notify();
    }
  }

  log(type: ChatLogEntry['type'], action: string, details: string, data?: any, status: ChatLogEntry['status'] = 'info') {
    if (!this.currentSession) {
      return;
    }

    const entry: ChatLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      conversationId: this.currentSession.conversationId,
      type,
      action,
      details,
      data,
      status
    };

    this.currentSession.entries.push(entry);

    // Keep only the most recent entries
    if (this.currentSession.entries.length > MAX_LOG_ENTRIES) {
      this.currentSession.entries = this.currentSession.entries.slice(-MAX_LOG_ENTRIES);
    }

    this.saveToStorage();
    this.notify();
  }

  logMessage(author: 'user' | 'agent', content: string, messageId?: string) {
    const action = author === 'user' ? 'User Message' : 'Agent Message';
    const details = `${author}: ${content.length > 100 ? content.substring(0, 100) + '...' : content}`;
    this.log('message', action, details, { messageId, author, content });
  }

  logSystemRoute(from: string, to: string, reason?: string) {
    const details = `Navigated from ${from} to ${to}${reason ? ` - ${reason}` : ''}`;
    this.log('system', 'Route Change', details, { from, to, reason });
  }

  logProcess(processName: string, status: 'started' | 'completed' | 'failed', details: string, data?: any) {
    const logStatus = status === 'started' ? 'pending' : status === 'completed' ? 'success' : 'error';
    this.log('process', processName, `${processName} ${status}: ${details}`, data, logStatus);
  }

  logError(error: Error | string, context?: string, data?: any) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const details = context ? `${context}: ${errorMessage}` : errorMessage;
    this.log('error', 'Error', details, { error: errorMessage, context, data }, 'error');
  }

  getCurrentSession() {
    return this.currentSession;
  }

  getSessions() {
    return this.sessions;
  }

  clearSessions() {
    this.sessions = [];
    this.currentSession = null;
    this.saveToStorage();
    this.notify();
  }

  getSessionById(id: string) {
    return this.sessions.find(session => session.id === id);
  }
}

const chatLogger = new ChatLogger();

export const useChatLogger = () => {
  const [sessions, setSessions] = useState<ChatLogSession[]>(chatLogger.getSessions());

  useEffect(() => {
    const unsubscribe = chatLogger.subscribe(setSessions);
    return unsubscribe;
  }, []);

  const startSession = useCallback((conversationId: string, title: string) => {
    chatLogger.startSession(conversationId, title);
  }, []);

  const endSession = useCallback((status: 'completed' | 'failed' = 'completed') => {
    chatLogger.endSession(status);
  }, []);

  const logMessage = useCallback((author: 'user' | 'agent', content: string, messageId?: string) => {
    chatLogger.logMessage(author, content, messageId);
  }, []);

  const logSystemRoute = useCallback((from: string, to: string, reason?: string) => {
    chatLogger.logSystemRoute(from, to, reason);
  }, []);

  const logProcess = useCallback((processName: string, status: 'started' | 'completed' | 'failed', details: string, data?: any) => {
    chatLogger.logProcess(processName, status, details, data);
  }, []);

  const logError = useCallback((error: Error | string, context?: string, data?: any) => {
    chatLogger.logError(error, context, data);
  }, []);

  const clearSessions = useCallback(() => {
    chatLogger.clearSessions();
  }, []);

  const getCurrentSession = useCallback(() => {
    return chatLogger.getCurrentSession();
  }, []);

  const getSessionById = useCallback((id: string) => {
    return chatLogger.getSessionById(id);
  }, []);

  return {
    sessions,
    startSession,
    endSession,
    logMessage,
    logSystemRoute,
    logProcess,
    logError,
    clearSessions,
    getCurrentSession,
    getSessionById
  };
};

export default chatLogger;
