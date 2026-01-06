export interface GlobalConfig {
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

const defaultConfig: GlobalConfig = {
  requireDocs: false,
  warnOnMissingDocs: false,
};

let currentConfig: GlobalConfig = { ...defaultConfig };

/**
 * Configure global Fishka settings.
 * @param config Partial configuration to merge with current settings
 */
export function configureExpressApi(config: Partial<GlobalConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current Fishka configuration.
 */
export function getFishkaConfig(): GlobalConfig {
  return currentConfig;
}

/**
 * Reset Fishka configuration to defaults.
 * Useful for testing.
 */
export function resetFishkaConfig(): void {
  currentConfig = { ...defaultConfig };
}
