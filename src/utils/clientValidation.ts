// Enhanced client validation utilities for progressive registration

import { z } from "zod";
import DOMPurify from "dompurify";
import type { 
  FieldValidationResult, 
  PartialClientParams, 
  ValidationError,
  ValidationResponse 
} from "@/types/registration";

// SECURITY: Input sanitization utilities
export const sanitizeString = (input: string, maxLength = 1000): string => {
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
  }).slice(0, maxLength);
};

export const sanitizeEmail = (email: string): string => {
  const sanitized = DOMPurify.sanitize(email.toLowerCase().trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  return sanitized.slice(0, 254); // RFC 5321 max email length
};

// Input normalization functions
export const normalizeEIN = (ein: string): string => {
  const sanitized = sanitizeString(ein, 12);
  // Remove any existing dashes and spaces
  const numbersOnly = sanitized.replace(/[-\s]/g, '');
  // Add dash if it's 9 digits
  if (/^\d{9}$/.test(numbersOnly)) {
    return numbersOnly.replace(/^(\d{2})(\d{7})$/, '$1-$2');
  }
  return sanitized;
};

export const normalizeName = (name: string): string => {
  return sanitizeString(name, 200).replace(/\s+/g, ' ');
};

export const normalizeEmail = (email: string): string => {
  return sanitizeEmail(email);
};

// Individual field validation functions
export const isValidName = (name: string): boolean => {
  if (!name || name.length === 0) return false;
  if (name.length > 200) return false;
  
  // Must contain at least one letter
  return /[a-zA-Z]/.test(name);
};

export const isValidEIN = (ein: string): boolean => {
  // Must be in format XX-XXXXXXX or XXXXXXXXX
  return /^\d{2}-?\d{7}$/.test(ein);
};

export const isValidEmail = (email: string): boolean => {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Field validation with normalization
export const validateField = (field: keyof PartialClientParams, value: string): FieldValidationResult => {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      error: `${field} is required`,
    };
  }

  switch (field) {
    case 'name': {
      const normalized = normalizeName(value);
      if (!isValidName(normalized)) {
        return {
          isValid: false,
          error: 'Company name must contain at least one letter and be less than 200 characters',
        };
      }
      return {
        isValid: true,
        normalized,
      };
    }
    
    case 'ein': {
      const normalized = normalizeEIN(value);
      if (!isValidEIN(normalized)) {
        return {
          isValid: false,
          error: 'EIN must be 9 digits in format 12-3456789 or 123456789',
        };
      }
      return {
        isValid: true,
        normalized,
      };
    }
    
    case 'email': {
      const normalized = normalizeEmail(value);
      if (!isValidEmail(normalized)) {
        return {
          isValid: false,
          error: 'Please enter a valid email address',
        };
      }
      return {
        isValid: true,
        normalized,
      };
    }
    
    default:
      return {
        isValid: false,
        error: 'Unknown field',
      };
  }
};

// Validate all collected parameters
export const validateClientParams = (params: PartialClientParams): ValidationResponse => {
  const missing: ValidationError[] = [];
  const invalid: ValidationError[] = [];

  // Check required fields
  const requiredFields: (keyof PartialClientParams)[] = ['name', 'ein', 'email'];
  
  for (const field of requiredFields) {
    const value = params[field];
    
    if (!value || value.trim().length === 0) {
      missing.push({
        field,
        reason: `${field} is required`,
        hint: getFieldHint(field),
      });
    } else {
      const validation = validateField(field, value);
      if (!validation.isValid) {
        invalid.push({
          field,
          reason: validation.error || 'Invalid value',
          hint: getFieldHint(field),
        });
      }
    }
  }

  return { missing, invalid };
};

// Helper function to get field hints
export const getFieldHint = (field: keyof PartialClientParams): string => {
  switch (field) {
    case 'name':
      return 'Enter the full legal name of the company (e.g., "Acme Corporation")';
    case 'ein':
      return 'Enter the 9-digit EIN in format 12-3456789 or 123456789';
    case 'email':
      return 'Enter a valid email address (e.g., contact@company.com)';
    default:
      return '';
  }
};

// Get the next missing field for progressive collection
export const getNextMissingField = (params: PartialClientParams): keyof PartialClientParams | null => {
  const fields: (keyof PartialClientParams)[] = ['name', 'ein', 'email'];
  
  for (const field of fields) {
    if (!params[field] || params[field]?.trim().length === 0) {
      return field;
    }
  }
  
  return null;
};

// Check if all required fields are collected
export const isClientParamsComplete = (params: PartialClientParams): boolean => {
  return Boolean(
    params.name?.trim() &&
    params.ein?.trim() &&
    params.email?.trim()
  );
};

// Get friendly field names for UI
export const getFieldLabel = (field: keyof PartialClientParams): string => {
  switch (field) {
    case 'name':
      return 'Company Name';
    case 'ein':
      return 'EIN (Tax ID)';
    case 'email':
      return 'Email Address';
    default:
      return field;
  }
};

// Convert to final client data for registration
export const toClientData = (params: PartialClientParams) => {
  if (!isClientParamsComplete(params)) {
    throw new Error('Cannot convert incomplete client parameters to client data');
  }

  return {
    name: normalizeName(params.name!),
    email: normalizeEmail(params.email!),
    taxid: normalizeEIN(params.ein!),
  };
};