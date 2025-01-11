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
      await execPromise(`osascript -e '${ascript}'`);
      
      // Wait until command completes
      while (await this.isProcessing()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Give a small delay for output to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get final content
      return await this.retrieveBuffer();

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
}

export default CommandExecutor;