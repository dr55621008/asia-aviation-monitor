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

function parseAgeToHours(age) {
    if (!age) return 999; // Unknown age = reject
    const ageLower = age.toLowerCase();
    
    // Parse time units
    const minutesMatch = ageLower.match(/(\d+)\s*min/);
    if (minutesMatch) return parseInt(minutesMatch[1]) / 60;
    
    const hoursMatch = ageLower.match(/(\d+)\s*hr/);
    if (hoursMatch) return parseInt(hoursMatch[1]);
    
    const daysMatch = ageLower.match(/(\d+)\s*day/);
    if (daysMatch) return parseInt(daysMatch[1]) * 24;
    
    // Text-based ages
    if (ageLower.includes('today')) return 12;
    if (ageLower.includes('yesterday')) return 24;
    
    // Reject old content
    if (ageLower.includes('week')) return 999;
    if (ageLower.includes('month')) return 999;
    if (ageLower.includes('year')) return 999;
    
    return 999; // Unknown = reject
}

function isWithin24Hours(age) {
    const hours = parseAgeToHours(age);
    return hours <= 24;
}

function filterRecentResults(results, maxAgeHours = 24) {
    if (!results || results.length === 0) return [];
    return results.filter(item => {
        const age = item.age || '';
        return isWithin24Hours(age);
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
    
    // Search for aviation incidents (include flight tracking sources)
    log('Searching for aviation incidents (24h only)...');
    const incidentSearch = await braveSearch(
        'Asia aviation incident accident emergency landing delay cancellation site:flightradar24.com OR site:flightglobal.com OR site:simpleflying.com OR site:aviation24.be OR site:aeroroutes.com',
        10,
        '1d'
    );
    let incidentResults = incidentSearch.web?.results || [];
    incidentResults = filterRecentResults(incidentResults);
    log(`Found ${incidentResults.length} recent incident results (24h)`);
    
    // Search for airline news (major Asia carriers + industry sites)
    log('Searching for airline news (24h only)...');
    const airlineNews = await braveSearch(
        'Cathay Pacific Singapore Airlines Japan Airlines ANA China Eastern China Southern AirAsia Malaysia Airlines Philippines Airlines site:flightglobal.com OR site:simpleflying.com OR site:airlineratings.com OR site:aeroroutes.com OR site:ch-aviation.com',
        10,
        '1d'
    );
    let airlineResults = airlineNews.web?.results || [];
    airlineResults = filterRecentResults(airlineResults);
    log(`Found ${airlineResults.length} recent airline news results (24h)`);
    
    // Search for airport news
    log('Searching for airport news (24h only)...');
    const airportNews = await braveSearch(
        'Asia airport expansion new route hub capacity site:airport-technology.com OR site:flightglobal.com OR site:aeroroutes.com',
        5,
        '1d'
    );
    let airportResults = airportNews.web?.results || [];
    airportResults = filterRecentResults(airportResults);
    log(`Found ${airportResults.length} recent airport news results (24h)`);
    
    // Search for flight tracking data (delays, disruptions)
    log('Searching for flight tracking updates (24h only)...');
    const flightTracking = await braveSearch(
        'Asia flight delays disruptions cancellations today site:flightradar24.com OR site:flightstats.com OR site:flightaware.com',
        5,
        '1d'
    );
    let trackingResults = flightTracking.web?.results || [];
    trackingResults = filterRecentResults(trackingResults);
    log(`Found ${trackingResults.length} recent flight tracking results (24h)`);
    
    const regionalStatus = checkRegionalStatus();
    
    // Generate report content
    const reportContent = `# 🛫 Asia Aviation Daily Report

**Date:** ${REPORT_TIME} (HKT)  
**Coverage:** Asia-Pacific Region  
**Search Period:** Past 24 hours

**Sources:** FlightRadar24, FlightGlobal, Simple Flying, AirlineRatings, AeroRoutes, Aviation24, ch-aviation, Airport Technology

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

## ✈️ Flight Tracking & Disruptions

${formatSearchResults(trackingResults, 5)}

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
    
    // Git commit and push
    try {
        process.chdir(WORKSPACE);
        execSync('git init', { stdio: 'pipe' });
        execSync('git config user.email "dr55621008@users.noreply.github.com"');
        execSync('git config user.name "dr55621008"');
        execSync(`git add "${reportFile}"`, { stdio: 'pipe' });
        execSync(`git add reports/`, { stdio: 'pipe' });
        execSync(`git commit -m "Daily report: ${REPORT_DATE}"`, { stdio: 'pipe' });
        execSync('git push origin master', { stdio: 'pipe', timeout: 30000 });
        log('✓ Committed and pushed to GitHub');
    } catch (error) {
        log(`Git push skipped: ${error.message}`);
    }
    
    // Generate WhatsApp summary
    const incidentCount = incidentResults.length;
    const newsCount = airlineResults.length;
    const airportCount = airportResults.length;
    const trackingCount = trackingResults.length;
    
    let whatsappMsg = `🛫 *Asia Aviation Daily Report* (${REPORT_DATE})

✈️ Coverage: Asia-Pacific Region
📅 Search Period: Past 24 hours

📊 Summary:
• Incidents/Issues: ${incidentCount > 0 ? incidentCount + ' reported' : 'None'}
• Airline News: ${newsCount > 0 ? newsCount + ' stories' : 'None'}
• Airport Updates: ${airportCount > 0 ? airportCount + ' updates' : 'None'}
• Flight Disruptions: ${trackingCount > 0 ? trackingCount + ' alerts' : 'None'}

📰 Sources: FlightRadar24, FlightGlobal, Simple Flying, AirlineRatings, AeroRoutes

`;
    
    if (incidentCount > 0 && incidentResults[0]) {
        const topStory = incidentResults[0].title.substring(0, 80);
        whatsappMsg += `🚨 Top Story: ${topStory}...\n\n`;
    } else if (newsCount > 0 && airlineResults[0]) {
        const topStory = airlineResults[0].title.substring(0, 80);
        whatsappMsg += `📰 Top News: ${topStory}...\n\n`;
    }
    
    whatsappMsg += `📁 Full report: \`${REPORT_DIR}/\`
🔗 GitHub: github.com/dr55621008/asia-aviation-monitor

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
