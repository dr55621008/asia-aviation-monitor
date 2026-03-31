# Asia Aviation Daily Monitor

**Schedule:** Daily at 08:00 HKT  
**Coverage:** Asia-Pacific aviation incidents, accidents, and major news  
**Delivery:** WhatsApp report to +85255621008

---

## Setup

### Cron Job (8am Daily)

```bash
# Add to crontab
0 8 * * * /data/.openclaw/workspace/asia-aviation-monitor/monitor.sh >> /tmp/asia-aviation-monitor.log 2>&1
```

### Manual Test Run

```bash
/data/.openclaw/workspace/asia-aviation-monitor/monitor.sh
```

---

## Report Structure

- **Incident Summary:** Accidents, emergency landings, safety incidents
- **Airline News:** Major airline announcements, operational changes
- **Regional Status:** Airport status across major Asia hubs

---

## Files

- `monitor.sh` - Main monitoring script
- `reports/` - Daily report archives (Markdown)
- `README.md` - This file

---

## Search Queries

1. Asia aviation incident accident emergency landing
2. Asia airline news (Cathay, Singapore, JAL, etc.)
3. Regional airport operations

---

**Created:** 2026-03-30  
**Owner:** LKing
