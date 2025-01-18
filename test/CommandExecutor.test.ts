import CommandExecutor from '../src/CommandExecutor.js';

async function testExecuteCommand() {
  const executor = new CommandExecutor();
  // Combine all arguments after the script name into a single command
  const command = process.argv.slice(2).join(' ') || 'date';
  
  try {
    const output = await executor.executeCommand(command);
    console.log('Command Output:', output);
  } catch (error) {
    console.error('Error executing command:', (error as Error).message);
  }
}

testExecuteCommand();