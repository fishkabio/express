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

/** Operator that transforms string to T */
export type ParamOperator<T> = (value: string) => T;

/** Operator that transforms T to R */
export type Operator<T, R = T> = (value: T) => R;

/**
 * Creates a URL parameter validator. Input is always string (from Express).
 * Operators are applied in sequence to validate/transform the value.
 *
 * @example
 * check()                      // string
 * check(toInt)                 // number
 * check(toInt, min(1))         // number >= 1
 * check(minLength(3))          // string with min length
 * check(trim, lowercase)       // trimmed lowercase string
 */
export function check(): ParamValidator<string>;
export function check<A>(op1: ParamOperator<A>): ParamValidator<A>;
export function check<A, B>(op1: ParamOperator<A>, op2: Operator<A, B>): ParamValidator<B>;
export function check<A, B, C>(op1: ParamOperator<A>, op2: Operator<A, B>, op3: Operator<B, C>): ParamValidator<C>;
export function check<A, B, C, D>(
  op1: ParamOperator<A>,
  op2: Operator<A, B>,
  op3: Operator<B, C>,
  op4: Operator<C, D>,
): ParamValidator<D>;
export function check<A, B, C, D, E>(
  op1: ParamOperator<A>,
  op2: Operator<A, B>,
  op3: Operator<B, C>,
  op4: Operator<C, D>,
  op5: Operator<D, E>,
): ParamValidator<E>;
export function check(...operators: Array<(value: never) => unknown>): ParamValidator<unknown> {
  return (value: unknown): unknown => {
    assertTruthy(typeof value === 'string', `Expected string, got ${typeof value}`);
    let result: unknown = value;
    for (const op of operators) {
      result = op(result as never);
    }
    return result;
  };
}

// String → T operators (first in chain)
/** Parses string to integer */
export const toInt =
  (message?: string): ParamOperator<number> =>
  (value: string): number => {
    assertTruthy(value !== undefined && value !== null && value !== '', message ?? 'Expected integer, got undefined or empty');
    const num = Number(value);
    assertTruthy(Number.isInteger(num), message ?? `Expected integer, got '${value}'`);
    return num;
  };

/** Parses string to number */
export const toNumber =
  (message?: string): ParamOperator<number> =>
  (value: string): number => {
    assertTruthy(value !== undefined && value !== null && value !== '', message ?? 'Expected number, got undefined or empty');
    const num = Number(value);
    assertTruthy(!isNaN(num), message ?? `Expected number, got '${value}'`);
    return num;
  };

/** Parses string to boolean ('true'/'false') */
export const toBool =
  (message?: string): ParamOperator<boolean> =>
  (value: string): boolean => {
    assertTruthy(value !== undefined && value !== null && value !== '', message ?? 'Expected boolean, got undefined or empty');
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

// String operators (string → string)

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

// Number operators (number → number)

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

// Generic operators

/** Adds custom validation with predicate */
export const assert =
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

/**
 * Creates a simple validator that returns error message or undefined.
 * Can be used directly in check().
 * @example
 * check(validator(s => s === 'valid' ? undefined : 'Invalid ID'))
 */
export function validator<T>(
  validateFn: (value: T) => string | undefined
): (value: T) => T {
  return (value: T): T => {
    const error = validateFn(value);
    if (error !== undefined) {
      assertTruthy(false, error);
    }
    return value;
  };
}
