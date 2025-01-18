
import CommandExecutor from '../src/CommandExecutor.js';

async function testExecuteCommand() {
  const executor = new CommandExecutor();
  const command = 'ps awux';
  
  try {
    const output = await executor.executeCommand(command);
    console.log('Command Output:', output);
  } catch (error) {
    console.error('Error executing command:', (error as Error).message);
  }
}

testExecuteCommand();