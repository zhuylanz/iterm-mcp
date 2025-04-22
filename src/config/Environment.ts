import {
  CliOptions,
  DEFAULT_CLI_OPTIONS,
  TransportType,
} from '../cli/CliOptions.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Loads configuration from environment variables
 */
export function loadEnvironmentConfig(): CliOptions {
  return {
    transport:
      (process.env.ITERM_MCP_TRANSPORT as TransportType) ||
      DEFAULT_CLI_OPTIONS.transport,
    port: parseInt(
      process.env.ITERM_MCP_PORT || String(DEFAULT_CLI_OPTIONS.port),
      10,
    ),
    host: process.env.ITERM_MCP_HOST || DEFAULT_CLI_OPTIONS.host,
    basePath: process.env.ITERM_MCP_BASE_PATH || DEFAULT_CLI_OPTIONS.basePath,
  };
}

/**
 * Validates the configuration loaded from environment variables
 */
export function validateEnvironmentConfig(config: CliOptions): CliOptions {
  // Validate transport type
  if (config.transport !== 'stdio' && config.transport !== 'sse') {
    console.error(
      `Invalid transport type: ${config.transport}. Valid options are "stdio" or "sse".`,
    );
    process.exit(1);
  }

  // Validate port
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    console.error(
      `Invalid port: ${config.port}. Must be a number between 1 and 65535.`,
    );
    process.exit(1);
  }

  return config;
}
