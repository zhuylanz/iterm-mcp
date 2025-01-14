import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);

export default class TtyOutputReader {
  static async call(linesOfOutput: number) {
    const buffer = await this.retrieveBuffer();
    const lines = buffer.split('\n');
    return lines.slice(-linesOfOutput).join('\n');
  }

  static async retrieveBuffer(): Promise<string> {
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