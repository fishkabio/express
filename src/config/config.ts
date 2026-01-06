export interface GlobalExpressApiConfig {
  /**
   * Require documentation for all endpoints.
   * When true, throws an error at mount time if endpoint is missing 'doc' field.
   * Default: false
   */
  requireDocs?: boolean;
  /**
   * Show warning for endpoints without documentation during startup.
   * When true, logs a brief warning for each endpoint without 'doc' field.
   * Default: false
   */
  warnOnMissingDocs?: boolean;
}

const defaultConfig: GlobalExpressApiConfig = {
  requireDocs: false,
  warnOnMissingDocs: false,
};

let currentConfig: GlobalExpressApiConfig = { ...defaultConfig };

/**
 * Configure global @fishka/express settings.
 * @param config Partial configuration to merge with current settings
 */
export function configureExpressApi(config: Partial<GlobalExpressApiConfig>): void {
  currentConfig = { ...currentConfig, ...config };
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
