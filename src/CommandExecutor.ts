import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);

class CommandExecutor {
  async executeCommand(command: string): Promise<string> {
    const ascript = `
      tell application "iTerm2"
        activate
        delay 0.1
        
        if windows is equal to {} then
          create window with default profile
          delay 0.1
        end if
        
        tell front window
          if current session of current tab is missing value then
            create tab with default profile
            delay 0.1
          end if
          
          tell current session of current tab
            write text "${command.replace(/"/g, '\\"')}"
          end tell
        end tell
      end tell
    `;
    
    const { stdout } = await execPromise(`osascript -e '${ascript}'`);
    return stdout;
  }

  async createNewTab(): Promise<void> {
    const ascript = `
      tell application "iTerm2"
        activate
        delay 0.1
        
        if windows is equal to {} then
          create window with default profile
        else
          tell front window
            create tab with default profile
          end tell
        end if
      end tell
    `;
    
    await execPromise(`osascript -e '${ascript}'`);
  }

  async splitPane(vertical: boolean = true): Promise<void> {
    const direction = vertical ? "vertical" : "horizontal";
    const ascript = `
      tell application "iTerm2"
        activate
        delay 0.1
        
        if windows is equal to {} then
          create window with default profile
          delay 0.1
        end if
        
        tell front window
          tell current session of current tab
            split ${direction}ly with default profile
          end tell
        end tell
      end tell
    `;
    
    await execPromise(`osascript -e '${ascript}'`);
  }
}

export default CommandExecutor;