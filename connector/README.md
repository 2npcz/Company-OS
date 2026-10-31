# Company OS — Local Attendance Connector (ZKTeco MB460)

The **Company OS Local Attendance Connector** is a lightweight, fault-tolerant background service designed to run on a local office machine, server, or Raspberry Pi connected to the same Local Area Network (LAN) as your physical ZKTeco MB460 attendance terminal.

---

## 1. Architecture

```text
               ┌─────────────────────────┐
               │       Company OS        │
               │   (React + Supabase)    │
               └────────────┬────────────┘
                            │ HTTPS / Supabase REST
                            ▼
               ┌─────────────────────────┐
               │    Local Connector      │
               │   Node.js Service       │
               │  [Local SQLite/JSON]    │
               └────────────┬────────────┘
                            │ LAN / TCP Port 4370
                            ▼
               ┌─────────────────────────┐
               │   ZKTeco MB460 Device   │
               │   (Facial/Fingerprint)  │
               └─────────────────────────┘
```

### Key Capabilities
- **Direct LAN Communication:** Communicates directly with ZKTeco devices over TCP/IP (port 4370).
- **Persistent Local Queue:** Persists transactions in `data/attendance_queue.json`. If the office internet goes down, punches remain queued locally and upload automatically once internet is restored.
- **Idempotent Ingestion:** Every punch is tagged with an external unique ID to guarantee deduplication on Supabase.
- **Heartbeat Reporting:** Reports terminal online/offline health directly to the Company OS dashboard.

---

## 2. Setup & Configuration

### Step 1: Copy Configuration
Copy `config.example.json` to `config.json`:
```bash
cp config.example.json config.json
```

### Step 2: Configure Parameters
Edit `config.json`:
```json
{
  "supabaseUrl": "https://vxxhziyepxddxiptfqab.supabase.co",
  "supabaseKey": "YOUR_SUPABASE_SERVICE_ROLE_KEY",
  "organizationId": "YOUR_ORGANIZATION_UUID",
  "syncIntervalSeconds": 30,
  "heartbeatIntervalSeconds": 60,
  "devices": [
    {
      "id": "UUID_OF_DEVICE_IN_COMPANY_OS",
      "name": "Head Office Main Entrance",
      "model": "MB460",
      "ip": "192.168.1.201",
      "port": 4370,
      "commKey": 0,
      "timeoutMs": 4000
    }
  ]
}
```

---

## 3. Running the Connector

### Test Network Connectivity to Terminal
Verify that the connector machine can reach the ZKTeco MB460 over the LAN:
```bash
npm run test-connection
```

### Run a Single Manual Sync
Fetch punches, enqueue, upload to Supabase, and exit:
```bash
npm run sync-now
```

### Run Continuously in Production (Daemon)
```bash
npm run start
```
Or with `pm2` for continuous automatic restart:
```bash
pm2 start dist/index.js --name "company-os-zk-connector"
pm2 save
```
