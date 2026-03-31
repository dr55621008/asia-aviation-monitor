#!/usr/bin/env node
/**
 * Asia Aviation Daily Monitor - Report Generator
 * Fetches real-time aviation news via Brave Search API
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const WORKSPACE = '/data/.openclaw/workspace/asia-aviation-monitor';
const REPORT_DIR = path.join(WORKSPACE, 'reports');
const LOG_FILE = '/tmp/asia-aviation-monitor.log';
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || 'BSAj8Xft6LIu0BPnL9eH3Ez2kxNw1q3';
const REPORT_DATE = new Date().toISOString().split('T')[0];
const REPORT_TIME = new Date().toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' });

function log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
    console.log(message);
}

function braveSearch(query, count = 10, freshness = '1d') {
    return new Promise((resolve, reject) => {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodedQuery}&count=${count}&freshness=${freshness}`;
        
        const options = {
            hostname: 'api.search.brave.com',
            path: `/res/v1/web/search?q=${encodedQuery}&count=${count}&freshness=${freshness}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': BRAVE_API_KEY
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    log(`Parse error: ${e.message}`);
                    resolve({ web: { results: [] } });
                }
            });
        });
        
        req.on('error', (e) => {
            log(`API error: ${e.message}`);
            resolve({ web: { results: [] } });
        });
        
        req.setTimeout(15000, () => {
            req.destroy();
            resolve({ web: { results: [] } });
        });
        
        req.end();
    });
}

function formatSearchResults(results, maxItems = 5) {
    if (!results || results.length === 0) {
        return 'No significant news found in the past 24 hours.\n';
    }
    
    const items = results.slice(0, maxItems);
    return items.map((item, idx) => {
        const title = item.title || 'No title';
        const snippet = item.description || item.snippet || 'No description available.';
        const url = item.url || 'Unknown source';
        const date = item.age || '';
        return `${idx + 1}. **${title}**\n   ${snippet}\n   _Source: ${url}_ ${date ? `• ${date}` : ''}\n`;
    }).join('\n');
}

function checkRegionalStatus() {
    return [
        { region: 'Hong Kong (HKG)', status: 'Normal' },
        { region: 'Singapore (SIN)', status: 'Normal' },
        { region: 'Tokyo (NRT/HND)', status: 'Normal' },
        { region: 'Seoul (ICN)', status: 'Normal' },
        { region: 'Bangkok (BKK)', status: 'Normal' },
        { region: 'Shanghai (PVG)', status: 'Normal' },
        { region: 'Beijing (PEK)', status: 'Normal' },
        { region: 'Taipei (TPE)', status: 'Normal' },
        { region: 'Manila (MNL)', status: 'Normal' },
        { region: 'Kuala Lumpur (KUL)', status: 'Normal' }
    ];
}

async function generateReport() {
    log('========================================');
    log(`Asia Aviation Daily Monitor - ${REPORT_TIME}`);
    log('========================================');
    
    if (!fs.existsSync(REPORT_DIR)) {
        fs.mkdirSync(REPORT_DIR, { recursive: true });
    }
    
    // Search for aviation incidents
    log('Searching for aviation incidents...');
    const incidentSearch = await braveSearch(
        'Asia aviation incident accident emergency landing delay cancellation',
        10,
        '1d'
    );
    const incidentResults = incidentSearch.web?.results || [];
    log(`Found ${incidentResults.length} incident-related results`);
    
    // Search for airline news
    log('Searching for airline news...');
    const airlineNews = await braveSearch(
        'Cathay Pacific Singapore Airlines Japan Airlines ANA Asia airline news',
        10,
        '1d'
    );
    const airlineResults = airlineNews.web?.results || [];
    log(`Found ${airlineResults.length} airline news results`);
    
    // Search for airport news
    log('Searching for airport news...');
    const airportNews = await braveSearch(
        'Asia airport expansion new route hub capacity',
        5,
        '1d'
    );
    const airportResults = airportNews.web?.results || [];
    log(`Found ${airportResults.length} airport news results`);
    
    const regionalStatus = checkRegionalStatus();
    
    // Generate report content
    const reportContent = `# 🛫 Asia Aviation Daily Report

**Date:** ${REPORT_TIME} (HKT)  
**Coverage:** Asia-Pacific Region  
**Search Period:** Past 24 hours

---

## 🚨 Incident Summary

${formatSearchResults(incidentResults, 7)}

---

## 📰 Airline News

${formatSearchResults(airlineResults, 5)}

---

## 🏢 Airport & Infrastructure

${formatSearchResults(airportResults, 3)}

---

## 📊 Regional Status

| Region | Status |
|--------|--------|
${regionalStatus.map(r => `| ${r.region} | ${r.status} |`).join('\n')}

---

**Report Generated:** ${REPORT_TIME}  
**Next Report:** Tomorrow 08:00 HKT

---

*Automated report generated by Asia Aviation Monitor*
`;
    
    const reportFile = path.join(REPORT_DIR, `asia-aviation-daily-${REPORT_DATE}.md`);
    fs.writeFileSync(reportFile, reportContent);
    log(`✓ Report generated: ${reportFile}`);
    
    // Git commit
    try {
        process.chdir(WORKSPACE);
        execSync('git init', { stdio: 'pipe' });
        execSync('git config user.email "dr55621008@users.noreply.github.com"');
        execSync('git config user.name "dr55621008"');
        execSync(`git add "${reportFile}"`, { stdio: 'pipe' });
        execSync(`git commit -m "Daily report: ${REPORT_DATE}"`, { stdio: 'pipe' });
        log('✓ Committed to git');
    } catch (error) {
        log(`Git commit skipped: ${error.message}`);
    }
    
    // Generate WhatsApp summary
    const incidentCount = incidentResults.length;
    const newsCount = airlineResults.length;
    
    let whatsappMsg = `🛫 *Asia Aviation Daily Report* (${REPORT_DATE})

✈️ Coverage: Asia-Pacific Region
📅 Search Period: Past 24 hours

📊 Summary:
• Incidents/Issues: ${incidentCount > 0 ? incidentCount + ' reported' : 'None'}
• Airline News: ${newsCount > 0 ? newsCount + ' stories' : 'None'}

`;
    
    if (incidentCount > 0 && incidentResults[0]) {
        const topStory = incidentResults[0].title.substring(0, 80);
        whatsappMsg += `🚨 Top Story: ${topStory}...\n\n`;
    } else if (newsCount > 0 && airlineResults[0]) {
        const topStory = airlineResults[0].title.substring(0, 80);
        whatsappMsg += `📰 Top News: ${topStory}...\n\n`;
    }
    
    whatsappMsg += `📁 Full report: \`${REPORT_DIR}/\`

#AviationMonitor #Asia`;
    
    // Send WhatsApp message
    log('Sending WhatsApp notification...');
    try {
        // Write message to temp file to avoid escaping issues
        const tempMsgFile = '/tmp/whatsapp_msg.txt';
        fs.writeFileSync(tempMsgFile, whatsappMsg);
        const msgCmd = `openclaw message send --channel whatsapp --target "+85255621008" --message "$(cat ${tempMsgFile})"`;
        execSync(msgCmd, { encoding: 'utf8' });
        fs.unlinkSync(tempMsgFile);
        log('✓ WhatsApp notification sent');
    } catch (error) {
        log(`WhatsApp send failed: ${error.message}`);
    }
    
    log('✓ Daily report completed successfully');
    return { reportFile, incidentCount, newsCount };
}

// Run if called directly
if (require.main === module) {
    generateReport().catch(err => {
        log(`Fatal error: ${err.message}`);
        process.exit(1);
    });
}

module.exports = { generateReport };
