/**
 * URL parameter validators for Express path/query params.
 * All params are strings from Express, so validation starts with string.
 */

import { assertTruthy } from '@fishka/assertions';
import { ParamValidator } from '../api.types';

/** Makes validator optional - returns undefined if value missing */
export function optional<T>(validator: ParamValidator<T>): ParamValidator<T | undefined> {
  return (value: unknown): T | undefined => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return validator(value);
  };
}

// ============================================================================
// URL Parameter validation (string-first API)
// ============================================================================

/** Operator that transforms string to T */
export type ParamOperator<T> = (value: string) => T;

/** Operator that transforms T to R */
export type Operator<T, R = T> = (value: T) => R;

/**
 * Creates a URL parameter validator. Input is always string (from Express).
 * Operators are applied in sequence to validate/transform the value.
 *
 * @example
 * param()                      // string
 * param(toInt)                 // number
 * param(toInt, min(1))         // number >= 1
 * param(minLength(3))          // string with min length
 * param(trim, lowercase)       // trimmed lowercase string
 */
export function param(): ParamValidator<string>;
export function param<A>(op1: ParamOperator<A>): ParamValidator<A>;
export function param<A, B>(op1: ParamOperator<A>, op2: Operator<A, B>): ParamValidator<B>;
export function param<A, B, C>(op1: ParamOperator<A>, op2: Operator<A, B>, op3: Operator<B, C>): ParamValidator<C>;
export function param<A, B, C, D>(
  op1: ParamOperator<A>,
  op2: Operator<A, B>,
  op3: Operator<B, C>,
  op4: Operator<C, D>,
): ParamValidator<D>;
export function param<A, B, C, D, E>(
  op1: ParamOperator<A>,
  op2: Operator<A, B>,
  op3: Operator<B, C>,
  op4: Operator<C, D>,
  op5: Operator<D, E>,
): ParamValidator<E>;
export function param(...operators: Array<(value: never) => unknown>): ParamValidator<unknown> {
  return (value: unknown): unknown => {
    assertTruthy(typeof value === 'string', `Expected string, got ${typeof value}`);
    let result: unknown = value;
    for (const op of operators) {
      result = op(result as never);
    }
    return result;
  };
}

// ============================================================================
// String → T operators (first in chain)
// ============================================================================

/** Parses string to integer */
export const toInt =
  (message?: string): ParamOperator<number> =>
  (value: string): number => {
    const num = Number(value);
    assertTruthy(Number.isInteger(num), message ?? `Expected integer, got '${value}'`);
    return num;
  };

/** Parses string to number */
export const toNumber =
  (message?: string): ParamOperator<number> =>
  (value: string): number => {
    const num = Number(value);
    assertTruthy(!isNaN(num), message ?? `Expected number, got '${value}'`);
    return num;
  };

/** Parses string to boolean ('true'/'false') */
export const toBool =
  (message?: string): ParamOperator<boolean> =>
  (value: string): boolean => {
    assertTruthy(value === 'true' || value === 'false', message ?? `Expected 'true' or 'false', got '${value}'`);
    return value === 'true';
  };

/** Validates value is one of allowed enum values */
export const oneOf =
  <T extends string>(...allowedValues: T[]): ParamOperator<T> =>
  (value: string): T => {
    assertTruthy(allowedValues.includes(value as T), `Expected one of [${allowedValues.join(', ')}], got '${value}'`);
    return value as T;
  };

// ============================================================================
// String operators (string → string)
// ============================================================================

/** Requires minimum string length */
export const minLength =
  (n: number, message?: string): ParamOperator<string> =>
  (value: string): string => {
    assertTruthy(value.length >= n, message ?? `Must be at least ${n} characters`);
    return value;
  };

/** Requires maximum string length */
export const maxLength =
  (n: number, message?: string): ParamOperator<string> =>
  (value: string): string => {
    assertTruthy(value.length <= n, message ?? `Must be at most ${n} characters`);
    return value;
  };

/** Requires string to match regex */
export const matches =
  (regex: RegExp, message?: string): ParamOperator<string> =>
  (value: string): string => {
    assertTruthy(regex.test(value), message ?? `Must match pattern ${regex}`);
    return value;
  };

/** Trims whitespace from string */
export const trim: ParamOperator<string> = (value: string): string => value.trim();

/** Converts string to lowercase */
export const lowercase: ParamOperator<string> = (value: string): string => value.toLowerCase();

/** Converts string to uppercase */
export const uppercase: ParamOperator<string> = (value: string): string => value.toUpperCase();

// ============================================================================
// Number operators (number → number)
// ============================================================================

/** Requires minimum value */
export const min =
  (n: number, message?: string): Operator<number> =>
  (value: number): number => {
    assertTruthy(value >= n, message ?? `Must be at least ${n}`);
    return value;
  };

/** Requires maximum value */
export const max =
  (n: number, message?: string): Operator<number> =>
  (value: number): number => {
    assertTruthy(value <= n, message ?? `Must be at most ${n}`);
    return value;
  };

/** Requires value to be in range [minVal, maxVal] */
export const range =
  (minVal: number, maxVal: number, message?: string): Operator<number> =>
  (value: number): number => {
    assertTruthy(value >= minVal && value <= maxVal, message ?? `Must be between ${minVal} and ${maxVal}`);
    return value;
  };

// ============================================================================
// Generic operators
// ============================================================================

/** Adds custom validation */
export const check =
  <T>(predicate: (value: T) => boolean, message: string): Operator<T> =>
  (value: T): T => {
    assertTruthy(predicate(value), message);
    return value;
  };

/** Transforms the value */
export const map =
  <T, R>(fn: (value: T) => R): Operator<T, R> =>
  (value: T): R =>
    fn(value);
