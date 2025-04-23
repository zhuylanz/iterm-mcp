# iterm-mcp SSE Transport Implementation Plan

## Overview

This plan outlines the steps to implement Server-Sent Events (SSE) transport for the iterm-mcp project, which currently only supports stdio transport. Adding SSE transport will enable web-based integration with iterm-mcp, allowing it to be accessed via HTTP endpoints rather than only through stdio pipes.

## Architecture Changes

### Current Architecture

- iterm-mcp currently uses `StdioServerTransport` from the MCP SDK
- Communication happens through standard input/output streams
- Main entry point is `index.ts` with a single transport method

### Proposed Architecture

- Add a new `SseServerTransport` implementation
- Create a small Express.js web server to handle SSE connections
- Implement HTTP endpoints:
  - `/sse` - For establishing SSE connection
  - `/messages` - For receiving messages from clients
- Provide configuration options to choose transport type (stdio or SSE)
- Update the command-line interface to support transport selection

## Technical Implementation Details

### Dependencies

- Add `express` for HTTP server functionality
- Add `cors` for Cross-Origin Resource Sharing support
- Add `commander` for CLI argument parsing

### Transport Factory

Create a transport factory that can instantiate either:

- `StdioServerTransport` (existing)
- `SseServerTransport` (new)

### SSE Transport Implementation

Based on MCP documentation, the SSE transport should:

1. Establish an SSE connection when clients connect to `/sse` endpoint
2. Handle incoming messages via HTTP POST to `/messages` endpoint
3. Send outgoing messages as SSE events

### Configuration

- Add command-line options:
  - `--transport <type>` - Choose between "stdio" (default) or "sse"
  - `--port <number>` - Specify port for SSE server (default: 3000)
  - `--host <string>` - Specify host for SSE server (default: localhost)
  - `--path <string>` - Specify base path (default: /mcp)

### Security Considerations

- Add basic CORS configuration for web security
- Document security implications in README

## Integration with iTerm

The core iTerm integration functionality will remain unchanged. The only difference is how clients connect to and communicate with the iterm-mcp server.

## Testing Strategy

1. Unit tests for the new SSE transport implementation
2. Integration tests with a simple web client
3. Manual testing with Claude Desktop or other MCP clients

## Documentation Updates

- Update README.md with new transport options
- Add examples for configuring Claude Desktop with SSE transport
- Document command-line options

## Dedicated Terminal Management

### Current Behavior

- iterm-mcp currently uses the active terminal in iTerm2
- Commands are sent to the currently active session/window
- Each command runs in the context of the user's active shell

### Revised Terminal Management Approach

- Create a dedicated terminal with "agent_term" profile only if one doesn't exist
- Track terminals using window IDs for reliable identification
- Maintain a single persistent terminal across sessions
- Never use the active terminal - only use the dedicated agent terminal
- Store window ID in a file for persistence between server restarts

### Terminal Management Components

- Create a `TerminalManager` class to handle terminal creation and tracking
- Use window ID as primary identifier for the agent's terminal
- Store window ID in a JSON file for persistence
- Check if terminal window still exists before creating a new one
- Update `CommandExecutor` to only use the managed terminal

### Implementation Details

1. **Window Creation**: Create a window with the "agent_term" profile if none exists
2. **Window ID Storage**: Store window ID in a JSON file in the user's home directory
3. **Terminal Detection**: Check if a window exists by ID before creating a new one
4. **Command Execution**: Send commands to the specific window by ID
5. **Error Handling**: Create a new terminal if the stored ID is invalid or window closed

### Configuration Options

- Add environment variables and command-line options:
  - `ITERM_MCP_AGENT_PROFILE` - iTerm2 profile to use for agent terminal (default: "agent_term")
  - `ITERM_MCP_CHECK_EXISTING` - Whether to check for existing terminals (default: true)
