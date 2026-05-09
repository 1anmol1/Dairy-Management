#!/bin/bash
# install-chrome.sh — Install Puppeteer Chrome on Hostinger shared hosting
set -e
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
echo "Node: $(node -v)  NPM: $(npm -v)"
echo "Installing Chrome..."
cd "$(dirname "$0")/backend"
npx puppeteer browsers install chrome
echo ""
echo "Chrome installed at:"
find ~/.cache/puppeteer -name "chrome" -type f 2>/dev/null | head -5
echo "✅ Done."
