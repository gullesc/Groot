/**
 * GROOT Configuration
 *
 * Handles loading and managing configuration from multiple sources:
 * 1. Default values (hardcoded)
 * 2. User config (~/.groot/config.yaml)
 * 3. Project config (.grootrc or .groot/config.yaml)
 * 4. Environment variables (highest priority)
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import {
  GrootConfig,
  ExtendedGrootConfig,
  DEFAULT_CONFIG,
  DEFAULT_EXTENDED_CONFIG,
} from '../types';
import {
  getUserConfigPath,
  getProjectConfigPath,
} from './paths';

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load YAML config file
 */
function loadYamlConfig(path: string): Partial<ExtendedGrootConfig> {
  try {
    const content = readFileSync(path, 'utf-8');
    return parseYaml(content) || {};
  } catch (error) {
    console.warn(`Warning: Failed to parse config file ${path}:`, error);
    return {};
  }
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): Partial<ExtendedGrootConfig> {
  const config: Partial<ExtendedGrootConfig> = {};

  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  if (process.env.GROOT_MODEL) {
    config.defaultModel = process.env.GROOT_MODEL;
    if (!config.llm) config.llm = { provider: 'anthropic', model: '' };
    config.llm.model = process.env.GROOT_MODEL;
  }

  if (process.env.GROOT_BEADS_ENABLED !== undefined) {
    config.beadsEnabled = process.env.GROOT_BEADS_ENABLED !== 'false';
  }

  if (process.env.GROOT_DEBUG !== undefined) {
    config.debugMode = process.env.GROOT_DEBUG === 'true';
  }

  if (process.env.GROOT_OUTPUT_DIR) {
    config.outputDir = process.env.GROOT_OUTPUT_DIR;
  }

  if (process.env.GROOT_TEMPLATES_DIR) {
    config.templatesDir = process.env.GROOT_TEMPLATES_DIR;
  }

  return config;
}

/**
 * Load configuration with hierarchical merging
 *
 * Priority (later sources override earlier):
 * 1. Default config
 * 2. User config (~/.groot/config.yaml)
 * 3. Project config (.grootrc)
 * 4. Environment variables
 */
export function loadExtendedConfig(): ExtendedGrootConfig {
  // 1. Start with defaults
  let config: ExtendedGrootConfig = { ...DEFAULT_EXTENDED_CONFIG };

  // 2. Load user config
  const userConfigPath = getUserConfigPath();
  if (existsSync(userConfigPath)) {
    const userConfig = loadYamlConfig(userConfigPath);
    config = deepMerge(config, userConfig);
  }

  // 3. Load project config
  const projectConfigPath = getProjectConfigPath();
  if (projectConfigPath) {
    const projectConfig = loadYamlConfig(projectConfigPath);
    config = deepMerge(config, projectConfig);
  }

  // 4. Apply environment variables (highest priority)
  const envConfig = loadEnvConfig();
  config = deepMerge(config, envConfig);

  // Sync anthropicApiKey with llm.apiKey for backward compat
  if (config.anthropicApiKey && config.llm) {
    config.llm.apiKey = config.anthropicApiKey;
  }

  return config;
}

/**
 * Load configuration from environment variables (backward compatible)
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
export function validateConfig(config: GrootConfig | ExtendedGrootConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for API key (from config or LLM settings)
  const hasApiKey = config.anthropicApiKey ||
    ('llm' in config && config.llm?.apiKey);

  if (!hasApiKey) {
    errors.push('ANTHROPIC_API_KEY environment variable is required (or set anthropicApiKey in config)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration with validation (backward compatible)
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

/**
 * Get extended configuration with validation
 */
export function getExtendedConfig(): ExtendedGrootConfig {
  const config = loadExtendedConfig();
  const { valid, errors } = validateConfig(config);

  if (!valid) {
    console.error('Configuration errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }

  return config;
}

/**
 * Get a nested value from config by dot-notation path
 */
export function getConfigValue(config: ExtendedGrootConfig, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = config;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Generate a template .grootrc file content
 */
export function generateGrootrcTemplate(): string {
  return `# GROOT Configuration
# See: https://github.com/yourusername/groot#configuration

# LLM Provider settings
llm:
  provider: anthropic  # anthropic | ollama | openai
  model: claude-sonnet-4-20250514
  # baseUrl: http://localhost:11434  # For Ollama

# API key (or use ANTHROPIC_API_KEY env var)
# anthropicApiKey: sk-ant-xxx

# Default preferences
defaultTemplate: typescript
beadsEnabled: true
debugMode: false

# Custom agent prompts (optional)
# agentPrompts:
#   bark: "You are a friendly tutor..."

# Post-scaffold hooks
hooks:
  defaults:
    typescript:
      enabled: true
    javascript:
      enabled: true
    python:
      enabled: true
    react:
      enabled: true
    vue:
      enabled: true
    minimal:
      enabled: false
`;
}

/**
 * Generate a user config template
 */
export function generateUserConfigTemplate(): string {
  return `# GROOT User Configuration
# This file is loaded for all GROOT projects
# Location: ~/.groot/config.yaml

# API key (or use ANTHROPIC_API_KEY env var)
# anthropicApiKey: sk-ant-xxx

# LLM Provider settings
llm:
  provider: anthropic
  model: claude-sonnet-4-20250514

# Default preferences
defaultTemplate: typescript

# Custom templates directory
templates:
  userDir: ~/.groot/templates
`;
}
