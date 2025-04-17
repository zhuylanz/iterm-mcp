# Multiline Text Support in iTerm MCP Extension

## Issue Summary

When sending multiline text through the MCP to iTerm2, the operation was failing with a syntax error. This affected basic operations like using text editors (nano, micro, vim), creating files with multiple lines, and working with remote servers via SSH.

## Error Message

```
Failed to call tool write_to_terminal: Error: MCP error -32603:
Failed to execute command: Command failed: /usr/bin/osascript -e
'tell application "iTerm2"...syntax error: Expected """ but found unknown token. (-2741)
```

## Root Cause

The issue was in the `escapeForAppleScript` method in the `CommandExecutor.ts` file. The method did not properly handle newlines in the AppleScript command. When newlines were present in the text, they would break the AppleScript string syntax, resulting in a syntax error.

## Solution

We implemented a solution that:

1. Detects when a command contains newlines
2. For multiline text, uses a different AppleScript approach that properly handles line breaks
3. For single-line text, continues to use the original approach with simple string escaping

The key part of the solution is using AppleScript's string concatenation with explicit return statements instead of trying to embed newlines directly in the AppleScript string.

### Implementation Details

1. Modified `escapeForAppleScript` to detect multiline text and handle it differently
2. Added a `prepareMultilineCommand` method that:
   - Splits the input by newlines
   - Creates an AppleScript string expression that concatenates each line with return statements
   - Uses AppleScript's `&` operator to concatenate strings with `return` between them
3. Added an `escapeAppleScriptString` method to properly escape special characters in each line
4. Updated `executeCommand` to use different AppleScript syntax based on whether the command contains newlines

## Usage

No changes to the existing API are required. The fix is implemented transparently, so clients can continue to use the extension the same way as before, but now with support for multiline content.

## Testing

A test file (`test/MultilineTest.ts`) was created to verify the fix works correctly with multiline text.

## Future Considerations

This approach should handle most multiline text scenarios, but there may be edge cases with very complex text containing special characters and newlines. If those arise, further refinements to the escaping logic may be needed.
