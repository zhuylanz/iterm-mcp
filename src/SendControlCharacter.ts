import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { TerminalManager } from './TerminalManager.js';

const execPromise = promisify(exec);

class SendControlCharacter {
  private terminalManager: TerminalManager | null = null;
  private terminalSession: any = null;

  constructor() {}

  setTerminalManager(manager: TerminalManager): void {
    this.terminalManager = manager;
  }

  setTerminalSession(session: any): void {
    this.terminalSession = session;
  }

  async send(letter: string): Promise<void> {
    // If we have a terminal manager and session, use it
    if (this.terminalManager && this.terminalSession) {
      try {
        await this.terminalManager.sendControlCharacter(
          this.terminalSession,
          letter,
        );
        return;
      } catch (error) {
        console.error(
          'Error sending control character to managed terminal:',
          error,
        );
        // Fall back to default behavior
      }
    }

    // Fall back to using the active terminal
    let controlCode: number;

    // Handle special cases for telnet escape sequences
    if (letter.toUpperCase() === ']') {
      // ASCII 29 (GS - Group Separator) - the telnet escape character
      controlCode = 29;
    }
    // Add other special cases here as needed
    else if (
      letter.toUpperCase() === 'ESCAPE' ||
      letter.toUpperCase() === 'ESC'
    ) {
      // ASCII 27 (ESC - Escape)
      controlCode = 27;
    } else {
      // Validate input for standard control characters
      letter = letter.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) {
        throw new Error('Invalid control character letter');
      }

      // Convert to standard control code (A=1, B=2, etc.)
      controlCode = letter.charCodeAt(0) - 64;
    }

    // AppleScript to send the control character
    const ascript = `
      tell application "iTerm2"
        tell current window
          tell current tab
            tell current session
              write text (ASCII character ${controlCode})
            end tell
          end tell
        end tell
      end tell
    `;

    try {
      await execPromise(`osascript -e '${ascript}'`);
    } catch (error: unknown) {
      throw new Error(
        `Failed to send control character: ${(error as Error).message}`,
      );
    }
  }
}

export default SendControlCharacter;
