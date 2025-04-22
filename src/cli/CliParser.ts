import { Command } from "commander";
import { CliOptions } from "./CliOptions.js";
import { loadEnvironmentConfig, validateEnvironmentConfig } from "../config/Environment.js";

/**
 * Parses command line arguments and returns CLI options
 * Transport configuration now comes from environment variables
 */
export function parseCliOptions(): CliOptions {
  const program = new Command();
  
  // Load configuration from environment variables first
  const envConfig = validateEnvironmentConfig(loadEnvironmentConfig());
  
  // CLI options can still be used for other features that don't relate to transport
  program.parse();
  
  // Return the environment configuration
  // CLI options for transport were removed since they're now handled by environment variables
  return envConfig;
}