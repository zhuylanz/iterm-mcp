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

// Create a command executor with terminal options from config
const commandExecutor = new CommandExecutor({
  createDedicatedTerminal: config.createDedicatedTerminal,
  profileName: config.agentProfile,
  terminalName: config.terminalName,
});

// Initialize terminal for the TtyOutputReader and SendControlCharacter
// to ensure they all use the same terminal
const terminalManager = commandExecutor.getTerminalManager();
TtyOutputReader.setTerminalManager(terminalManager);

// Define and add the writeToTerminal tool
server.addTool({
  name: 'write_to_terminal',
  description:
    'Writes text to the iTerm terminal - often used to run a command in the terminal',
  parameters: z.object({
    command: z
      .string()
      .describe('The command to run or text to write to the terminal'),
  }),
  execute: async (args) => {
    console.log(`Executing command: ${args.command}`);

    try {
      const beforeCommandBuffer = await TtyOutputReader.retrieveBuffer();
      const beforeCommandBufferLines = beforeCommandBuffer.split('\n').length;

      // Execute the command and potentially create/use dedicated terminal
      await commandExecutor.executeCommand(args.command);
      
      // Update the terminal session for the TtyOutputReader after command execution
      // (in case a new terminal was created)
      const terminalSession = commandExecutor.getTerminalSession();
      if (terminalSession) {
        TtyOutputReader.setTerminalSession(terminalSession);
      }

      const afterCommandBuffer = await TtyOutputReader.retrieveBuffer();
      const afterCommandBufferLines = afterCommandBuffer.split('\n').length;
      const outputLines = afterCommandBufferLines - beforeCommandBufferLines;
      
      return `${outputLines} lines were output after sending the command to the terminal. Read the last ${outputLines} lines of terminal contents to orient yourself. Never assume that the command was executed or that it was successful.`;
    } catch (error) {
      console.error('Error executing command:', error);
      return `Error executing command. Please check the terminal for details or try again.`;
    }
  },
});

// Define and add the readTerminalOutput tool
server.addTool({
  name: 'read_terminal_output',
  description: 'Reads the output from the iTerm terminal',
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
    try {
      // Ensure we're reading from the correct terminal
      const terminalSession = commandExecutor.getTerminalSession();
      if (terminalSession) {
        TtyOutputReader.setTerminalSession(terminalSession);
      }
      
      const output = await TtyOutputReader.call(args.linesOfOutput);
      return output;
    } catch (error) {
      console.error('Error reading terminal output:', error);
      return `Error reading terminal output. Please try again.`;
    }
  },
});

// Define and add the sendControlCharacter tool
server.addTool({
  name: 'send_control_character',
  description:
    "Sends a control character to the iTerm terminal (e.g., Control-C, or special sequences like ']' for telnet escape)",
  parameters: z.object({
    letter: z
      .string()
      .describe(
        "The letter corresponding to the control character (e.g., 'C' for Control-C, ']' for telnet escape)",
      ),
  }),
  execute: async (args) => {
    console.log(`Sending control character: ${args.letter}`);
    try {
      const ttyControl = new SendControlCharacter();
      
      // Set the terminal manager and session to ensure we send to the right terminal
      const terminalSession = commandExecutor.getTerminalSession();
      if (terminalManager && terminalSession) {
        ttyControl.setTerminalManager(terminalManager);
        ttyControl.setTerminalSession(terminalSession);
      }
      
      await ttyControl.send(args.letter);
      return `Sent control character: Control-${args.letter.toUpperCase()}`;
    } catch (error) {
      console.error('Error sending control character:', error);
      return `Error sending control character. Please try again.`;
    }
  },
});

// Get the transport configuration based on CLI options
const transportConfig = TransportFactory.getTransport(config);

// Log whether we're using a dedicated terminal and which profile is being used
const terminalModeText = config.createDedicatedTerminal 
  ? `Creating dedicated terminal with profile "${config.agentProfile}" and name "${config.terminalName}"`
  : "Using active terminal (dedicated terminal mode disabled)";
console.log(terminalModeText);

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
