#!/bin/bash

# Display the current file location
echo "Current file location: $(dirname "$0")"

# Navigate to the directory where the script is located
cd "$(dirname "$0")" || exit

# Move one directory up
cd ..

# Display the current directory to confirm navigation
echo "Current directory after moving up: $(pwd)"

# stop the `whatsapp-api.js` script using PM2
pm2 stop whatsapp-api.js

# Pause the script to keep the window open (not typically needed on macOS)
read -p "Press Enter to continue..."
