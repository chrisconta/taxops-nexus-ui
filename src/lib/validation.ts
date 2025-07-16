import { z } from "zod";
import DOMPurify from "dompurify";

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

// SECURITY: Validation schemas with built-in sanitization
export const profileValidationSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be less than 100 characters")
    .transform(val => sanitizeString(val, 100))
    .refine(val => val.length > 0, "Display name cannot be empty after sanitization"),
  
  email: z
    .string()
    .email("Invalid email format")
    .max(254, "Email must be less than 254 characters")
    .transform(val => sanitizeEmail(val))
    .refine(val => val.includes('@'), "Email must contain @ symbol"),
});

export const clientValidationSchema = z.object({
  name: z
    .string()
    .min(1, "Client name is required")
    .max(200, "Client name must be less than 200 characters")
    .transform(val => sanitizeString(val, 200))
    .refine(val => val.length > 0, "Client name cannot be empty after sanitization"),
  
  taxid: z
    .string()
    .min(1, "Tax ID (EIN) is required")
    .regex(/^\d{2}-?\d{7}$/, { message: "Tax ID must be in the format XX-XXXXXXX or XXXXXXXXX" })
    .transform(val => {
      const sanitized = sanitizeString(val, 12);
      // Normalize to format with dash for consistency
      return sanitized.replace(/^(\d{2})(\d{7})$/, '$1-$2');
    }),
  
  email: z
    .string()
    .email("Invalid email format")
    .max(254, "Email must be less than 254 characters")
    .transform(val => sanitizeEmail(val)),
});

export const connectionValidationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters")
    .transform(val => sanitizeString(val, 100)),
  
  category: z
    .string()
    .min(1, "Category is required")
    .max(50, "Category must be less than 50 characters")
    .transform(val => sanitizeString(val, 50)),
  
  connection_type: z
    .string()
    .min(1, "Connection type is required")
    .max(50, "Connection type must be less than 50 characters")
    .transform(val => sanitizeString(val, 50)),
});

export const reportValidationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .transform(val => sanitizeString(val, 200)),
  
  report_type: z
    .string()
    .min(1, "Report type is required")
    .max(50, "Report type must be less than 50 characters")
    .transform(val => sanitizeString(val, 50)),
});

// SECURITY: Type exports for form validation
export type ProfileFormData = z.infer<typeof profileValidationSchema>;
export type ClientFormData = z.infer<typeof clientValidationSchema>;
export type ConnectionFormData = z.infer<typeof connectionValidationSchema>;
export type ReportFormData = z.infer<typeof reportValidationSchema>;