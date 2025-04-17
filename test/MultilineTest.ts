import CommandExecutor from '../build/CommandExecutor.js';
import TtyOutputReader from '../build/TtyOutputReader.js';

async function testMultilineCommand() {
  const executor = new CommandExecutor();
  
  // Create a multiline command
  const multilineText = `Line 1
Line 2
Line 3
Line 4
This is a test of the multiline functionality.`;
  
  try {
    console.log("Testing multiline command handling...");
    console.log("Sending multiline text:");
    console.log("---");
    console.log(multilineText);
    console.log("---");
    
    const beforeCommandBuffer = await TtyOutputReader.retrieveBuffer();
    const beforeCommandBufferLines = beforeCommandBuffer.split("\n").length;

    await executor.executeCommand(multilineText);

    const afterCommandBuffer = await TtyOutputReader.retrieveBuffer();
    const afterCommandBufferLines = afterCommandBuffer.split("\n").length;
    const outputLines = afterCommandBufferLines - beforeCommandBufferLines;
    
    console.log(`Result: ${outputLines} new lines were output`);
    
    const buffer = await TtyOutputReader.call(20);
    console.log("Last 20 lines of output:");
    console.log(buffer);
    
  } catch (error) {
    console.error('Error executing multiline command:', (error as Error).message);
  }
}

testMultilineCommand();
