#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import CommandExecutor from './CommandExecutor.js';
import TtyOutputReader from './TtyOutputReader.js';
import SendControlCharacter from './SendControlCharacter.js';
import { parseCliOptions } from './cli/CliParser.js';
import { TransportFactory } from './transport/TransportFactory.js';

const config = parseCliOptions();

// Create the MCP server using fastmcp
const server = new FastMCP({
  name: 'iterm-mcp',
  version: '1.3.0',
});

// Define and add the writeToTerminal tool
server.addTool({
  name: 'write_to_terminal',
  description:
    'Writes text to the active iTerm terminal - often used to run a command in the terminal',
  parameters: z.object({
    command: z
      .string()
      .describe('The command to run or text to write to the terminal'),
  }),
  execute: async (args) => {
    console.log(`Executing command: ${args.command}`);
    const executor = new CommandExecutor();

    const beforeCommandBuffer = await TtyOutputReader.retrieveBuffer();
    const beforeCommandBufferLines = beforeCommandBuffer.split('\n').length;

    await executor.executeCommand(args.command);

    const afterCommandBuffer = await TtyOutputReader.retrieveBuffer();
    const afterCommandBufferLines = afterCommandBuffer.split('\n').length;
    const outputLines = afterCommandBufferLines - beforeCommandBufferLines;

    return `${outputLines} lines were output after sending the command to the terminal. Read the last ${outputLines} lines of terminal contents to orient yourself. Never assume that the command was executed or that it was successful.`;
  },
});

// Define and add the readTerminalOutput tool
server.addTool({
  name: 'read_terminal_output',
  description: 'Reads the output from the active iTerm terminal',
  parameters: z.object({
    linesOfOutput: z
      .number()
      .optional()
      .describe('The number of lines of output to read'),
  }),
  execute: async (args) => {
    console.log(
      `Reading ${args.linesOfOutput || 'all'} lines of terminal output`,
    );
    const output = await TtyOutputReader.call(args.linesOfOutput);
    return output;
  },
});

// Define and add the sendControlCharacter tool
server.addTool({
  name: 'send_control_character',
  description:
    "Sends a control character to the active iTerm terminal (e.g., Control-C, or special sequences like ']' for telnet escape)",
  parameters: z.object({
    letter: z
      .string()
      .describe(
        "The letter corresponding to the control character (e.g., 'C' for Control-C, ']' for telnet escape)",
      ),
  }),
  execute: async (args) => {
    console.log(`Sending control character: ${args.letter}`);
    const ttyControl = new SendControlCharacter();
    await ttyControl.send(args.letter);
    return `Sent control character: Control-${args.letter.toUpperCase()}`;
  },
});

// Get the transport configuration based on CLI options
const transportConfig = TransportFactory.getTransport(config);

// Start the server with the configured transport
server
  .start(transportConfig)
  .then(() => {
    console.log(`iterm-mcp server started with ${config.transport} transport`);
    console.log('Server is ready to receive requests');
  })
  .catch((error: unknown) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
