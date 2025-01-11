import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);

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
    } catch (error) {
      console.error('Processing check error:', error);
      throw new Error(`Failed to check processing status: ${error}`);
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
      
      // Wait until command completes
      while (await this.isProcessing()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Give a small delay for output to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const afterCommandBuffer = await this.retrieveBuffer();
      
      // Extract only the new content by comparing buffers
      const commandOutput = this.extractCommandOutput(initialBuffer, afterCommandBuffer, command);
      
      return commandOutput;

    } catch (error) {
      console.error('Command execution error:', error);
      throw new Error(`Failed to execute command: ${error}`);
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