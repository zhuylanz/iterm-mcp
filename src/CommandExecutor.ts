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
    // First get the current contents
    const getInitialContent = `
      tell application "iTerm2"
        tell front window
          tell current session of current tab
            set initialContent to contents
            return initialContent
          end tell
        end tell
      end tell
    `;

    const { stdout: initialContent } = await execPromise(`osascript -e '${getInitialContent}'`);
    const initialLength = initialContent.length;

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
      let retryCount = 0;
      while (await this.isProcessing()) {
        if (retryCount > 100) { // 10 second timeout
          throw new Error('Command execution timed out');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }
      
      // Give a small delay for output to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get final content
      const getFinalContent = `
        tell application "iTerm2"
          tell front window
            tell current session of current tab
              return contents
            end tell
          end tell
        end tell
      `;
      
      const { stdout: finalContent } = await execPromise(`osascript -e '${getFinalContent}'`);
      
      // Return only the new content
      return finalContent.substring(initialLength).trim();

    } catch (error) {
      console.error('Command execution error:', error);
      throw new Error(`Failed to execute command: ${error}`);
    }
  }
}

export default CommandExecutor;