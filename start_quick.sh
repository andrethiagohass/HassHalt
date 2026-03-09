#!/bin/bash
# Use this with Git Bash: bash start_quick.sh
# On PowerShell use: .\start_quick.ps1

echo "Starting HassHalt..."
taskkill //F //IM node.exe 2>/dev/null || true
sleep 1
npm run dev
