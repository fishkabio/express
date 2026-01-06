export type GlobalExpressApiConfig = Record<string, never>;

const defaultConfig: GlobalExpressApiConfig = {};

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
