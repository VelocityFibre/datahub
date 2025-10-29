import { z } from 'zod';
import { ValidationError } from './error-handler.js';

/**
 * Validate data against a Zod schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Data validation failed', {
        errors: error.errors,
      });
    }
    throw error;
  }
}

/**
 * Common validation schemas
 */

// Date validation
export const dateSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format' }
);

// Email validation
export const emailSchema = z.string().email();

// URL validation
export const urlSchema = z.string().url();

// Positive number validation
export const positiveNumberSchema = z.number().positive();

// Non-empty string validation
export const nonEmptyStringSchema = z.string().min(1);

/**
 * Validate environment variables
 */
export function validateEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Sanitize string for SQL (basic sanitization, use parameterized queries when possible)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .trim();
}

/**
 * Validate SQL identifier (table name, column name, etc.)
 */
export function validateSqlIdentifier(identifier: string): boolean {
  // Only allow alphanumeric characters and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  // Expect at least 32 characters for a secure API key
  return apiKey.length >= 32;
}
