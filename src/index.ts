#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import CommandExecutor from "./CommandExecutor.js";
import TtyOutputReader from "./TtyOutputReader.js";

/**
 * Type alias for a note object.
 */
type Note = { title: string, content: string };

/**
 * Simple in-memory storage for notes.
 * In a real implementation, this would likely be backed by a database.
 */
const notes: { [id: string]: Note } = {
  "1": { title: "First Note", content: "This is note 1" },
  "2": { title: "Second Note", content: "This is note 2" }
};

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new Server(
  {
    name: "iterm-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      //resources: {},
      tools: {},
      //prompts: {},
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes a single "create_note" tool that lets clients create new notes.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "write_to_terminal",
        description: "Writes text to the active iTerm terminal - often used to run a command in the terminal",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The command to run or text to write to the terminal"
            },
          },
          required: ["command"]
        }
      },
      {
        name: "read_terminal_output",
        description: "Reads the output from the active iTerm terminal",
        inputSchema: {
          type: "object",
          properties: {
            linesOfOutput: {
              type: "number",
              description: "The number of lines of output to read. Default is the most recent 25 lines of output"
            },
          },
          required: ["linesOfOutput"]
        }
      }
    ]
  };
});

/**
 * Handler for the create_note tool.
 * Creates a new note with the provided title and content, and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "write_to_terminal": {
      let executor = new CommandExecutor()
      const command = String(request.params.arguments?.command)
      const output = await executor.executeCommand(command)

      return {
        content: [{
          type: "text",
          text: `Command output:\n${output}`
        }]
      };
    }
    case "read_terminal_output": {
      const linesOfOutput = Number(request.params.arguments?.linesOfOutput) || 25
      const output = await TtyOutputReader.call(linesOfOutput)

      return {
        content: [{
          type: "text",
          text: output
        }]
      };
    }
    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
