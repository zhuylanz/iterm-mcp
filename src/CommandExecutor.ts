import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { openSync, closeSync, appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import ProcessTracker from './ProcessTracker.js';
import TtyOutputReader from './TtyOutputReader.js';

const execPromise = promisify(exec);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class CommandExecutor {
  async executeCommand(command: string): Promise<string> {
    const escapedCommand = this.escapeForAppleScript(command);
    
    try {
      // Retrieve the buffer before executing the command
      const initialBuffer = await TtyOutputReader.retrieveBuffer();

      // Using direct osascript command instead of a multi-line AppleScript
      await execPromise(`/usr/bin/osascript -e 'tell application "iTerm2" to tell current session of current window to write text "${escapedCommand}"'`);
      
      // Wait until iterm reports that processing is done
      while (await this.isProcessing()) {
        await sleep(100);
      }
      
      const ttyPath = await this.retrieveTtyPath();
      while (await this.isWaitingForUserInput(ttyPath) === false) {
        await sleep(100);
      }

      // Give a small delay for output to settle
      await sleep(200);
      
      const afterCommandBuffer = await TtyOutputReader.retrieveBuffer();

      // Extract only the new content by comparing buffers
      const output = this.extractCommandOutput(initialBuffer, afterCommandBuffer, command);
      
      return output;

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

  private escapeForAppleScript(str: string): string {
    // First, escape any backslashes
    str = str.replace(/\\/g, '\\\\');
    
    // Escape double quotes
    str = str.replace(/"/g, '\\"');
    
    // Handle single quotes by breaking out of the quote, escaping the quote, and going back in
    str = str.replace(/'/g, "'\\''");
    
    // Handle special characters
    str = str.replace(/[^\x20-\x7E]/g, (char) => {
      return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
    });
    
    return str;
  }

  private async retrieveTtyPath(): Promise<string> {
    try {
      const { stdout } = await execPromise(`/usr/bin/osascript -e 'tell application "iTerm2" to tell current session of current window to get tty'`);
      return stdout.trim();
    } catch (error: unknown) {
      throw new Error(`Failed to retrieve TTY path: ${(error as Error).message}`);
    }
  }

  private cleanTerminalOutput(buffer: string): string {
    // Remove ANSI escape sequences
    let cleaned = buffer.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    
    // Handle carriage returns and line feeds properly
    cleaned = cleaned.replace(/[^\n\r]+((\r+\n)|\r)[^\n\r]+/g, line => {
      const parts = line.split(/\r+/);
      return parts[parts.length - 1];
    });

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n');
    
    // Remove terminal control sequences
    cleaned = cleaned.replace(/\x1b\][0-9;]*[a-zA-Z]/g, '');
    
    // Remove null characters
    cleaned = cleaned.replace(/\x00/g, '');
    
    const result = cleaned.trim();
    
    return result;
  }

  private findCommandLine(lines: string[], command: string): number {
    // Search from bottom up as the command might appear multiple times
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes(command)) {
        return i;
      }
    }
    return -1;
  }

  private findNextPrompt(lines: string[], startIndex: number): number {
    const promptPatterns = [
      /[$#>]\s*$/,  // Basic shell prompts
      /[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+:[~\w/]*[$#>]\s*$/  // Username@hostname style
    ];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      for (const pattern of promptPatterns) {
        if (pattern.test(line)) {
          return i;
        }
      }
    }
    return lines.length;
  }

  private extractCommandOutput(initialBuffer: string, afterBuffer: string, command: string): string {
    // Clean both buffers
    const cleanedInitial = this.cleanTerminalOutput(initialBuffer);
    const cleanedAfter = this.cleanTerminalOutput(afterBuffer);

    // Split into lines and remove empty lines
    const initialLines = cleanedInitial.split('\n').filter(line => line.trim() !== '');
    const afterLines = cleanedAfter.split('\n').filter(line => line.trim() !== '');

    // Find the command line
    const commandLineIndex = this.findCommandLine(afterLines, command);
    if (commandLineIndex === -1) {
      return '';
    }

    // Find the next prompt after the command
    const nextPromptIndex = this.findNextPrompt(afterLines, commandLineIndex + 1);

    // Extract everything between command and next prompt
    const outputLines = afterLines.slice(commandLineIndex + 1, nextPromptIndex)
      .filter(line => line.trim() !== '');  // Remove empty lines

    // Remove any lines that exist in the initial buffer
    const initialSet = new Set(initialLines);
    const uniqueLines = outputLines.filter(line => !initialSet.has(line.trim()));

    const result = uniqueLines.join('\n');
    
    return result;
  }

  private async isProcessing(): Promise<boolean> {
    try {
      const { stdout } = await execPromise(`/usr/bin/osascript -e 'tell application "iTerm2" to tell current session of current window to get is processing'`);
      return stdout.trim() === 'true';
    } catch (error: unknown) {
      throw new Error(`Failed to check processing status: ${(error as Error).message}`);
    }
  }
}

export default CommandExecutor;