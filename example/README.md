# OpenTelemetry Express Examples

ตัวอย่างการใช้งาน OpenTelemetry กับ Node.js Express Application แบบต่างๆ

## 📊 OpenTelemetry Signals

OpenTelemetry รองรับ 3 signals หลัก:

| Signal | Description | Example Use Case |
|--------|-------------|------------------|
| 📝 **Traces** | ติดตาม request flow ผ่าน services | วิเคราะห์ latency ของแต่ละ operation |
| 📈 **Metrics** | วัดและ aggregate ค่าต่างๆ | Monitor request rate, error rate, duration |
| 🗒️ **Logs** | บันทึกเหตุการณ์และข้อความ | ดู error messages, user actions |

**ตัวอย่างนี้รองรับครบทั้ง 3 signals!**

---

## 📚 ตัวอย่างที่มีให้

### 🤖 [Auto-Instrumentation Example](./auto-instrumentation/)
- ติดตาม Express และ HTTP requests อัตโนมัติ
- Setup รวดเร็ว ใช้โค้ดน้อย
- เหมาะสำหรับ quick start และ production
- **รองรับ: Traces + Metrics + Logs**
- Port: `3001`

### ✍️ [Manual-Instrumentation Example](./manual-instrumentation/)
- ควบคุมการสร้าง span ได้อย่างละเอียด
- เหมาะสำหรับ custom business logic
- เรียนรู้การทำงานของ OpenTelemetry อย่างลึกซึ้ง
- **รองรับ: Traces + Metrics + Logs**
- Port: `3002`

### 🌐 [Distributed-Tracing Example](./distributed-tracing/)
- Trace requests ข้ามหลาย microservices (A → B → C)
- แสดงทั้ง Auto และ Manual context propagation
- เหมาะสำหรับเรียนรู้ microservices tracing
- **รองรับ: Traces + Metrics + Logs**
- Ports: `3010-3012` (Auto), `3020-3022` (Manual)

### 🗒️ [Logs Documentation](./logs/)
- เอกสารครบถ้วนเกี่ยวกับ OpenTelemetry Logs
- วิธีใช้งาน LoggerProvider และ Logger
- Best practices สำหรับ structured logging
- การเชื่อมโยง Logs กับ Traces

## 📋 ข้อกำหนดเบื้องต้น

- Node.js 16+ 
- Docker และ Docker Compose
- npm หรือ yarn

## 🚀 Quick Start

> **หน่วง:** แต่ละตัวอย่างมี config files และ observability stack ของตัวเองแล้ว!

### วิธีที่ 1: รันแต่ละตัวอย่างแบบ Standalone (แนะนำ)

แต่ละตัวอย่างสามารถรันได้เองโดยไม่ต้องพึ่ง example หลัก

**Auto-Instrumentation (Standalone):**
```bash
cd auto-instrumentation
docker-compose up --build
# เข้าถึงได้ที่ http://localhost:3001
```

**Manual-Instrumentation (Standalone):**
```bash
cd manual-instrumentation
docker-compose up --build
# เข้าถึงได้ที่ http://localhost:3002
```

**Distributed-Tracing (Standalone):**
```bash
cd distributed-tracing
docker-compose up --build
# Auto services: 3010-3012
# Manual services: 3020-3022
```

---

### วิธีที่ 2: ใช้ Observability Stack รวม (สำหรับ Development)

ถ้าต้องการรันหลายตัวอย่างพร้อมกัน และใช้ stack เดียวกัน:

1. **เริ่ม Observability Stack** (Collector, Jaeger, Prometheus, Grafana, Loki):
```bash
# ใน example/
docker-compose up -d
```

2. **รัน App ด้วย npm**:
```bash
# Auto-Instrumentation
cd auto-instrumentation
npm install && npm start

# Manual-Instrumentation (Terminal ใหม่)
cd manual-instrumentation
npm install && npm start
```

**ข้อดี:**
- ✅ ใช้ Observability Stack เดียว (ประหยัด resources)
- ✅ เปลี่ยนโค้ดและ restart ง่าย
- ✅ เห็น console logs ชัดเจน
- ✅ เหมาะสำหรับ development

---

### วิธีที่ 3: รันทุกอย่างพร้อมกัน (Advanced)

```bash
# Terminal 1: Observability Stack
docker-compose up -d

# Terminal 2: Auto-Instrumentation
cd auto-instrumentation && npm start

# Terminal 3: Manual-Instrumentation  
cd manual-instrumentation && npm start

# Terminal 4: Distributed Tracing
cd distributed-tracing && docker-compose up --build
```

---

### 🛑 หยุดการทำงาน

```bash
# หยุด Observability Stack
docker-compose down

# หยุด specific example
cd auto-instrumentation
docker-compose down
```

---

## 🧪 ทดสอบ Endpoints
docker-compose up --build
```


## 🧪 ทดสอบ API

### Auto-Instrumentation Example (Port 3001)

```bash
# ทดสอบ endpoint หลัก
curl http://localhost:3001/

# ทดสอบ endpoint ที่มี custom span
curl http://localhost:3001/api/users/123

# ทดสอบ POST request
curl -X POST http://localhost:3001/api/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test data"}'
```

### Manual-Instrumentation Example (Port 3002)

```bash
# ทดสอบ endpoint หลัก
curl http://localhost:3002/

# ทดสอบ endpoint ที่มี nested spans
curl http://localhost:3002/api/users/456

# ทดสอบ POST request
curl -X POST http://localhost:3002/api/process \
  -H "Content-Type: application/json" \
  -d '{"data": "manual test"}'

# ทดสอบ complex operation with multiple steps
curl http://localhost:3002/api/complex
```

### Distributed-Tracing Example

**Auto-Instrumentation (Ports 3010-3012):**
```bash
# ทดสอบ distributed request (A → B → C)
curl http://localhost:3010/api/orders/12345

# ทดสอบ parallel calls
curl http://localhost:3010/api/dashboard
```

**Manual-Instrumentation (Ports 3020-3022):**
```bash
# ทดสอบ distributed request (A → B → C)
curl http://localhost:3020/api/orders/67890

# ทดสอบ parallel calls
curl http://localhost:3020/api/dashboard
```


## 🔍 เข้าถึง Observability Tools

เมื่อ stack ทำงานแล้ว คุณสามารถเข้าถึง UI ต่างๆ ได้ที่:

- **Jaeger UI** (Traces): http://localhost:16686
  - ดู distributed traces และ service dependencies
  - วิเคราะห์ latency และ performance
  
- **Prometheus** (Metrics): http://localhost:9090
  - Query metrics ด้วย PromQL
  - ดู request rate, error rate, duration
  
- **Grafana** (Visualization): http://localhost:3001
  - Username: `admin`
  - Password: `admin`
  - สร้าง dashboard สำหรับ metrics และ logs
  - Add Data Sources: Prometheus และ Loki
  
- **Loki** (Logs): http://localhost:3100
  - Query logs ด้วย LogQL
  - ดู structured logs พร้อม TraceID
  - Correlation กับ Traces

---

## 🗒️ Logs Support

ตัวอย่างทั้งหมดรองรับ **OpenTelemetry Logs** แล้ว!

### Logs Architecture

```
Application → OTLP Collector → Loki → Grafana
```

### Query Logs ใน Grafana

1. เปิด Grafana: http://localhost:3001
2. Add Data Source → Loki (URL: `http://loki:3100`)
3. Explore → Loki → Query:

```logql
# ดู logs ทั้งหมด
{service_name="auto-instrumentation-example"}

# ดู ERROR logs เท่านั้น
{service_name="auto-instrumentation-example"} |= "ERROR"

# ดู logs ของ specific trace
{service_name="auto-instrumentation-example"} | json | trace_id="abc123"

# ดู logs จากทุก service
{service_name=~"service-.*"}
```

### Logs + Traces Correlation

แต่ละ log record จะมี **TraceID** และ **SpanID** เชื่อมโยงกับ Traces:

```javascript
// Log ภายใน span
const span = tracer.startSpan('operation');
context.with(trace.setSpan(context.active(), span), () => {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: 'Processing started',
  });
  // Log นี้จะมี TraceID เดียวกับ span
});
```

➡️ ดูเอกสารเพิ่มเติม: [Logs Documentation](./logs/README.md)

## 📁 โครงสร้างไฟล์

```
example/
├── docker-compose.yml              # Observability stack เท่านั้น (optional)
├── otel-collector-config.yaml      # Reference config
├── prometheus.yml                  # Reference config
├── README.md                       # เอกสารนี้
│
├── auto-instrumentation/           # 🤖 Auto-Instrumentation Example (STANDALONE)
│   ├── app.js                      # Express app with auto-instrumentation + logs
│   ├── tracing.js                  # SDK config with auto-instrumentations + LoggerProvider
│   ├── package.json                # Dependencies
│   ├── Dockerfile                  # Container image
│   ├── docker-compose.yml          # ✅ Full stack (App + Observability)
│   ├── otel-collector-config.yaml  # ✅ OTLP Collector config
│   ├── prometheus.yml              # ✅ Prometheus config
│   └── README.md                   # เอกสารโดยละเอียด
│
├── manual-instrumentation/         # ✍️ Manual-Instrumentation Example (STANDALONE)
│   ├── app.js                      # Express app with manual spans + logs
│   ├── tracing.js                  # SDK config without auto-instrumentations + LoggerProvider
│   ├── package.json                # Dependencies
│   ├── Dockerfile                  # Container image
│   ├── docker-compose.yml          # ✅ Full stack (App + Observability)
│   ├── otel-collector-config.yaml  # ✅ OTLP Collector config
│   ├── prometheus.yml              # ✅ Prometheus config
│   └── README.md                   # เอกสารโดยละเอียด
│
├── logs/                           # 🗒️ Logs Documentation
│   └── README.md                   # คู่มือการใช้งาน OpenTelemetry Logs
│
└── distributed-tracing/            # 🌐 Distributed-Tracing Example (STANDALONE)
    ├── auto-instrumentation/       # Auto context propagation
    │   ├── service-a/              # Frontend API (Port 3010)
    │   ├── service-b/              # Backend API (Port 3011)
    │   └── service-c/              # Database Service (Port 3012)
    ├── manual-instrumentation/     # Manual context propagation
    │   ├── service-a/              # Frontend API (Port 3020)
    │   ├── service-b/              # Backend API (Port 3021)
    │   └── service-c/              # Database Service (Port 3022)
    ├── docker-compose.yml          # ✅ Full stack with all services
    ├── LOGS.md                     # วิธีเพิ่ม logs ใน distributed services
    └── README.md                   # เอกสารโดยละเอียด
```

**หมายเหตุ:** แต่ละตัวอย่างมี config files และ observability stack ของตัวเองแล้ว สามารถรันได้เป็น standalone!

## 🎯 เปรียบเทียบทั้งสามแบบ

| คุณสมบัติ | Auto-Instrumentation | Manual-Instrumentation | Distributed-Tracing |
|----------|---------------------|----------------------|---------------------|
| **Complexity** | ✅ ต่ำ | ❌ สูง | ⚠️ กลาง-สูง |
| **Setup Time** | ⚡ รวดเร็วมาก | 🐢 ใช้เวลามากกว่า | 🏗️ ต้อง setup หลาย services |
| **Code Amount** | ✅ น้อยมาก | ❌ เยอะกว่า | 📦 หลาย services |
| **Use Case** | Single app | Single app | Microservices |
| **Context Propagation** | ✅ อัตโนมัติ | ✍️ Manual | 🔗 ข้าม services |
| **Signals Supported** | 📝📈🗒️ Traces + Metrics + Logs | 📝📈🗒️ Traces + Metrics + Logs | 📝📈🗒️ Traces + Metrics + Logs |
| **Learning Value** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🎓 เมื่อไหร่ควรใช้แบบไหน?

### ใช้ Auto-Instrumentation เมื่อ:
- 🚀 ต้องการเริ่มต้นอย่างรวดเร็ว
- 🏢 Production application ที่ใช้ standard frameworks
- 📊 ต้องการ coverage ที่กว้าง
- ⏰ มีเวลาจำกัดในการ implement

### ใช้ Manual-Instrumentation เมื่อ:
- 🎯 ต้องการ trace custom business logic
- 🔧 ใช้กับ legacy systems หรือ custom frameworks
- ⚡ Performance optimization เป็นสิ่งสำคัญ
- 📚 ต้องการเรียนรู้ OpenTelemetry อย่างลึกซึ้ง

### ใช้ Distributed-Tracing เมื่อ:
- 🌐 มี microservices architecture
- 🔗 ต้องการ trace requests ข้าม services
- 📊 วิเคราะห์ service-to-service communication
- 🐛 Debug issues ในระบบ distributed

### หรือใช้ทั้งหมด!
- Auto สำหรับ HTTP/Express (พื้นฐาน)
- Manual สำหรับ business-critical operations
- Distributed สำหรับ microservices communication

## 💡 คุณสมบัติที่แสดงในตัวอย่าง

### Auto-Instrumentation Example:
- ✅ **Auto-Tracing**: HTTP requests และ Express routes ถูก trace อัตโนมัติ
- ✅ **Custom Spans**: เพิ่ม custom spans เพื่อ trace business logic เฉพาะ
- ✅ **Attributes & Events**: เพิ่มข้อมูลเพิ่มเติมให้กับ spans
- ✅ **Error Tracking**: จับและบันทึก exceptions อัตโนมัติ
- ✅ **Logs Support**: ใช้ OpenTelemetry Logger พร้อม TraceID

### Manual-Instrumentation Example:
- ✅ **Full Control**: สร้างและควบคุม spans ทุกอันด้วยตัวเอง
- ✅ **Context Propagation**: จัดการ parent-child span relationships
- ✅ **Nested Spans**: สร้าง complex tracing hierarchies
- ✅ **Custom Middleware**: สร้าง HTTP tracing middleware เอง
- ✅ **Span Kinds**: ใช้ SERVER, CLIENT, INTERNAL span kinds
- ✅ **Logs Support**: ใช้ OpenTelemetry Logger พร้อม TraceID

### ทั้งสองแบบ:
- ✅ **OTLP Export**: ส่งข้อมูลไปยัง OpenTelemetry Collector
- ✅ **Metrics Export**: ส่งข้อมูล metrics พร้อม traces
- ✅ **Logs Export**: ส่ง structured logs ไปยัง Loki
- ✅ **Resource Attributes**: กำหนด service name และ version
- ✅ **Complete Observability**: Traces + Metrics + Logs

### Distributed-Tracing Example:
- ✅ **Context Propagation**: ส่ง trace context ข้าม services
- ✅ **W3C Trace Context**: ใช้ standard W3C headers
- ✅ **Service-to-Service Tracing**: ติดตาม requests ข้ามหลาย services
- ✅ **Microservices Pattern**: แสดงสถาปัตยกรรม A → B → C
- ✅ **Auto vs Manual**: เปรียบเทียบทั้งสองวิธี
- ✅ **Logs Across Services**: บันทึก logs พร้อม TraceID ทุก service


## 🛠️ การปรับแต่ง

### เปลี่ยน Service Name

**Auto-Instrumentation** - แก้ไขใน `auto-instrumentation/tracing.js`:

```javascript
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'your-auto-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  })
);
```

**Manual-Instrumentation** - แก้ไขใน `manual-instrumentation/tracing.js`:

```javascript
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'your-manual-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  })
);
```

### เปลี่ยน Collector Endpoint

แก้ไขใน `tracing.js` ของแต่ละ example:

```javascript
const traceExporter = new OTLPTraceExporter({
  url: 'http://your-collector:4318/v1/traces',
});
```

### เปลี่ยน Port

**Auto-Instrumentation** - แก้ไขใน `auto-instrumentation/app.js`:
```javascript
const PORT = 3001; // เปลี่ยนเป็น port ที่ต้องการ
```

**Manual-Instrumentation** - แก้ไขใน `manual-instrumentation/app.js`:
```javascript
const PORT = 3002; // เปลี่ยนเป็น port ที่ต้องการ
```


## 🧹 ทำความสะอาด

หยุด Docker containers:

```bash
docker-compose down
```

ลบ volumes (ถ้าต้องการ):

```bash
docker-compose down -v
```

## 📚 แหล่งข้อมูลเพิ่มเติม

### เอกสารโดยละเอียด
- [Auto-Instrumentation Example - README](./auto-instrumentation/README.md)
- [Manual-Instrumentation Example - README](./manual-instrumentation/README.md)
- [Distributed-Tracing Example - README](./distributed-tracing/README.md)

### OpenTelemetry Documentation
- [OpenTelemetry JavaScript Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [Auto-Instrumentation](https://opentelemetry.io/docs/instrumentation/js/automatic/)
- [Manual Instrumentation](https://opentelemetry.io/docs/instrumentation/js/instrumentation/)
- [Distributed Tracing](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Context Propagation](https://opentelemetry.io/docs/instrumentation/js/propagation/)
- [Express Instrumentation](https://opentelemetry.io/docs/instrumentation/js/libraries/)
- [OTLP Exporter](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)

### Observability Tools
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

