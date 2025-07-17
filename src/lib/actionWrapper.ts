import { useChatStore } from '@/store/useChatStore';
import { supabase } from '@/integrations/supabase/client';

export type ChatAction = 'read'|'validate'|'edit'|'execute'|'error';

export async function withAction<T>(
  action: ChatAction,
  target: string,
  fn: () => Promise<T>,
  tool?: string,
  params?: any
): Promise<T> {
  const { setAction, clearAction, shouldShowBanner } = useChatStore.getState();

  if (shouldShowBanner()) {
    setAction(action, target);
  }

  // Log to Supabase function
  await supabase.functions.invoke('action-logger', {
    body: { action, target, tool, params, detail: params?.detail ?? null }
  });

  try {
    return await fn();
  } finally {
    clearAction();
  }
}