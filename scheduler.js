#!/usr/bin/env node
/**
 * Asia Aviation Daily Monitor Scheduler
 * Runs daily at 08:00 HKT (Asia/Hong_Kong)
 */

const { exec } = require('child_process');
const path = require('path');

const MONITOR_SCRIPT = '/data/.openclaw/workspace/asia-aviation-monitor/monitor.sh';
const TIMEZONE = 'Asia/Hong_Kong';

function getNextRunTime() {
    const now = new Date();
    // Convert to HKT
    const hktOffset = 8 * 60 * 60 * 1000; // UTC+8
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const hkt = new Date(utc + hktOffset);
    
    // Set to next 8am
    const nextRun = new Date(hkt);
    nextRun.setHours(8, 0, 0, 0);
    
    // If already past 8am today, schedule for tomorrow
    if (hkt.getHours() >= 8) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
}

function getDelayMs(targetTime) {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const hktOffset = 8 * 60 * 60 * 1000;
    const targetUtc = targetTime.getTime() - hktOffset;
    return Math.max(0, targetUtc - utc);
}

function runMonitor() {
    console.log(`[${new Date().toISOString()}] Running Asia Aviation Monitor...`);
    
    exec(`bash ${MONITOR_SCRIPT}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Monitor error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Monitor stderr: ${stderr}`);
        }
        console.log(`Monitor stdout: ${stdout}`);
    });
    
    // Schedule next run
    scheduleNextRun();
}

function scheduleNextRun() {
    const nextRun = getNextRunTime();
    const delayMs = getDelayMs(nextRun);
    const delayHours = delayMs / (1000 * 60 * 60);
    
    console.log(`[${new Date().toISOString()}] Next run: ${nextRun.toISOString()} (in ${delayHours.toFixed(2)} hours)`);
    
    setTimeout(runMonitor, delayMs);
}

// Start scheduler
console.log('Asia Aviation Monitor Scheduler Started');
console.log(`Timezone: ${TIMEZONE}`);
scheduleNextRun();

// Run immediately for testing if argument passed
if (process.argv[2] === '--run-now') {
    runMonitor();
}
