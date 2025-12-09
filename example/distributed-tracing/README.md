# OpenTelemetry Distributed Tracing Examples

ตัวอย่างการใช้งาน **Distributed Tracing** ด้วย OpenTelemetry ในสถาปัตยกรรม Microservices

## 🎯 เป้าหมาย

แสดงการ trace requests ข้ามหลาย services (Service A → Service B → Service C) โดยใช้:
- **Auto-Instrumentation**: Context propagation อัตโนมัติผ่าน HTTP headers
- **Manual-Instrumentation**: Manual inject/extract context เพื่อควบคุมเต็มที่

## 🏗️ สถาปัตยกรรม

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Service A  │─────▶│  Service B  │─────▶│  Service C  │
│ Frontend API│      │ Backend API │      │  Database   │
└─────────────┘      └─────────────┘      └─────────────┘
     │                     │                     │
     └─────────────────────┴─────────────────────┘
                          │
                   ┌──────▼──────┐
                   │   Collector │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │   Jaeger    │
                   └─────────────┘
```

### Service Responsibilities

**Service A - Frontend API**
- รับ requests จาก clients
- เรียก Service B เพื่อตรวจสอบ inventory
- รวมข้อมูลจากหลาย sources

**Service B - Backend API**
- จัดการ business logic
- เรียก Service C เพื่อดึงข้อมูล
- ประมวลผลและส่งกลับ

**Service C - Database Service**
- จำลอง database queries
- ส่งข้อมูลกลับไปยัง Service B

## 📂 โครงสร้างโปรเจกต์

```
distributed-tracing/
├── auto-instrumentation/           # Auto-Instrumentation Example
│   ├── service-a/                  # Port 3010
│   │   ├── app.js
│   │   ├── tracing.js             # มี getNodeAutoInstrumentations()
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── service-b/                  # Port 3011
│   │   ├── app.js
│   │   ├── tracing.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── service-c/                  # Port 3012
│       ├── app.js
│       ├── tracing.js
│       ├── package.json
│       └── Dockerfile
│
├── manual-instrumentation/         # Manual-Instrumentation Example
│   ├── service-a/                  # Port 3020
│   │   ├── app.js
│   │   ├── tracing.js             # ไม่มี auto-instrumentations
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── service-b/                  # Port 3021
│   │   ├── app.js
│   │   ├── tracing.js
│   │   ├── package.json
│   │   └── Dockerfile
│   └── service-c/                  # Port 3022
│       ├── app.js
│       ├── tracing.js
│       ├── package.json
│       └── Dockerfile
│
├── docker-compose.yml              # Run all services with Docker
└── README.md                       # เอกสารนี้
```

## 📋 ข้อกำหนดเบื้องต้น

- Node.js 18+
- Docker และ Docker Compose
- OpenTelemetry Collector (จาก example หลัก)

## 🚀 วิธีการใช้งาน

### Option 1: รัน Local (แนะนำสำหรับ Development)

#### 1. เริ่ม OpenTelemetry Stack (ถ้ายังไม่ได้เริ่ม)

```bash
cd /Volumes/Server/git-remote/github-issarapong/OpenTelemetry/example
docker-compose up -d
```

#### 2. รัน Auto-Instrumentation Services

```bash
# Terminal 1 - Service A
cd auto-instrumentation/service-a
npm install
npm start

# Terminal 2 - Service B
cd auto-instrumentation/service-b
npm install
npm start

# Terminal 3 - Service C
cd auto-instrumentation/service-c
npm install
npm start
```

#### 3. รัน Manual-Instrumentation Services

```bash
# Terminal 4 - Service A
cd manual-instrumentation/service-a
npm install
npm start

# Terminal 5 - Service B
cd manual-instrumentation/service-b
npm install
npm start

# Terminal 6 - Service C
cd manual-instrumentation/service-c
npm install
npm start
```

### Option 2: รันด้วย Docker Compose

```bash
# สร้าง network ถ้ายังไม่มี
docker network create example_otel-network

# Build และรัน services ทั้งหมด
docker-compose up --build

# หรือรันเฉพาะ auto-instrumentation
docker-compose up service-a-auto service-b-auto service-c-auto

# หรือรันเฉพาะ manual-instrumentation
docker-compose up service-a-manual service-b-manual service-c-manual
```

## 🧪 ทดสอบ

### Auto-Instrumentation (Ports 3010-3012)

```bash
# ทดสอบ order request (Service A → B → C)
curl http://localhost:3010/api/orders/12345

# ทดสอบ dashboard (Service A → B parallel calls)
curl http://localhost:3010/api/dashboard

# Health check
curl http://localhost:3010/health
curl http://localhost:3011/health
curl http://localhost:3012/health
```

### Manual-Instrumentation (Ports 3020-3022)

```bash
# ทดสอบ order request (Service A → B → C)
curl http://localhost:3020/api/orders/67890

# ทดสอบ dashboard (Service A → B parallel calls)
curl http://localhost:3020/api/dashboard

# Health check
curl http://localhost:3020/health
curl http://localhost:3021/health
curl http://localhost:3022/health
```

## 🔍 ดู Traces ใน Jaeger

1. เปิด Jaeger UI: http://localhost:16686
2. เลือก Service:
   - **Auto**: `service-a-auto`, `service-b-auto`, `service-c-auto`
   - **Manual**: `service-a-manual`, `service-b-manual`, `service-c-manual`
3. คลิก **Find Traces**
4. เลือก trace เพื่อดูรายละเอียด

### สิ่งที่จะเห็นใน Trace

```
Service A: handleOrderRequest
├─ HTTP GET http://service-b/...
   │
   Service B: checkInventory
   ├─ HTTP GET http://service-c/...
      │
      Service C: queryStock
      └─ database_query
```

**TraceID เดียวกัน** ข้ามทั้ง 3 services แสดงว่า context propagation ทำงานถูกต้อง!

## 🔄 Context Propagation

### Auto-Instrumentation

```javascript
// ไม่ต้องทำอะไร! HTTP instrumentation จะ inject/extract อัตโนมัติ
const response = await axios.get(`${SERVICE_B_URL}/api/inventory/${id}`);
```

**W3C Trace Context Headers** ถูกส่งอัตโนมัติ:
- `traceparent`: `00-<traceId>-<spanId>-01`
- `tracestate`: Optional additional vendor-specific data

### Manual-Instrumentation

```javascript
// ต้อง inject context manually
const headers = {};
propagation.inject(context.active(), headers);

const response = await axios({
  url: `${SERVICE_B_URL}/api/inventory/${id}`,
  headers: headers, // ส่ง traceparent header
});

// และ extract context เมื่อรับ request
const extractedContext = propagation.extract(context.active(), req.headers);
const span = tracer.startSpan('operation', {}, extractedContext);
```

## 📊 เปรียบเทียบ Auto vs Manual

| คุณสมบัติ | Auto-Instrumentation | Manual-Instrumentation |
|----------|---------------------|----------------------|
| **Code Complexity** | ✅ ต่ำ | ❌ สูง |
| **Setup Time** | ⚡ รวดเร็ว | 🐢 ใช้เวลา |
| **Propagation** | ✅ อัตโนมัติ | ✍️ ต้องเขียนเอง |
| **Control** | ⚠️ จำกัด | ✅ เต็มที่ |
| **HTTP Support** | ✅ Built-in | ✍️ Manual inject/extract |
| **Custom Protocols** | ❌ จำกัด | ✅ รองรับทุกแบบ |
| **Learning Curve** | ✅ ง่าย | ⚠️ ยาก |

## 💡 Use Cases

### ใช้ Auto-Instrumentation เมื่อ:
- 🚀 Microservices ทั้งหมดใช้ HTTP/REST
- ⏰ ต้องการ setup รวดเร็ว
- 📦 ใช้ standard frameworks (Express, Fastify, etc.)
- 👥 ทีมมีความรู้ OpenTelemetry จำกัด

### ใช้ Manual-Instrumentation เมื่อ:
- 🔧 ใช้ custom protocols (gRPC, WebSocket, Message Queues)
- 🎯 ต้องการควบคุม spans และ attributes อย่างละเอียด
- 📊 ต้องการ custom context propagation
- 🏢 มีข้อกำหนดเฉพาะ compliance หรือ security

### ใช้ Hybrid (ทั้งสอง):
- 🌟 Auto สำหรับ HTTP/Express (พื้นฐาน)
- ✍️ Manual สำหรับ business-critical operations
- 🎯 ได้ทั้งความรวดเร็วและความยืดหยุ่น

## 🛠️ การปรับแต่ง

### เปลี่ยน Service URLs

แก้ไขใน `docker-compose.yml`:

```yaml
environment:
  - SERVICE_B_URL=http://your-service-b:port
  - SERVICE_C_URL=http://your-service-c:port
```

### เปลี่ยน Collector Endpoint

แก้ไขใน `tracing.js` ของแต่ละ service:

```javascript
const traceExporter = new OTLPTraceExporter({
  url: 'http://your-collector:4318/v1/traces',
});
```

### เพิ่ม Custom Attributes

```javascript
span.setAttribute('custom.attribute', 'value');
span.setAttribute('user.id', userId);
span.setAttribute('order.total', totalAmount);
```

## 🧹 ทำความสะอาด

```bash
# หยุด local services
# กด Ctrl+C ในแต่ละ terminal

# หยุด Docker services
docker-compose down

# ลบ images (optional)
docker-compose down --rmi all
```

## 📚 เรียนรู้เพิ่มเติม

### W3C Trace Context
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Context Propagation](https://opentelemetry.io/docs/instrumentation/js/propagation/)

### OpenTelemetry Documentation
- [Distributed Tracing](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Context API](https://opentelemetry.io/docs/instrumentation/js/context/)
- [Propagation API](https://opentelemetry.io/docs/reference/specification/context/api-propagators/)

## 🎓 Key Concepts

### TraceID และ SpanID
- **TraceID**: รหัสเดียวกันสำหรับทั้ง request chain
- **SpanID**: รหัสเฉพาะสำหรับแต่ละ operation
- **Parent SpanID**: เชื่อมโยง child spans กับ parent

### W3C Trace Context Header

```
traceparent: 00-{traceId}-{spanId}-{flags}
             ││  │         │        └─ Flags (01 = sampled)
             ││  │         └────────── Parent Span ID (16 hex chars)
             ││  └──────────────────── Trace ID (32 hex chars)
             │└─────────────────────── Version
             └──────────────────────── Fixed prefix
```

### Context Propagation Flow

```
[Service A]                [Service B]                [Service C]
    │                          │                          │
    ├─ Create Span             │                          │
    ├─ Inject traceparent ────▶│                          │
    │                          ├─ Extract traceparent     │
    │                          ├─ Create Child Span       │
    │                          ├─ Inject traceparent ────▶│
    │                          │                          ├─ Extract traceparent
    │                          │                          ├─ Create Child Span
    │                          │                          ├─ Process
    │                          │                          └─ End Span
    │                          ├─ Receive Response        │
    │                          └─ End Span                │
    ├─ Receive Response        │                          │
    └─ End Span                │                          │
```

## 🎯 ตัวอย่าง Trace Output

### Console Log
```
[Service A Auto] GET /api/orders/12345 - TraceID: 1234567890abcdef1234567890abcdef
[Service B Auto] GET /api/inventory/12345 - TraceID: 1234567890abcdef1234567890abcdef
[Service C Auto] GET /api/stock/12345 - TraceID: 1234567890abcdef1234567890abcdef
```

สังเกตว่า **TraceID เดียวกัน** ใน 3 services!

### Jaeger UI
- Service A span: 200ms
  - HTTP GET call: 150ms
    - Service B span: 140ms
      - HTTP GET call: 90ms
        - Service C span: 80ms

Total time = 200ms แต่แสดง breakdown ของแต่ละ service ชัดเจน!

## 🚨 Common Issues

### Issue: Services ไม่สามารถเชื่อมต่อกัน
**Solution**: ตรวจสอบ network และ service URLs

```bash
# ตรวจสอบว่า services ทำงาน
curl http://localhost:3011/health
curl http://localhost:3012/health
```

### Issue: ไม่เห็น traces ใน Jaeger
**Solution**: ตรวจสอบ collector connection

```bash
# ตรวจสอบ collector
curl http://localhost:4318/v1/traces

# ตรวจสอบ logs
docker logs otel-collector
```

### Issue: TraceID ไม่เหมือนกันข้าม services
**Solution**: Context propagation ไม่ทำงาน

- **Auto**: ตรวจสอบว่า HTTP instrumentation enable แล้ว
- **Manual**: ตรวจสอบ inject/extract code

## 🎉 สรุป

Distributed Tracing ช่วยให้คุณ:
- 🔍 เห็น request flow ข้ามทั้ง microservices
- ⏱️ วัด performance ของแต่ละ service
- 🐛 Debug issues ที่เกิดจาก service interactions
- 📊 วิเคราะห์ bottlenecks ในระบบ

**Auto-Instrumentation** = รวดเร็ว, ง่าย, เหมาะกับ HTTP/REST
**Manual-Instrumentation** = ยืดหยุ่น, ควบคุมได้, เหมาะกับ custom protocols

เลือกใช้ตามความเหมาะสมกับโปรเจกต์ของคุณ! 🚀
