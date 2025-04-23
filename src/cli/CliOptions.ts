/**
 * Type of transport to use. Can be set via ITERM_MCP_TRANSPORT environment variable.
 */
export type TransportType = "stdio" | "sse";

/**
 * Command line options for the iterm-mcp tool
 * These options can now be set via environment variables:
 * - ITERM_MCP_TRANSPORT: "stdio" or "sse"
 * - ITERM_MCP_PORT: Port number for SSE server
 * - ITERM_MCP_HOST: Host for SSE server
 * - ITERM_MCP_BASE_PATH: Base path for SSE server endpoints
 * - ITERM_MCP_CREATE_DEDICATED_TERMINAL: Whether to create a dedicated terminal
 * - ITERM_MCP_AGENT_PROFILE: iTerm2 profile to use for the agent terminal
 * - ITERM_MCP_TERMINAL_NAME: Name for the dedicated terminal tab
 */
export interface CliOptions {
  /**
   * Transport type to use
   */
  transport: TransportType;
  
  /**
   * Port to use for SSE server (when transport is "sse")
   */
  port: number;
  
  /**
   * Host to bind to for SSE server (when transport is "sse")
   */
  host: string;
  
  /**
   * Base path for SSE server endpoints (when transport is "sse")
   */
  basePath: string;

  /**
   * Whether to create a dedicated terminal for agent commands
   */
  createDedicatedTerminal: boolean;

  /**
   * iTerm2 profile to use for the agent terminal
   */
  agentProfile: string;

  /**
   * Name for the dedicated terminal tab
   */
  terminalName: string;
}

/**
 * Default CLI options
 */
export const DEFAULT_CLI_OPTIONS: CliOptions = {
  transport: "sse",
  port: 3000,
  host: "localhost",
  basePath: "",
  createDedicatedTerminal: true,
  agentProfile: "agent_term",
  terminalName: "AI Terminal"
};