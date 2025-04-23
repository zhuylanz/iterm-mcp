import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Interface for terminal configuration options
 */
export interface TerminalOptions {
  /**
   * Whether to create a dedicated terminal (true) or use the active terminal (false)
   */
  createDedicatedTerminal: boolean;

  /**
   * iTerm2 profile to use for the agent terminal
   */
  profileName: string;

  /**
   * Name for the terminal tab
   */
  terminalName: string;
}

/**
 * Represents a terminal session for tracking purposes
 */
interface TerminalSession {
  // The iTerm2 window ID
  windowId: string;
  // Time when this terminal was created
  createdAt: number;
}

/**
 * Default terminal options
 */
export const DEFAULT_TERMINAL_OPTIONS: TerminalOptions = {
  createDedicatedTerminal: true,
  profileName: 'agent_term',
  terminalName: 'AI Terminal'
};

/**
 * Storage file for terminal session persistence
 */
const TERMINAL_SESSION_FILE = join(homedir(), '.iterm-mcp-window');

const execPromise = promisify(exec);

/**
 * TerminalManager handles creating and managing dedicated terminals for the agent.
 * It uses a simplified approach focused on window ID tracking.
 */
export class TerminalManager {
  private options: TerminalOptions;
  private terminalSession: TerminalSession | null = null;

  constructor(options: Partial<TerminalOptions> = {}) {
    this.options = { ...DEFAULT_TERMINAL_OPTIONS, ...options };
    this.loadPersistedTerminal();
  }

  /**
   * Gets a terminal for command execution.
   * Creates a new one with agent profile if needed or reuses an existing one if available.
   * @returns A terminal session object
   */
  async getTerminal(): Promise<TerminalSession> {
    // First check if we should create a dedicated terminal at all
    if (!this.options.createDedicatedTerminal) {
      // If no dedicated terminal is requested, return a default session for the active terminal
      return { windowId: 'active', createdAt: Date.now() };
    }

    // Check if we already have a terminal session
    if (this.terminalSession) {
      // Verify that this window still exists
      const exists = await this.windowExists(this.terminalSession.windowId);
      if (exists) {
        return this.terminalSession;
      }
      console.log('Stored terminal session window no longer exists, creating a new one');
    }

    // Create a new terminal
    const newTerminalSession = await this.createDedicatedTerminal();
    this.terminalSession = newTerminalSession;
    this.persistTerminalSession();
    return newTerminalSession;
  }

  /**
   * Create a new dedicated terminal with the agent profile
   * @returns A terminal session object with window ID
   */
  private async createDedicatedTerminal(): Promise<TerminalSession> {
    // First make sure iTerm2 is running
    try {
      await execPromise('pgrep "iTerm2" || open -a "iTerm2"');
      // Wait a moment for iTerm to initialize if it was just launched
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn('Could not check or launch iTerm2:', error);
    }
    
    // Create a new window with the agent profile and get its ID
    // Following the approach from osascript_test.scpt
    const escapedProfileName = this.escapeForAppleScript(this.options.profileName);
    
    const createScript = `
      tell application "iTerm2"
        create window with profile "${escapedProfileName}"
        get id of current window
      end tell
    `;
    
    try {
      console.log('Creating new terminal with agent profile...');
      const { stdout } = await execPromise(`osascript -e '${createScript}'`);
      const windowId = stdout.trim();
      
      if (!windowId) {
        throw new Error('Failed to get window ID from AppleScript');
      }
      
      console.log(`Created new terminal with window ID: ${windowId}`);
      
      // Create our session object
      const session: TerminalSession = {
        windowId,
        createdAt: Date.now()
      };
      
      return session;
    } catch (error) {
      console.error(`Failed to create terminal: ${(error as Error).message}`);
      
      // Fall back to active terminal if creation fails
      console.warn('Falling back to active terminal');
      return {
        windowId: 'active-fallback',
        createdAt: Date.now()
      };
    }
  }

  /**
   * Check if a window with the given ID exists
   */
  private async windowExists(windowId: string): Promise<boolean> {
    // If using active terminal mode, always return true
    if (windowId === 'active' || windowId === 'active-fallback') {
      return true;
    }
    
    const script = `
      tell application "iTerm2"
        set windowExists to false
        repeat with aWindow in windows
          if id of aWindow is "${this.escapeForAppleScript(windowId)}" then
            set windowExists to true
            exit repeat
          end if
        end repeat
        return windowExists as string
      end tell
    `;

    try {
      const { stdout } = await execPromise(`osascript -e '${script}'`);
      return stdout.trim() === 'true';
    } catch (error) {
      console.error('Error checking if window exists:', error);
      return false;
    }
  }

  /**
   * Execute a command in a specific terminal identified by window ID
   * Using the direct window ID approach from osascript_test.scpt
   */
  async executeInTerminal(session: TerminalSession, command: string): Promise<void> {
    const escapedCommand = this.escapeForAppleScript(command);
    
    // If using active terminal, just execute in the active terminal
    if (session.windowId === 'active' || session.windowId === 'active-fallback') {
      const activeScript = `
        tell application "iTerm2"
          tell current session of current window
            write text "${escapedCommand}"
          end tell
        end tell
      `;
      
      await execPromise(`osascript -e '${activeScript}'`);
      return;
    }
    
    // Execute in the specific window by ID using the simple approach from osascript_test.scpt
    const script = `
      tell application "iTerm2"
        tell current session of window id ${session.windowId}
          write text "${escapedCommand}"
        end tell
      end tell
    `;
    
    try {
      await execPromise(`osascript -e '${script}'`);
    } catch (error) {
      throw new Error(`Failed to execute command: ${(error as Error).message}`);
    }
  }

  /**
   * Read terminal output from a terminal session
   */
  async readTerminalOutput(session: TerminalSession): Promise<string> {
    // If using active terminal, read from the active terminal
    if (session.windowId === 'active' || session.windowId === 'active-fallback') {
      const activeScript = `
        tell application "iTerm2"
          tell current session of current window
            return contents
          end tell
        end tell
      `;
      
      const { stdout } = await execPromise(`osascript -e '${activeScript}'`);
      return stdout.trim();
    }
    
    // Read from the specific window by ID using direct window id reference
    const script = `
      tell application "iTerm2"
        tell current session of window id ${session.windowId}
          return contents
        end tell
      end tell
    `;
    
    try {
      const { stdout } = await execPromise(`osascript -e '${script}'`);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to read terminal output: ${(error as Error).message}`);
    }
  }

  /**
   * Send a control character to the terminal
   */
  async sendControlCharacter(session: TerminalSession, letter: string): Promise<void> {
    let controlCode: number;

    if (letter.toUpperCase() === ']') {
      controlCode = 29; // GS - Group Separator (telnet escape)
    } else if (letter.toUpperCase() === 'ESCAPE' || letter.toUpperCase() === 'ESC') {
      controlCode = 27; // ESC - Escape
    } else {
      letter = letter.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) {
        throw new Error('Invalid control character letter');
      }
      controlCode = letter.charCodeAt(0) - 64; // Convert to control code
    }
    
    // If using active terminal, send to the active terminal
    if (session.windowId === 'active' || session.windowId === 'active-fallback') {
      const activeScript = `
        tell application "iTerm2"
          tell current session of current window
            write text (ASCII character ${controlCode})
          end tell
        end tell
      `;
      
      await execPromise(`osascript -e '${activeScript}'`);
      return;
    }
    
    // Send to the specific window by ID using direct window id reference
    const script = `
      tell application "iTerm2"
        tell current session of window id ${session.windowId}
          write text (ASCII character ${controlCode})
        end tell
      end tell
    `;
    
    try {
      await execPromise(`osascript -e '${script}'`);
    } catch (error) {
      throw new Error(`Failed to send control character: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a terminal is processing a command
   */
  async isProcessing(session: TerminalSession): Promise<boolean> {
    // If using active terminal, check the active terminal
    if (session.windowId === 'active' || session.windowId === 'active-fallback') {
      const activeScript = `
        tell application "iTerm2"
          tell current session of current window
            return is processing as string
          end tell
        end tell
      `;
      
      try {
        const { stdout } = await execPromise(`osascript -e '${activeScript}'`);
        return stdout.trim() === 'true';
      } catch (error) {
        return false;
      }
    }
    
    // Check the specific window by ID using direct window id reference
    const script = `
      tell application "iTerm2"
        tell current session of window id ${session.windowId}
          return is processing as string
        end tell
      end tell
    `;
    
    try {
      const { stdout } = await execPromise(`osascript -e '${script}'`);
      return stdout.trim() === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the TTY device path for the terminal
   */
  async getTtyPath(session: TerminalSession): Promise<string> {
    // If using active terminal, get tty from the active terminal
    if (session.windowId === 'active' || session.windowId === 'active-fallback') {
      const activeScript = `
        tell application "iTerm2"
          tell current session of current window
            return tty
          end tell
        end tell
      `;
      
      try {
        const { stdout } = await execPromise(`osascript -e '${activeScript}'`);
        return stdout.trim();
      } catch (error) {
        throw new Error(`Failed to get TTY path: ${(error as Error).message}`);
      }
    }
    
    // Get TTY from the specific window by ID using direct window id reference
    const script = `
      tell application "iTerm2"
        tell current session of window id ${session.windowId}
          return tty
        end tell
      end tell
    `;
    
    try {
      const { stdout } = await execPromise(`osascript -e '${script}'`);
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get TTY path: ${(error as Error).message}`);
    }
  }

  /**
   * Persist the terminal session to be reused across runs
   */
  private persistTerminalSession(): void {
    try {
      if (this.terminalSession && this.terminalSession.windowId !== 'active' && this.terminalSession.windowId !== 'active-fallback') {
        writeFileSync(
          TERMINAL_SESSION_FILE,
          JSON.stringify(this.terminalSession),
        );
        console.log(`Persisted terminal window ID: ${this.terminalSession.windowId}`);
      }
    } catch (error) {
      console.error('Failed to persist terminal session:', error);
    }
  }

  /**
   * Load a previously persisted terminal session
   */
  private loadPersistedTerminal(): void {
    try {
      if (existsSync(TERMINAL_SESSION_FILE)) {
        const content = readFileSync(TERMINAL_SESSION_FILE, 'utf8');
        if (content && content.trim()) {
          try {
            const parsedData = JSON.parse(content.trim());
            
            // Validate the parsed data
            if (parsedData && 
                typeof parsedData === 'object' &&
                'windowId' in parsedData && 
                'createdAt' in parsedData &&
                typeof parsedData.windowId === 'string' &&
                typeof parsedData.createdAt === 'number') {
              
              this.terminalSession = parsedData;
              console.log(`Loaded persisted terminal window ID: ${parsedData.windowId}`);
            } else {
              console.warn('Persisted terminal data has invalid format, ignoring it');
              try {
                unlinkSync(TERMINAL_SESSION_FILE);
                console.log('Removed corrupted terminal session file');
              } catch (deleteError) {
                console.error('Could not delete corrupted terminal session file:', deleteError);
              }
            }
          } catch (parseError) {
            console.error('Failed to parse terminal session data:', parseError);
            try {
              unlinkSync(TERMINAL_SESSION_FILE);
              console.log('Removed corrupted terminal session file');
            } catch (deleteError) {
              console.error('Could not delete corrupted terminal session file:', deleteError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load terminal session:', error);
      // Continue without a persisted session
    }
  }

  /**
   * Helper method to escape strings for AppleScript commands
   */
  private escapeForAppleScript(str: string): string {
    str = str.replace(/\\/g, '\\\\');
    str = str.replace(/"/g, '\\"');
    str = str.replace(/[^\x20-\x7E]/g, (char) => {
      return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
    });

    return str;
  }
}
