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

## Terminal Management Implementation

- [ ] Design Terminal Management Classes
  - [ ] Define interface for terminal interactions
  - [ ] Create TerminalManager class
  - [ ] Implement window ID tracking system

- [ ] Implement Agent-Specific Terminal Creation
  - [ ] Add AppleScript commands to create window with "agent_term" profile
  - [ ] Create mechanism to get and store window ID
  - [ ] Implement window existence verification

- [ ] Implement Window ID Persistence
  - [ ] Create storage file for window ID persistence
  - [ ] Implement save/load functions for window ID
  - [ ] Add validation to ensure stored window still exists

- [ ] Update Command Execution Flow
  - [ ] Modify CommandExecutor to only use agent terminal
  - [ ] Update terminal targeting to use window ID
  - [ ] Update TtyOutputReader to target specific window
  - [ ] Update SendControlCharacter to target specific window

- [ ] Add Configuration Options
  - [ ] Add environment variable for agent terminal profile
  - [ ] Update CLI options for terminal configuration
  - [ ] Implement configuration validation

## Testing

- [x] Update Test Infrastructure
  - [x] Add test for SseServerTransport
  - [x] Create a simple test client for SSE

- [ ] Test Agent Terminal Management
  - [ ] Test terminal creation with specific profile
  - [ ] Test window ID persistence
  - [ ] Test command execution in agent terminal
  - [ ] Test recovery when window closed or not found

- [ ] Test Both Transport Methods
  - [ ] Test stdio transport (existing functionality)
  - [ ] Test SSE transport with web client
  - [ ] Test SSE transport with Claude Desktop

## Documentation and Polishing

- [x] Update README.md
  - [x] Document new transport options
  - [x] Add SSE configuration instructions
  - [x] Update Claude Desktop configuration example

- [ ] Update Documentation for Terminal Management
  - [ ] Document agent terminal profile approach
  - [ ] Add instructions for setting up "agent_term" profile in iTerm2
  - [ ] Update usage instructions

- [ ] Add Examples
  - [x] Add example HTML client
  - [x] Add example configuration for different environments
  - [ ] Add example for agent terminal profile setup

- [ ] Final Tweaks
  - [ ] Code cleanup and formatting
  - [ ] Ensure proper error handling
  - [ ] Version bump for release