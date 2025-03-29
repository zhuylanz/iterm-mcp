import CommandExecutor from '../src/CommandExecutor.js';
import TtyOutputReader from '../src/TtyOutputReader.js';
import SendControlCharacter from '../src/SendControlCharacter.js';

async function testExecuteCommand() {
  const executor = new CommandExecutor();
  // Combine all arguments after the script name into a single command
  const command = process.argv.slice(2).join(' ') || 'date';
  
  try {
    const beforeCommandBuffer = await TtyOutputReader.retrieveBuffer();
    const beforeCommandBufferLines = beforeCommandBuffer.split("\n").length;

    await executor.executeCommand(command);

    const afterCommandBuffer = await TtyOutputReader.retrieveBuffer();
    const afterCommandBufferLines = afterCommandBuffer.split("\n").length;
    const outputLines = afterCommandBufferLines - beforeCommandBufferLines
    
    const buffer = await TtyOutputReader.call(outputLines)
    console.log(buffer);

    console.log(`Lines: ${outputLines}`);
  } catch (error) {
    console.error('Error executing command:', (error as Error).message);
  }
}

async function testSendControlCharacter() {
  const executor = new CommandExecutor();
  // Combine all arguments after the script name into a single command
  const command = "sleep 120"
  
  try {
    console.log("Executing sleep command...");
    executor.executeCommand(command) // purposefully not awaited
    
    // give the command time to start
    console.log("Waiting 5 seconds.");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("Sending control character...");
    const ttyControl = new SendControlCharacter();
    await ttyControl.send("c")

    console.log("Control character sent.");
  } catch (error) {
    console.error('Error executing command:', (error as Error).message);
  }
}

testSendControlCharacter()