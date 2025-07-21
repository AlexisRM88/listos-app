import config from './config.js';

/**
 * Defines the shape of the configuration object for type-safety across the application.
 */
interface AppConfig {
  geminiProxyUrl: string;
  googleClientId: string;
  stripePublishableKey: string;
  stripeProxyUrl: string;
}

/**
 * This file imports the plain JavaScript configuration from `config.js`,
 * applies the `AppConfig` interface for type safety, and then re-exports it.
 * This two-step process (import, then export) resolves a "Circular definition"
 * error that can occur with the direct `export { default } from './config.js'`
 * syntax when a `.ts` and `.js` file share the same name.
 */
const typedConfig: AppConfig = config;

export default typedConfig;
