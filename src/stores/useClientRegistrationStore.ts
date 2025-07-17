// Client registration store for progressive data collection

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  PartialClientParams, 
  ClientRegistrationState, 
  DuplicateClientInfo,
  ValidationResponse 
} from '@/types/registration';
import { 
  validateField, 
  validateClientParams, 
  getNextMissingField, 
  isClientParamsComplete,
  toClientData 
} from '@/utils/clientValidation';
import { MAX_RETRY_COUNT } from '@/types/registration';

interface ClientRegistrationStore extends ClientRegistrationState {
  // Actions
  setField: (field: keyof PartialClientParams, value: string) => boolean;
  validateAndSetField: (field: keyof PartialClientParams, value: string) => { success: boolean; error?: string };
  incrementRetry: (field: keyof PartialClientParams) => void;
  resetRetries: () => void;
  reset: () => void;
  canRetry: (field: keyof PartialClientParams) => boolean;
  getRetryCount: (field: keyof PartialClientParams) => number;
  getValidationResponse: () => ValidationResponse;
  getNextField: () => keyof PartialClientParams | null;
  setDuplicateInfo: (info: DuplicateClientInfo) => void;
  clearDuplicateInfo: () => void;
  getFinalClientData: () => ReturnType<typeof toClientData> | null;
  getProgress: () => { completed: number; total: number; percentage: number };
}

const initialState: ClientRegistrationState = {
  partialParams: {},
  retryCount: {},
  currentField: undefined,
  isComplete: false,
  isDuplicate: false,
  duplicateInfo: undefined,
};

export const useClientRegistrationStore = create<ClientRegistrationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setField: (field, value) => {
        const validation = validateField(field, value);
        if (validation.isValid) {
          set(state => ({
            partialParams: {
              ...state.partialParams,
              [field]: validation.normalized || value,
            },
            currentField: getNextMissingField({
              ...state.partialParams,
              [field]: validation.normalized || value,
            }),
            isComplete: isClientParamsComplete({
              ...state.partialParams,
              [field]: validation.normalized || value,
            }),
            isDuplicate: false,
            duplicateInfo: undefined,
          }));
          return true;
        }
        return false;
      },

      validateAndSetField: (field, value) => {
        const validation = validateField(field, value);
        if (validation.isValid) {
          set(state => ({
            partialParams: {
              ...state.partialParams,
              [field]: validation.normalized || value,
            },
            currentField: getNextMissingField({
              ...state.partialParams,
              [field]: validation.normalized || value,
            }),
            isComplete: isClientParamsComplete({
              ...state.partialParams,
              [field]: validation.normalized || value,
            }),
            isDuplicate: false,
            duplicateInfo: undefined,
          }));
          return { success: true };
        }
        return { success: false, error: validation.error };
      },

      incrementRetry: (field) => {
        set(state => ({
          retryCount: {
            ...state.retryCount,
            [field]: (state.retryCount[field] || 0) + 1,
          },
        }));
      },

      resetRetries: () => {
        set({ retryCount: {} });
      },

      reset: () => {
        set(initialState);
      },

      canRetry: (field) => {
        const count = get().retryCount[field] || 0;
        return count < MAX_RETRY_COUNT;
      },

      getRetryCount: (field) => {
        return get().retryCount[field] || 0;
      },

      getValidationResponse: () => {
        return validateClientParams(get().partialParams);
      },

      getNextField: () => {
        return getNextMissingField(get().partialParams);
      },

      setDuplicateInfo: (info) => {
        set({
          isDuplicate: true,
          duplicateInfo: info,
        });
      },

      clearDuplicateInfo: () => {
        set({
          isDuplicate: false,
          duplicateInfo: undefined,
        });
      },

      getFinalClientData: () => {
        const { partialParams, isComplete } = get();
        if (!isComplete) return null;
        
        try {
          return toClientData(partialParams);
        } catch {
          return null;
        }
      },

      getProgress: () => {
        const { partialParams } = get();
        const fields = ['name', 'ein', 'email'] as const;
        const completed = fields.filter(field => 
          partialParams[field] && partialParams[field]!.trim().length > 0
        ).length;
        
        return {
          completed,
          total: fields.length,
          percentage: Math.round((completed / fields.length) * 100),
        };
      },
    }),
    {
      name: 'client-registration-storage',
      partialize: (state) => ({
        partialParams: state.partialParams,
        retryCount: state.retryCount,
        currentField: state.currentField,
        isComplete: state.isComplete,
        isDuplicate: state.isDuplicate,
        duplicateInfo: state.duplicateInfo,
      }),
    }
  )
);