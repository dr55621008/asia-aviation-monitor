#!/bin/bash
# Asia Aviation Daily Monitor - 8am Daily Report
# Wrapper script that calls the Node.js report generator

set -e

WORKSPACE="/data/.openclaw/workspace/asia-aviation-monitor"
LOG_FILE="/tmp/asia-aviation-monitor.log"
REPORT_TIME=$(date '+%Y-%m-%d %H:%M')

echo "========================================" >> "$LOG_FILE"
echo "Asia Aviation Daily Monitor - $REPORT_TIME" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

cd "$WORKSPACE"

# Run the Node.js report generator
node generate-report.js

echo "✓ Monitor script completed" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
