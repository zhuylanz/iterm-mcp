#!/usr/bin/osascript

# The first script return the id of the current window, it's 31600 in this case
tell application "iTerm2"
  create window with profile "agent_term"
	get id of current window
end tell

# The second script uses the id of the current window to write a command in the terminal
tell application "iTerm2"
  tell current session of window id 31600
		write text "echo 'Hello World'"
	end tell
end tell

