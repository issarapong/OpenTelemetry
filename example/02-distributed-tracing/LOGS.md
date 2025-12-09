# OpenTelemetry Distributed Tracing with Logs

สำหรับ distributed-tracing ให้เพิ่ม logs support เข้าไปในแต่ละ service

## วิธีเพิ่ม Logs ลงใน Distributed Services

### 1. อัปเดต `tracing.js` ใน service-a, service-b, service-c

เพิ่ม LoggerProvider และ OTLPLogExporter:

```javascript
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { logs } = require('@opentelemetry/api-logs');

// ... existing code ...

// ตั้งค่า Log Exporter และ Logger Provider
const logExporter = new OTLPLogExporter({
  url: 'http://localhost:4318/v1/logs',
});

const loggerProvider = new LoggerProvider({
  resource: resource,
});

loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(logExporter)
);

logs.setGlobalLoggerProvider(loggerProvider);
const logger = loggerProvider.getLogger('default', '1.0.0');

// Export logger
module.exports = { logger };
```

### 2. อัปเดต `app.js`

Import logger และใช้งาน:

```javascript
const { logger } = require('./tracing');
const { SeverityNumber } = require('@opentelemetry/api-logs');

// ใช้ logger ใน routes
app.get('/', async (req, res) => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Root endpoint accessed',
    attributes: {
      'service': 'service-a',
    },
  });
  
  // ... rest of code ...
});
```

### 3. อัปเดต `package.json`

เพิ่ม dependencies:

```json
{
  "dependencies": {
    "@opentelemetry/exporter-logs-otlp-http": "^0.45.0",
    "@opentelemetry/api-logs": "^0.45.0",
    "@opentelemetry/sdk-logs": "^0.45.0"
  }
}
```

---

## ตัวอย่าง Log Records ใน Distributed System

### Service A logs:
```
[INFO] Incoming request to /api/chain
[INFO] Calling Service B at http://service-b:3011/data
[INFO] Response from Service B received
```

### Service B logs:
```
[INFO] Incoming request to /data
[INFO] Calling Service C at http://service-c:3012/process
[INFO] Response from Service C received
```

### Service C logs:
```
[INFO] Incoming request to /process
[INFO] Processing data
[INFO] Processing completed
```

**ทั้งหมดจะมี TraceID เดียวกัน** → สามารถติดตามได้ว่า request นี้ไหลผ่าน service ใดบ้าง

---

## Query Logs with Trace Context

ใน Grafana Loki:

```logql
# ดู logs ทั้งหมดของ trace_id นั้น
{service_name=~"service-.*"} | json | trace_id="abc123def456"

# ดู ERROR logs จากทุก service
{service_name=~"service-.*"} | json | severity_text="ERROR"

# ดู logs ของ service-a เฉพาะ INFO level
{service_name="service-a-auto"} | json | severity_text="INFO"
```

---

## สรุป

หลังจากเพิ่ม Logs เข้าไปแล้ว คุณจะได้:

✅ **Traces** - ดู request flow ผ่าน service A → B → C  
✅ **Metrics** - วัด request duration, error rate  
✅ **Logs** - บันทึก events และ errors พร้อม TraceID  

= **Full Observability** 🎯
