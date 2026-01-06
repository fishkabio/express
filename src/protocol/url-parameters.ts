import { assertString, assertTruthy } from '@fishka/assertions';

/** Globally identified URL (path or query) parameter info. */
export type UrlParameterInfo = Record<string, never>;

/**
 * Default documentation for URL parameters. Can be overridden with 'parameterDescriptionOverride'.
 * @Internal
 */
export const URL_PARAMETER_INFO: Record<string, UrlParameterInfo> = {};

/** Registers a new URL parameter. */
export function registerUrlParameter(name: string, info: UrlParameterInfo): void {
  URL_PARAMETER_INFO[name] = info;
}

/**
 * Asserts that the value is a registered URL parameter name.
 * @Internal
 */
export function assertUrlParameter(name: unknown): asserts name is string {
  assertString(name, 'Url parameter name must be a string');
  assertTruthy(
    URL_PARAMETER_INFO[name],
    `Invalid URL parameter: '${name}'. Please register it using 'registerUrlParameter('${name}', ...)'`,
  );
}
