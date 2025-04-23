import { promisify } from 'node:util';
import { openSync, closeSync } from 'node:fs';
import ProcessTracker from './ProcessTracker.js';
import TtyOutputReader from './TtyOutputReader.js';
import { TerminalManager, TerminalOptions } from './TerminalManager.js';

/**
 * CommandExecutor handles sending commands to iTerm2 using a terminal managed by TerminalManager.
 *
 * This includes special handling for multiline text and waiting for command completion.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class CommandExecutor {
  private terminalManager: TerminalManager;
  private currentTerminalSession: any = null;

  constructor(options?: Partial<TerminalOptions>) {
    this.terminalManager = new TerminalManager(options);
  }

  /**
   * Executes a command in the iTerm2 terminal.
   *
   * This method handles both single-line and multiline commands by:
   * 1. Getting a dedicated terminal from the terminal manager
   * 2. Sending the command to that terminal
   * 3. Waiting for the command to complete execution
   * 4. Retrieving the terminal output after command execution
   *
   * @param command The command to execute (can contain newlines)
   * @returns A promise that resolves to the terminal output after command execution
   */
  async executeCommand(command: string): Promise<string> {
    try {
      // Get a terminal from the manager (creates one if needed, or reuses existing)
      this.currentTerminalSession =
        this.currentTerminalSession ||
        (await this.terminalManager.getTerminal());

      // Execute the command in the terminal
      await this.terminalManager.executeInTerminal(
        this.currentTerminalSession,
        command,
      );

      // Wait until iTerm2 reports that command processing is complete
      while (
        await this.terminalManager.isProcessing(this.currentTerminalSession)
      ) {
        await sleep(100);
      }

      // Get the TTY path and check if it's waiting for user input
      const ttyPath = await this.terminalManager.getTtyPath(
        this.currentTerminalSession,
      );
      while ((await this.isWaitingForUserInput(ttyPath)) === false) {
        await sleep(100);
      }

      // Give a small delay for output to settle
      await sleep(200);

      // Retrieve the terminal output after command execution
      const afterCommandBuffer = await this.terminalManager.readTerminalOutput(
        this.currentTerminalSession,
      );
      return afterCommandBuffer;
    } catch (error: unknown) {
      throw new Error(`Failed to execute command: ${(error as Error).message}`);
    }
  }

  async isWaitingForUserInput(ttyPath: string): Promise<boolean> {
    let fd;
    try {
      // Open the TTY file descriptor in non-blocking mode
      fd = openSync(ttyPath, 'r');
      const tracker = new ProcessTracker();
      let belowThresholdTime = 0;

      while (true) {
        try {
          const activeProcess = await tracker.getActiveProcess(ttyPath);

          if (!activeProcess) return true;

          if (activeProcess.metrics.totalCPUPercent < 1) {
            belowThresholdTime += 350;
            if (belowThresholdTime >= 1000) return true;
          } else {
            belowThresholdTime = 0;
          }
        } catch {
          return true;
        }

        await sleep(350);
      }
    } catch (error: unknown) {
      return true;
    } finally {
      if (fd !== undefined) {
        closeSync(fd);
      }
      return true;
    }
  }

  /**
   * Get the current terminal session if one has been created
   */
  getTerminalSession(): any {
    return this.currentTerminalSession;
  }

  /**
   * Get the terminal manager instance
   */
  getTerminalManager(): TerminalManager {
    return this.terminalManager;
  }
}

export default CommandExecutor;
