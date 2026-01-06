import { URL_PARAMETER_INFO } from './urls-parameters.private';

/** Globally identified URL (path or query) parameter info. */
export type UrlParameterInfo = Record<string, never>;

/** Registers a new URL parameter. */
export function registerUrlParameter(name: string, info: UrlParameterInfo): void {
  URL_PARAMETER_INFO[name] = info;
}
