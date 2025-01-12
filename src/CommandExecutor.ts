import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { openSync, closeSync } from 'node:fs';
import { isatty } from 'node:tty';
import TTYProcessTracker from './TTYProcessTracker.js';

const execPromise = promisify(exec);
const sleep = promisify(setTimeout);

class CommandExecutor {
  async isProcessing(): Promise<boolean> {
    const ascript = `
      tell application "iTerm2"
        tell front window
          tell current session of current tab
            return is processing
          end tell
        end tell
      end tell
    `;

    try {
      const { stdout } = await execPromise(`osascript -e '${ascript}'`);
      return stdout.trim() === 'true';
    } catch (error: unknown) {
      console.error('Processing check error:', (error as Error).message);
      throw new Error(`Failed to check processing status: ${(error as Error).message}`);
    }
  }

  async executeCommand(command: string): Promise<string> {
    // Execute the command
    const ascript = `
      tell application "iTerm2"
        tell front window
          tell current session of current tab
            write text "${command.replace(/"/g, '\\"')}"
          end tell
        end tell
      end tell
    `;

    try {
      // Retrieve the buffer before executing the command
      const initialBuffer = await this.retrieveBuffer();

      await execPromise(`osascript -e '${ascript}'`);
      
      // Wait until iterm reports that processing is done
      while (await this.isProcessing()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const ttyPath = await this.retrieveTtyPath();
      while (await this.isWaitingForUserInput(ttyPath) == false) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Give a small delay for output to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const afterCommandBuffer = await this.retrieveBuffer();
      
      // Extract only the new content by comparing buffers
      const commandOutput = this.extractCommandOutput(initialBuffer, afterCommandBuffer, command);
      
      return commandOutput;

    } catch (error: unknown) {
      console.error('Command execution error:', (error as Error).message);
      throw new Error(`Failed to execute command: ${(error as Error).message}`);
    }
  }

  async isWaitingForUserInput(ttyPath:string): Promise<boolean> {
    let fd;
    try {
        // Open the TTY file descriptor in non-blocking mode
        fd = openSync(ttyPath, 'r');
        const tracker = new TTYProcessTracker();
        let belowThresholdTime = 0;
        
        while (true) {
            try {
                const isTTY = isatty(fd);
                const activeProcess = await tracker.getActiveProcess(ttyPath);
                
                // Removed console logging
                // console.log(`TTY Status:
                // - Path: ${ttyPath}
                // - Is TTY: ${isTTY}`);

                if (!activeProcess) return true;

                if (activeProcess) {
                    // Removed console logging
                    // console.log(`Active process:
                    // - Name: ${activeProcess.name}
                    // - Command: ${activeProcess.command}
                    // - Command Chain: ${activeProcess.commandChain}
                    // - Total CPU: ${activeProcess.metrics.totalCPUPercent.toFixed(1)}%
                    // - Total Memory: ${activeProcess.metrics.totalMemoryMB.toFixed(1)} MB`);

                    // return true if active process cpu < 1% for 2 seconds
                    if (activeProcess.metrics.totalCPUPercent < 1) {
                      belowThresholdTime += 350;
                      if (belowThresholdTime >= 1000) return true;
                    } else {
                      belowThresholdTime = 0;
                    }
                }

            } catch (checkError: unknown) {
                console.error('Check error:', (checkError as Error).message);
            }

            await sleep(350);
        }
    } catch (error: unknown) {
        //console.error('Error:', (error as Error).message);
        return true;
    } finally {
        if (fd !== undefined) {
            closeSync(fd);
        }
        return true;
    }
  }

  private async retrieveBuffer(): Promise<string> {
    const ascript = `
      tell application "iTerm2"
        tell front window
          tell current session of current tab
            set numRows to number of rows
            set allContent to contents
            return allContent
          end tell
        end tell
      end tell
    `;
    
    const { stdout: finalContent } = await execPromise(`osascript -e '${ascript}'`);
    return finalContent.trim();
  }

  private async retrieveTtyPath(): Promise<string> {
    const ascript = `
      tell application "iTerm2"
        tell current session of current window
          get tty
        end tell
      end tell
    `;
    
    const { stdout: finalContent } = await execPromise(`osascript -e '${ascript}'`);
    return finalContent.trim();
  }

  private extractCommandOutput(initialBuffer: string, afterBuffer: string, command: string): string {
    // Split buffers into lines
    const initialLines = initialBuffer.split('\n');
    const afterLines = afterBuffer.split('\n');
    
    // Find the command line in the after buffer by looking for partial match
    // This handles cases where the command might have terminal formatting or leading characters
    const commandLineIndex = afterLines.findIndex(line => 
      line.includes(command.substring(1)) // Look for command without first character
    );
    
    if (commandLineIndex === -1) {
      // If command line not found, return difference between buffers
      return afterLines.slice(initialLines.length).join('\n');
    }

    // Return everything after the command line
    return afterLines.slice(commandLineIndex + 1).join('\n');
  }
}

export default CommandExecutor;