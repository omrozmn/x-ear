/**
 * Common Type Utilities
 * 
 * This file contains reusable type definitions to eliminate `any` types
 * across the codebase and improve type safety.
 */

import type React from 'react';

// ============================================================================
// Event Handler Types
// ============================================================================

/**
 * Common event handler types for form elements
 */
export type InputChangeHandler = React.ChangeEvent<HTMLInputElement>;
export type TextareaChangeHandler = React.ChangeEvent<HTMLTextAreaElement>;
export type SelectChangeHandler = React.ChangeEvent<HTMLSelectElement>;
export type FormSubmitHandler = React.FormEvent<HTMLFormElement>;
export type ButtonClickHandler = React.MouseEvent<HTMLButtonElement>;
export type DivClickHandler = React.MouseEvent<HTMLDivElement>;

/**
 * Generic change event handler
 */
export type ChangeEventHandler<T extends HTMLElement = HTMLInputElement> = React.ChangeEvent<T>;

/**
 * Generic mouse event handler
 */
export type MouseEventHandler<T extends HTMLElement = HTMLButtonElement> = React.MouseEvent<T>;

/**
 * Generic keyboard event handler
 */
export type KeyboardEventHandler<T extends HTMLElement = HTMLInputElement> = React.KeyboardEvent<T>;

/**
 * Generic focus event handler
 */
export type FocusEventHandler<T extends HTMLElement = HTMLInputElement> = React.FocusEvent<T>;

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Base form field value types
 */
export type FormFieldValue = string | number | boolean | null | undefined;

/**
 * Form data record type
 */
export type FormData = Record<string, FormFieldValue | FormFieldValue[]>;

/**
 * Form validation error type
 */
export interface FormValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Form state type
 */
export interface FormState<T extends FormData = FormData> {
  data: T;
  errors: FormValidationError[];
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T = unknown> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/**
 * API error type
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

// ============================================================================
// Generic Utility Types
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract keys of type T that have value type V
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Make specific keys optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific keys required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Optional type
 */
export type Optional<T> = T | undefined;

/**
 * Maybe type (nullable or undefined)
 */
export type Maybe<T> = T | null | undefined;

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Base component props with children
 */
export interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Component props with required children
 */
export interface ComponentPropsWithChildren extends ComponentProps {
  children: React.ReactNode;
}

/**
 * Props with data-testid for testing
 */
export interface TestableProps {
  'data-testid'?: string;
}

// ============================================================================
// Async Operation Types
// ============================================================================

/**
 * Async operation state
 */
export type AsyncState<T = unknown, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

/**
 * Promise result type
 */
export type PromiseResult<T> = Promise<{ success: true; data: T } | { success: false; error: Error }>;

// ============================================================================
// Collection Types
// ============================================================================

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Tuple of specific length
 */
export type Tuple<T, N extends number> = N extends N ? (number extends N ? T[] : _TupleOf<T, N, []>) : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;

/**
 * Array or single item
 */
export type ArrayOrSingle<T> = T | T[];

// ============================================================================
// String Utility Types
// ============================================================================

/**
 * String literal union from array
 */
export type StringLiteralUnion<T extends readonly string[]> = T[number];

/**
 * Branded string type for type safety
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Email string type
 */
export type Email = Brand<string, 'Email'>;

/**
 * URL string type
 */
export type URL = Brand<string, 'URL'>;

/**
 * UUID string type
 */
export type UUID = Brand<string, 'UUID'>;

// ============================================================================
// Function Types
// ============================================================================

/**
 * Generic callback function
 */
export type Callback<T = void> = () => T;

/**
 * Generic callback with single argument
 */
export type CallbackWithArg<A, R = void> = (arg: A) => R;

/**
 * Generic callback with multiple arguments
 */
export type CallbackWithArgs<A extends unknown[], R = void> = (...args: A) => R;

/**
 * Async callback
 */
export type AsyncCallback<T = void> = () => Promise<T>;

/**
 * Async callback with argument
 */
export type AsyncCallbackWithArg<A, R = void> = (arg: A) => Promise<R>;

// ============================================================================
// Object Utility Types
// ============================================================================

/**
 * Ensure object has at least one property
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Ensure object has exactly one property
 */
export type ExactlyOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>;
}[keyof T];

/**
 * Mutable version of readonly type
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Value of object type
 */
export type ValueOf<T> = T[keyof T];

/**
 * Entries type for Object.entries
 */
export type Entries<T> = [keyof T, ValueOf<T>][];

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is an array
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if value is a function
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * Check if value is a promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (isObject(value) && isFunction((value as { then?: unknown }).then));
}

// ============================================================================
// Exports
// ============================================================================

export type {
  // Re-export React types for convenience
  React,
};
