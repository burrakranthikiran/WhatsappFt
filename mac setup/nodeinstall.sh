#!/bin/bash

# Function to display messages
log_message() {
  echo -e "\033[1;32m$1\033[0m"
}

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
  log_message "nvm not found. Installing nvm..."
  
  # Install nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
  
  # Source nvm to use it immediately
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # Load nvm
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # Load bash_completion
else
  log_message "nvm is already installed."
fi

# Install Node.js version 20.11.0
log_message "Installing Node.js version 20.11.0..."
nvm install 20.11.0

# Set Node.js 20.11.0 as the default version
nvm use 20.11.0
nvm alias default 20.11.0

# Verify installation
log_message "Node.js version installed:"
node -v
log_message "npm version installed:"
npm -v
