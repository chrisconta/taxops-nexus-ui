// SECURITY: Enhanced security utilities and middleware

import { supabase } from "@/integrations/supabase/client";

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// SECURITY: Rate limiting utility
export const rateLimit = (
  key: string, 
  maxRequests: number = 10, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
};

// SECURITY: Audit logging for sensitive operations
export const auditLog = async (
  action: string,
  details: Record<string, any> = {},
  severity: 'low' | 'medium' | 'high' = 'medium'
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log(`[AUDIT] ${action}`, {
      timestamp: new Date().toISOString(),
      user_id: user?.id || 'anonymous',
      user_email: user?.email || 'unknown',
      action,
      severity,
      details,
      user_agent: navigator.userAgent,
      url: window.location.href,
    });

    // In production, you might want to send this to a logging service
    // or store in a dedicated audit table
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

// SECURITY: Enhanced authentication checks
export const requireAuth = async (): Promise<{ user: any; session: any } | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (userError || sessionError || !user || !session) {
      auditLog('unauthorized_access_attempt', {
        userError: userError?.message,
        sessionError: sessionError?.message,
      }, 'high');
      return null;
    }

    return { user, session };
  } catch (error) {
    auditLog('auth_check_failed', { error: (error as Error).message }, 'high');
    return null;
  }
};

// SECURITY: Secure database operations with audit logging
export const secureDbOperation = async <T>(
  operation: () => Promise<{ data: T; error: any }>,
  operationName: string,
  auditDetails: Record<string, any> = {}
): Promise<{ data: T | null; error: any }> => {
  const auth = await requireAuth();
  if (!auth) {
    return { data: null, error: new Error('Authentication required') };
  }

  try {
    auditLog(`db_operation_start:${operationName}`, auditDetails, 'low');
    
    const result = await operation();
    
    if (result.error) {
      auditLog(`db_operation_error:${operationName}`, {
        ...auditDetails,
        error: result.error.message,
      }, 'medium');
    } else {
      auditLog(`db_operation_success:${operationName}`, auditDetails, 'low');
    }

    return result;
  } catch (error) {
    auditLog(`db_operation_exception:${operationName}`, {
      ...auditDetails,
      error: (error as Error).message,
    }, 'high');
    
    return { data: null, error };
  }
};

// SECURITY: Content Security Policy headers (for future implementation)
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// SECURITY: Anomaly detection patterns
export const detectAnomalies = (action: string, details: Record<string, any>): boolean => {
  const userId = details.user_id;
  if (!userId) return false;

  // Simple anomaly detection - can be enhanced
  const key = `anomaly_${userId}_${action}`;
  const recentActions = rateLimitMap.get(key);
  
  // Flag if too many similar actions in short time
  if (recentActions && recentActions.count > 50) {
    auditLog('anomaly_detected', {
      action,
      user_id: userId,
      count: recentActions.count,
    }, 'high');
    return true;
  }

  return false;
};

// SECURITY: Initialize security monitoring
export const initSecurity = () => {
  // Monitor for common attack patterns
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message.includes('script')) {
      auditLog('potential_xss_attempt', {
        error: event.error.message,
        filename: event.filename,
        lineno: event.lineno,
      }, 'high');
    }
  });

  // Monitor for suspicious console access
  if (process.env.NODE_ENV === 'production') {
    let devtools = false;
    setInterval(() => {
      if (console.clear.toString().includes('clear')) {
        if (!devtools) {
          devtools = true;
          auditLog('devtools_opened', {}, 'medium');
        }
      }
    }, 1000);
  }
};

export default {
  rateLimit,
  auditLog,
  requireAuth,
  secureDbOperation,
  securityHeaders,
  detectAnomalies,
  initSecurity,
};