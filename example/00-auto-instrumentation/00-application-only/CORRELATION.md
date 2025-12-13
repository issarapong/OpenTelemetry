# Trace-to-Logs Correlation Configuration

## Overview
การตั้งค่านี้ทำให้ Grafana สามารถเชื่อมโยง Traces กับ Logs ได้อัตโนมัติผ่าน Trace ID

## สรุป Architecture

```
Application (Node.js + OpenTelemetry SDK)
    ↓ (ส่ง traces, metrics, logs พร้อม trace_id)
OTel Collector
    ↓ traces → Tempo
    ↓ metrics → Prometheus
    ↓ logs → Loki (พร้อม trace_id)
Grafana
    ↔ Tempo ↔ Loki ↔ Prometheus
    (correlation อัตโนมัติผ่าน trace_id, exemplars)
```

## Components

### 1. OpenTelemetry Collector (`otel-collector-config.yaml`)
- **Resource Processor**: เพิ่ม service.name และ metadata อื่นๆ
- **Attributes Processor**: กำหนด labels สำหรับ Loki
- **Loki Exporter**: ส่ง logs พร้อม trace_id และ span_id เป็น labels

```yaml
processors:
  resource:
    attributes:
      - key: loki.resource.labels
        action: insert
        value: service.name, service.namespace
  
  attributes:
    actions:
      - key: loki.attribute.labels
        action: insert
        value: trace_id, span_id

exporters:
  loki:
    labels:
      resource:
        service.name: "service_name"
      attributes:
        trace_id: "trace_id"
        span_id: "span_id"
```

### 2. Grafana Datasources (`grafana/provisioning/datasources/datasources.yml`)

#### Tempo → Loki
```yaml
tracesToLogs:
  datasourceUid: 'loki'
  tags: ['job', 'instance', 'pod', 'namespace']
  mappedTags: [{ key: 'service.name', value: 'service' }]
```

#### Loki → Tempo
```yaml
derivedFields:
  - datasourceUid: tempo
    matcherRegex: "(?:traceid|traceID|trace_id)[\":\\s]+([a-fA-F0-9]{32})"
    name: TraceID
    url: "$${__value.raw}"
    urlDisplayLabel: "View Trace"
```

**อธิบาย:**
- `matcherRegex`: จับ trace ID ได้หลายรูปแบบ (traceid, traceID, trace_id)
- `[a-fA-F0-9]{32}`: trace ID เป็น hex 32 ตัวอักษร
- `urlDisplayLabel`: ข้อความที่แสดงบน link → "View Trace"
- เมื่อคลิก link จะเปิด Tempo พร้อม trace ID นั้น

### 3. Application Logger (`logger.js`)
- ดึง trace context (trace_id, span_id) จาก active span
- รวม trace context เข้าไปใน log attributes
- ส่งไปยัง OpenTelemetry Logger

```javascript
const traceContext = this.getTraceContext();
const logAttributes = {
  ...attributes,
  ...traceContext, // trace_id, span_id
};
```

**อธิบาย:**
- `trace.getSpan(context.active())`: ดึง span ที่กำลัง active อยู่
- `spanContext.traceId`: ได้ trace ID ของ request ปัจจุบัน
- `spanContext.spanId`: ได้ span ID ของ operation ปัจจุบัน
- รวม trace context เข้าไปใน log → Loki จะเก็บ trace_id เป็น attribute
- Grafana ใช้ trace_id นี้เชื่อมโยงไปยัง Tempo
```javascript
const traceContext = this.getTraceContext();
const logAttributes = {
  ...attributes,
  ...traceContext, // trace_id, span_id
};
```

## How It Works

### Flow:
```
1. HTTP Request → Auto-instrumentation สร้าง Trace
2. Application log → logger.js เพิ่ม trace_id, span_id
3. OTel Collector → Processors เพิ่ม labels
4. Loki → เก็บ logs พร้อม trace_id label
5. Grafana → เชื่อมโยง Trace ↔ Logs อัตโนมัติ
```

### In Grafana:
1. **Explore → Tempo**: ดู traces
   - คลิกที่ trace → มีปุ่ม "Logs for this span"
   - เปิดไปยัง Loki พร้อม filter trace_id อัตโนมัติ

2. **Explore → Loki**: ดู logs
   - ถ้า log มี traceID → แสดงเป็น link
   - คลิกเพื่อดู trace ที่เกี่ยวข้อง

3. **Dashboard**: แสดง metrics + traces + logs ในที่เดียว

## Usage Example

### Application Code:
```javascript
const correlatedLogger = require('./logger');

app.get('/api/users/:id', async (req, res) => {
  // Trace จะถูกสร้างอัตโนมัติโดย auto-instrumentation
  
  // Log พร้อม trace correlation
  correlatedLogger.info('Fetching user', {
    'user.id': req.params.id,
  });
  
  // ... business logic
});
```

### Query in Grafana:

#### Loki Query (filter by trace_id):
```logql
{service_name="auto-instrumentation-example"} 
  |= "Fetching user"
  | trace_id="abc123..."
```

#### Tempo Query → Jump to Logs:
1. Search trace by trace_id
2. Click on span
3. Click "Logs for this span"
4. Grafana auto-queries Loki with the trace_id

## Benefits
## Testing Correlation

### 1. Start Services
```bash
docker compose up -d
```

### 2. Generate Traffic
```bash
# ส่ง request หลายๆ ครั้ง
for i in {1..10}; do
  curl http://localhost:3001/api/users/$i
  sleep 1
done
```

### 3. ทดสอบใน Grafana (http://localhost:3000)

#### วิธีที่ 1: จาก Trace → Logs
1. เปิด **Explore → Tempo**
2. Search traces (เว้นว่างไว้แล้วกด Run query)
3. คลิกที่ trace ที่ต้องการ
4. คลิกปุ่ม **"Logs for this span"** ด้านบน
5. Grafana จะเปิด Loki พร้อม filter `trace_id` อัตโนมัติ
6. จะเห็น logs ทั้งหมดที่เกี่ยวข้องกับ trace นั้น

#### วิธีที่ 2: จาก Logs → Trace
1. เปิด **Explore → Loki**
2. Query: `{service_name="auto-instrumentation-example"}`
3. คลิก **Show Details** ที่ log entry
4. จะเห็น field `traceid` พร้อม link **"View Trace"**
5. คลิก link → เปิด Tempo พร้อม trace นั้นทันที

#### วิธีที่ 3: จาก Metrics → Trace
1. เปิด **Explore → Prometheus**
2. Query: `rate(traces_spanmetrics_calls_total[5m])`
3. คลิกที่จุดบน graph → เลือก **"Exemplar"**
4. คลิก exemplar → เปิด trace ที่เกี่ยวข้อง

### 4. Dashboard View
1. เปิด **Dashboards → OpenTelemetry Overview**
2. ดู metrics, traces, logs ในที่เดียว
3. คลิกที่ panel ใดๆ → drill down ไปยัง trace หรือ logs ได้

## Troubleshooting

### ไม่เห็น link "View Trace" ใน Loki
**สาเหตุ:** regex ไม่ตรงกับ format ของ trace ID

**แก้ไข:** ตรวจสอบ log format ว่า trace ID อยู่ในรูปแบบไหน
- ถ้าเป็น JSON: `"traceid":"abc123..."`
- ถ้าเป็น text: `traceid=abc123...`
- regex ปัจจุบันรองรับทั้งสองแบบ

### Correlation ไม่ทำงาน
**ตรวจสอบ:**
1. Application ส่ง logs พร้อม trace_id หรือไม่
   ```bash
   docker logs auto-instrumentation-app | grep traceid
   ```
2. Loki เก็บ trace_id เป็น attribute หรือไม่
   - ดูใน Loki log details
3. Grafana datasource UIDs ตรงกันหรือไม่
   - Tempo UID: `tempo`
   - Loki UID: `loki`
   - Prometheus UID: `prometheus`

### Traces ไม่แสดงใน Tempo
**ตรวจสอบ:**
1. Application ส่ง traces ไปที่ `otel-collector:4318` (ไม่ใช่ localhost)
2. OTel Collector ส่งต่อไปที่ `tempo:4317`
3. Tempo รับ OTLP gRPC ที่ port 4317
   ```bash
   docker logs tempo | grep -i error
   ```
curl http://localhost:3001/api/users/123
```

3. View in Grafana (http://localhost:3000):
   - Explore → Tempo: Search traces
   - Click trace → "Logs for this span"
   - View correlated logs automatically
