/**
 * Test for SSE Transport functionality
 * 
 * This test file provides a simple way to test the SSE server transport
 * by starting an SSE server and connecting to it with a simple client.
 */

import { SseServerTransport } from '../../src/transport/SseServerTransport.js';
import { DEFAULT_CLI_OPTIONS } from '../../src/cli/CliOptions.js';

/**
 * Simple test for SSE transport 
 * Start this test with:
 * ts-node --esm test/transport/SseTransport.test.ts
 */
async function testSseTransport() {
  console.log("Starting SSE transport test...");

  // Create an SSE transport with test options
  const options = {
    ...DEFAULT_CLI_OPTIONS,
    transport: "sse" as const,
    port: 3030, // Use a different port than default for testing
  };

  const transport = new SseServerTransport(options);
  
  // Mock callbacks that the MCP server would normally provide
  const callbacks = {
    onMessage: (message: any) => {
      console.log("Received message from client:", message);
      
      // Echo the message back to show bidirectional communication
      transport.postMessage({
        type: "echo",
        originalMessage: message,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Connect the transport
  await transport.connect(callbacks);
  
  console.log("SSE transport test server started");
  console.log(`Test by opening in browser: http://${options.host}:${options.port}${options.basePath}/test.html`);
  
  // Create a simple test HTML client
  console.log("\nHere's a simple HTML client you can save as test.html and open in a browser:");
  console.log(`
<!DOCTYPE html>
<html>
<head>
  <title>iterm-mcp SSE Test Client</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    #output { background: #f0f0f0; padding: 10px; border-radius: 5px; height: 300px; overflow: auto; margin: 10px 0; }
    button, input { padding: 8px; margin: 5px 0; }
    input { width: 70%; }
  </style>
</head>
<body>
  <h1>iterm-mcp SSE Test Client</h1>
  <div id="output"></div>
  
  <div>
    <input type="text" id="commandInput" placeholder="Enter command to send to terminal..." />
    <button onclick="sendCommand()">Send Command</button>
  </div>
  
  <div>
    <input type="number" id="linesInput" value="10" min="1" max="100" />
    <button onclick="readOutput()">Read Output</button>
  </div>
  
  <div>
    <input type="text" id="controlCharInput" placeholder="Control character (e.g., 'c' for Ctrl-C)" maxlength="1" />
    <button onclick="sendControlChar()">Send Control Character</button>
  </div>

  <script>
    const output = document.getElementById('output');
    const baseUrl = '${options.basePath}';
    let eventSource;
    
    // Connect to SSE endpoint
    function connect() {
      eventSource = new EventSource(baseUrl + '/sse');
      
      eventSource.onopen = () => {
        logMessage('Connected to server');
      };
      
      eventSource.onerror = (error) => {
        logMessage('Error: ' + JSON.stringify(error));
        eventSource.close();
        setTimeout(connect, 5000);
      };
      
      // Listen for SSE events
      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        logMessage('Received: ' + JSON.stringify(data));
      });
      
      eventSource.addEventListener('connected', (event) => {
        logMessage('Server says: ' + event.data);
      });
    }
    
    // Send a command to the terminal
    function sendCommand() {
      const command = document.getElementById('commandInput').value;
      if (!command) return;
      
      fetch(baseUrl + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'write_to_terminal',
          arguments: { command }
        })
      })
      .then(response => response.json())
      .then(data => logMessage('Command sent: ' + command))
      .catch(error => logMessage('Error sending command: ' + error));
      
      document.getElementById('commandInput').value = '';
    }
    
    // Read terminal output
    function readOutput() {
      const lines = document.getElementById('linesInput').value;
      
      fetch(baseUrl + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'read_terminal_output',
          arguments: { linesOfOutput: Number(lines) }
        })
      })
      .then(response => response.json())
      .then(data => logMessage('Reading output: ' + lines + ' lines'))
      .catch(error => logMessage('Error reading output: ' + error));
    }
    
    // Send control character
    function sendControlChar() {
      const letter = document.getElementById('controlCharInput').value;
      if (!letter) return;
      
      fetch(baseUrl + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'send_control_character',
          arguments: { letter }
        })
      })
      .then(response => response.json())
      .then(data => logMessage('Sent control character: Control-' + letter.toUpperCase()))
      .catch(error => logMessage('Error sending control character: ' + error));
      
      document.getElementById('controlCharInput').value = '';
    }
    
    // Log message to output div
    function logMessage(msg) {
      const time = new Date().toLocaleTimeString();
      output.innerHTML += `<div>[${time}] ${msg}</div>`;
      output.scrollTop = output.scrollHeight;
    }
    
    // Start connection
    connect();
  </script>
</body>
</html>
  `);
  
  // Keep the server running
  await new Promise(() => {});
}

testSseTransport();