// TypeScript interfaces for progressive client registration

export interface ValidationError {
  field: string;
  reason: string;
  hint?: string;
}

export interface ValidationResponse {
  missing: ValidationError[];
  invalid: ValidationError[];
}

export interface PlanResponse {
  plan: ToolCall[];
}

export interface ToolCall {
  stepId: string;
  toolName: string;
  params: Record<string, any>;
  description: string;
}

export interface PartialClientParams {
  name?: string;
  email?: string;
  ein?: string;
}

export interface ClientField {
  key: keyof PartialClientParams;
  label: string;
  hint: string;
  required: boolean;
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  normalized?: string;
}

export interface DuplicateClientInfo {
  existingClientId: string;
  name: string;
  ein: string;
  email: string;
}

export interface DuplicateResponse {
  duplicate: DuplicateClientInfo;
}

export type PlannerResponse = ValidationResponse | PlanResponse | DuplicateResponse;

export interface ClientRegistrationState {
  partialParams: PartialClientParams;
  retryCount: Record<string, number>;
  currentField?: string;
  isComplete: boolean;
  isDuplicate: boolean;
  duplicateInfo?: DuplicateClientInfo;
}

// Field configuration
export const CLIENT_FIELDS: ClientField[] = [
  {
    key: 'name',
    label: 'Company Name',
    hint: 'Enter the full legal name of the company',
    required: true,
  },
  {
    key: 'ein',
    label: 'EIN (Tax ID)',
    hint: 'Format: 12-3456789 or 123456789',
    required: true,
  },
  {
    key: 'email',
    label: 'Email Address',
    hint: 'Enter the main contact email for this company',
    required: true,
  },
];

// Constants
export const MAX_RETRY_COUNT = 3;
export const FIELD_HINTS = {
  name: 'Enter the full legal name of the company (e.g., "Acme Corporation")',
  ein: 'Enter the 9-digit EIN in format 12-3456789 or 123456789',
  email: 'Enter a valid email address (e.g., contact@company.com)',
} as const;