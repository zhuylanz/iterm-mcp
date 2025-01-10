# iterm-mcp 

A Model Context Protocol server that provides access to the current iTerm session

iterm-mcp will attempt to execute commands in the currently active tab of iTerm. 

### Tools
- `execute_shell_command` - Executes a command in the current iTerm session

## Development

Install dependencies:
```bash
yarn install
```

Build the server:
```bash
yarn run build
```

For development with auto-rebuild:
```bash
yarn run watch
```

## Installation

To use with Claude Desktop, build the project with `yarn run build`, and add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "iterm-mcp": {
      "command": "/path/to/iterm-mcp/build/index.js"
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
yarn run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
