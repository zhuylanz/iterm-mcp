import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { TerminalManager } from './TerminalManager.js';

const execPromise = promisify(exec);

export default class TtyOutputReader {
  private static terminalManager: TerminalManager | null = null;
  private static terminalSession: any = null;
  
  static setTerminalManager(manager: TerminalManager): void {
    this.terminalManager = manager;
  }
  
  static setTerminalSession(session: any): void {
    this.terminalSession = session;
  }

  static async call(linesOfOutput?: number): Promise<string> {
    const buffer = await this.retrieveBuffer();
    if (!linesOfOutput) {
      return buffer;
    }
    const lines = buffer.split('\n');
    return lines.slice(-linesOfOutput - 1).join('\n');
  }

  static async retrieveBuffer(): Promise<string> {
    // If we have a terminal manager and session, use it
    if (this.terminalManager && this.terminalSession) {
      try {
        return await this.terminalManager.readTerminalOutput(this.terminalSession);
      } catch (error) {
        console.error('Error reading from managed terminal:', error);
        // Fall back to default behavior
      }
    }
    
    // Fall back to using the active terminal
    const ascript = `
      tell application "iTerm2"
        tell current window
          tell current tab
            tell current session
              set numRows to number of rows
              set allContent to contents
              return allContent
            end tell
          end tell
        end tell
      end tell
    `;
    
    const { stdout: finalContent } = await execPromise(`osascript -e '${ascript}'`);
    return finalContent.trim();
  }
}