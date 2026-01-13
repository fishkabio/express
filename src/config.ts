export interface GlobalExpressApiConfig {
  /**
   * Header name for request ID. If not set, request ID functionality is disabled.
   * When set, enables request ID generation and propagation.
   * Default: undefined (disabled)
   */
  requestIdHeader?: string;

  /**
   * Whether to trust and use the request ID from the request header.
   * If true, the middleware will look for the request ID header and use it.
   * If false, a new UUID will always be generated.
   * Only applies when requestIdHeader is set.
   * Default: true
   */
  trustRequestIdHeader: boolean;
}

const defaultConfig: GlobalExpressApiConfig = {
  requestIdHeader: undefined,
  trustRequestIdHeader: true,
};

let currentConfig: GlobalExpressApiConfig = { ...defaultConfig };

/**
 * Configure global @fishka/express settings.
 * @param config Partial configuration to merge with current settings
 */
export function configureExpressApi(config: Partial<GlobalExpressApiConfig>): void {
  currentConfig = { ...currentConfig, ...config } as GlobalExpressApiConfig;
}

/**
 * Get current Express API configuration.
 */
export function getExpressApiConfig(): GlobalExpressApiConfig {
  return currentConfig;
}

/**
 * Reset API configuration to defaults.
 * Useful for testing.
 */
export function resetExpressApiConfig(): void {
  currentConfig = { ...defaultConfig };
}
