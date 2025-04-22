# iterm-mcp SSE Transport Implementation Tasks

## Project Setup and Research

- [x] Research Model Context Protocol SSE transport requirements
- [x] Create implementation plan (_planning.md)
- [x] Create implementation tasks (_tasks.md)
- [x] Update package.json with new dependencies

## Core Implementation

- [x] Add Command-Line Interface
  - [x] Add commander for parsing CLI options
  - [x] Create CLI options interface
  - [x] Implement option parsing in index.ts

- [x] Create Transport Factory
  - [x] Create TransportFactory class
  - [x] Implement getTransport() method
  - [x] Add transport type detection logic

- [x] Implement SSE Transport
  - [x] Create src/transport/SseServerTransport.ts
  - [x] Implement SSE connection handling
  - [x] Implement message posting endpoint
  - [x] Add Express server setup
  - [x] Add CORS configuration

- [x] Update Main Entry Point
  - [x] Modify index.ts to use transport factory
  - [x] Add error handling for SSE transport
  - [x] Update server connection setup

## Testing

- [x] Update Test Infrastructure
  - [x] Add test for SseServerTransport
  - [x] Create a simple test client for SSE

- [ ] Test Both Transport Methods
  - [ ] Test stdio transport (existing functionality)
  - [ ] Test SSE transport with web client
  - [ ] Test SSE transport with Claude Desktop

## Documentation and Polishing

- [x] Update README.md
  - [x] Document new transport options
  - [x] Add SSE configuration instructions
  - [x] Update Claude Desktop configuration example

- [x] Add Examples
  - [x] Add example HTML client
  - [x] Add example configuration for different environments

- [ ] Final Tweaks
  - [ ] Code cleanup and formatting
  - [ ] Ensure proper error handling
  - [ ] Version bump for release