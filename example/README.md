# OpenTelemetry Express Examples

ตัวอย่างการใช้งาน OpenTelemetry กับ Node.js Express Application แบบต่างๆ

## 📚 ตัวอย่างที่มีให้

### 🤖 [Auto-Instrumentation Example](./auto-instrumentation/)
- ติดตาม Express และ HTTP requests อัตโนมัติ
- Setup รวดเร็ว ใช้โค้ดน้อย
- เหมาะสำหรับ quick start และ production
- Port: `3001`

### ✍️ [Manual-Instrumentation Example](./manual-instrumentation/)
- ควบคุมการสร้าง span ได้อย่างละเอียด
- เหมาะสำหรับ custom business logic
- เรียนรู้การทำงานของ OpenTelemetry อย่างลึกซึ้ง
- Port: `3002`

### 🌐 [Distributed-Tracing Example](./distributed-tracing/)
- Trace requests ข้ามหลาย microservices (A → B → C)
- แสดงทั้ง Auto และ Manual context propagation
- เหมาะสำหรับเรียนรู้ microservices tracing
- Ports: `3010-3012` (Auto), `3020-3022` (Manual)

## 📋 ข้อกำหนดเบื้องต้น

- Node.js 16+ 
- Docker และ Docker Compose
- npm หรือ yarn

## 🚀 Quick Start

### 1. เริ่มต้น OpenTelemetry Stack (Collector, Jaeger, Prometheus, Grafana)

```bash
docker-compose up -d
```

### 2. เลือกตัวอย่างที่ต้องการรัน

**Auto-Instrumentation:**
```bash
cd auto-instrumentation
npm install
npm start
```

**Manual-Instrumentation:**
```bash
cd manual-instrumentation
npm install
npm start
```

**หรือรันทั้งสองพร้อมกัน** (แนะนำ):
```bash
# Terminal 1
cd auto-instrumentation && npm install && npm start

# Terminal 2
cd manual-instrumentation && npm install && npm start
```

**Distributed-Tracing (Microservices):**
```bash
cd distributed-tracing

# ดู README สำหรับคำแนะนำโดยละเอียด
cat README.md

# รัน local (6 terminals สำหรับ 6 services)
# หรือใช้ Docker Compose
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
- **Prometheus** (Metrics): http://localhost:9090
- **Grafana** (Visualization): http://localhost:3001
  - Username: `admin`
  - Password: `admin`

## 📁 โครงสร้างไฟล์

```
example/
├── docker-compose.yml              # Full observability stack
├── otel-collector-config.yaml      # Collector configuration
├── prometheus.yml                  # Prometheus configuration
├── README.md                       # เอกสารนี้
│
├── auto-instrumentation/           # Auto-Instrumentation Example
│   ├── app.js                      # Express app with auto-instrumentation
│   ├── tracing.js                  # SDK config with getNodeAutoInstrumentations()
│   ├── package.json                # Dependencies
│   └── README.md                   # เอกสารโดยละเอียด
│
├── manual-instrumentation/         # Manual-Instrumentation Example
│   ├── app.js                      # Express app with manual spans
│   ├── tracing.js                  # SDK config without auto-instrumentations
│   ├── package.json                # Dependencies
│   └── README.md                   # เอกสารโดยละเอียด
│
└── distributed-tracing/            # Distributed-Tracing Example
    ├── auto-instrumentation/       # Auto context propagation
    │   ├── service-a/              # Frontend API (Port 3010)
    │   ├── service-b/              # Backend API (Port 3011)
    │   └── service-c/              # Database Service (Port 3012)
    ├── manual-instrumentation/     # Manual context propagation
    │   ├── service-a/              # Frontend API (Port 3020)
    │   ├── service-b/              # Backend API (Port 3021)
    │   └── service-c/              # Database Service (Port 3022)
    ├── docker-compose.yml          # Run all microservices
    └── README.md                   # เอกสารโดยละเอียด
```

## 🎯 เปรียบเทียบทั้งสามแบบ

| คุณสมบัติ | Auto-Instrumentation | Manual-Instrumentation | Distributed-Tracing |
|----------|---------------------|----------------------|---------------------|
| **Complexity** | ✅ ต่ำ | ❌ สูง | ⚠️ กลาง-สูง |
| **Setup Time** | ⚡ รวดเร็วมาก | 🐢 ใช้เวลามากกว่า | 🏗️ ต้อง setup หลาย services |
| **Code Amount** | ✅ น้อยมาก | ❌ เยอะกว่า | 📦 หลาย services |
| **Use Case** | Single app | Single app | Microservices |
| **Context Propagation** | ✅ อัตโนมัติ | ✍️ Manual | 🔗 ข้าม services |
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

## 💡 คุณสมบัติที่แสดงในตัวอย่าง

### Auto-Instrumentation Example:
- ✅ **Auto-Tracing**: HTTP requests และ Express routes ถูก trace อัตโนมัติ
- ✅ **Custom Spans**: เพิ่ม custom spans เพื่อ trace business logic เฉพาะ
- ✅ **Attributes & Events**: เพิ่มข้อมูลเพิ่มเติมให้กับ spans
- ✅ **Error Tracking**: จับและบันทึก exceptions อัตโนมัติ

### Manual-Instrumentation Example:
- ✅ **Full Control**: สร้างและควบคุม spans ทุกอันด้วยตัวเอง
- ✅ **Context Propagation**: จัดการ parent-child span relationships
- ✅ **Nested Spans**: สร้าง complex tracing hierarchies
- ✅ **Custom Middleware**: สร้าง HTTP tracing middleware เอง
- ✅ **Span Kinds**: ใช้ SERVER, CLIENT, INTERNAL span kinds

### ทั้งสองแบบ:
- ✅ **OTLP Export**: ส่งข้อมูลไปยัง OpenTelemetry Collector
- ✅ **Metrics Export**: ส่งข้อมูล metrics พร้อม traces
- ✅ **Resource Attributes**: กำหนด service name และ version

### Distributed-Tracing Example:
- ✅ **Context Propagation**: ส่ง trace context ข้าม services
- ✅ **W3C Trace Context**: ใช้ standard W3C headers
- ✅ **Service-to-Service Tracing**: ติดตาม requests ข้ามหลาย services
- ✅ **Microservices Pattern**: แสดงสถาปัตยกรรม A → B → C
- ✅ **Auto vs Manual**: เปรียบเทียบทั้งสองวิธี


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

