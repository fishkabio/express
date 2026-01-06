import { DocValueFormat } from './fishka-doc.types';
import { URL_PARAMETER_INFO } from './urls-parameters.private';

/** Globally identified URL (path or query) parameter info. */
export interface UrlParameterInfo {
  doc: { type: 'string' | 'integer'; text: string; description: string; format?: DocValueFormat };
}

/** Registers a new URL parameter for validation and documentation. */
export function registerUrlParameter(name: string, info: UrlParameterInfo): void {
  URL_PARAMETER_INFO[name] = info;
}
