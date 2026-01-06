import { assertString, assertTruthy } from '@fishka/assertions';
import { UrlParameterInfo } from './urls-parameters';

/** Default documentation for URL parameters. Can be overridden with 'parameterDescriptionOverride'. */
export const URL_PARAMETER_INFO: Record<string, UrlParameterInfo> = {};

/** Asserts that the value is a registered URL parameter name. */
export function assertUrlParameter(name: unknown): asserts name is string {
  assertString(name, 'Url parameter name must be a string');
  assertTruthy(
    URL_PARAMETER_INFO[name],
    `Invalid URL parameter: '${name}'. Please register it using 'registerUrlParameter('${name}', ...)'`,
  );
}
