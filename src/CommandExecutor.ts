import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);

class CommandExecutor {
  async isProcessing(): Promise<boolean> {
    const ascript = `
      tell application "iTerm2"
        activate
        if windows is equal to {} then
          create window with default profile
        end if
        
        tell front window
          if current session of current tab is missing value then
            create tab with default profile
          end if
          
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
      throw new Error(`Failed to check processing status: ${error}`);
    }
  }

  async executeCommand(command: string): Promise<string> {
    const ascript = `
      tell application "iTerm2"
        activate
        if windows is equal to {} then
          create window with default profile
        end if
        
        tell front window
          if current session of current tab is missing value then
            create tab with default profile
          end if
          
          tell current session of current tab
            write text "${command.replace(/"/g, '\\"')}"
          end tell
        end tell
      end tell
    `;

    await execPromise(`osascript -e '${ascript}'`);
    
    // Wait until command completes
    while (await this.isProcessing()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Get final output, but only the visible rows
    const getOutput = `
      tell application "iTerm2"
        tell front window
          tell current session of current tab
            set rowCount to number of rows
            set contentText to contents
            set visibleContent to text 1 thru (rowCount * 200) of contentText
            return visibleContent
          end tell
        end tell
      end tell
    `;
    
    const { stdout } = await execPromise(`osascript -e '${getOutput}'`);
    return stdout;
  }
}

export default CommandExecutor;