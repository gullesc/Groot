/**
 * GROOT Configuration
 * 
 * Handles loading and managing configuration from environment
 * variables and config files.
 */

import { GrootConfig, DEFAULT_CONFIG } from '../types';

/**
 * Load configuration from environment variables
 */
export function loadConfig(): GrootConfig {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.GROOT_MODEL || DEFAULT_CONFIG.defaultModel,
    beadsEnabled: process.env.GROOT_BEADS_ENABLED !== 'false',
    debugMode: process.env.GROOT_DEBUG === 'true',
    outputDir: process.env.GROOT_OUTPUT_DIR || DEFAULT_CONFIG.outputDir,
    templatesDir: process.env.GROOT_TEMPLATES_DIR || DEFAULT_CONFIG.templatesDir,
  };
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config: GrootConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.anthropicApiKey) {
    errors.push('ANTHROPIC_API_KEY environment variable is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration with validation
 */
export function getConfig(): GrootConfig {
  const config = loadConfig();
  const { valid, errors } = validateConfig(config);
  
  if (!valid) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
  
  return config;
}
