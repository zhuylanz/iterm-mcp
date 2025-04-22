import { CliOptions } from "../cli/CliOptions.js";

/**
 * Factory for creating appropriate server transport configuration for fastmcp
 */
export class TransportFactory {
  /**
   * Create a transport configuration based on CLI options
   * FastMCP expects specific transport configuration formats
   */
  static getTransport(options: CliOptions): { transportType: "stdio" } | { transportType: "sse"; sse: { endpoint: `/${string}`; port: number; host?: string } } {
    switch (options.transport) {
      case "stdio":
        console.log("Using stdio transport");
        return { 
          transportType: "stdio" 
        };
      
      case "sse":
        // Make sure the basePath starts with a slash as required by fastmcp
        const basePath = options.basePath || "";
        // We need to ensure this is always a string that starts with "/" to satisfy TypeScript
        const endpoint = basePath.startsWith("/") ? basePath : `/${basePath}`;
        
        console.log(`Using SSE transport on ${options.host}:${options.port}${endpoint}`);
        return { 
          transportType: "sse",
          sse: {
            // Use type assertion to explicitly tell TypeScript this is the correct format
            endpoint: endpoint as `/${string}`,
            port: options.port,
            host: options.host
          }
        };
        
      default:
        // This should never happen due to validation in CLI parser
        console.error(`Unknown transport type: ${options.transport}`);
        process.exit(1);
    }
  }
}