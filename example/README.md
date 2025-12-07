# OpenTelemetry Express Example

ตัวอย่างการใช้งาน OpenTelemetry กับ Node.js Express Application

## 📋 ข้อกำหนดเบื้องต้น

- Node.js 16+ 
- Docker และ Docker Compose
- npm หรือ yarn

## 🚀 วิธีการติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. เริ่มต้น OpenTelemetry Stack (Collector, Jaeger, Prometheus, Grafana)

```bash
docker-compose up -d
```

### 3. เริ่มต้น Express Application

```bash
npm start
```

หรือใช้ development mode:

```bash
npm run dev
```

## 🧪 ทดสอบ API

### ทดสอบ endpoint หลัก
```bash
curl http://localhost:3000/
```

### ทดสอบ endpoint ที่มี custom span
```bash
curl http://localhost:3000/api/users/123
```

### ทดสอบ POST request
```bash
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test data"}'
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
├── app.js                      # Express application พร้อม instrumentation
├── tracing.js                  # OpenTelemetry SDK configuration
├── package.json                # Dependencies
├── docker-compose.yml          # Full observability stack
├── otel-collector-config.yaml  # Collector configuration
├── prometheus.yml              # Prometheus configuration
└── README.md                   # เอกสารนี้
```

## 🎯 คุณสมบัติที่มีในตัวอย่าง

- ✅ **Auto-instrumentation**: ติดตามการทำงานของ Express และ HTTP requests อัตโนมัติ
- ✅ **Custom Spans**: สร้าง span เพิ่มเติมสำหรับการทำงานเฉพาะ
- ✅ **Attributes**: เพิ่มข้อมูลเพิ่มเติมให้กับ span
- ✅ **Events**: บันทึกเหตุการณ์สำคัญใน span
- ✅ **Error Tracking**: จับและบันทึก exceptions
- ✅ **Metrics Export**: ส่งข้อมูล metrics ไปยัง collector

## 🛠️ การปรับแต่ง

### เปลี่ยน Service Name

แก้ไขใน `tracing.js`:

```javascript
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'your-service-name',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  })
);
```

### เปลี่ยน Collector Endpoint

แก้ไขใน `tracing.js`:

```javascript
const traceExporter = new OTLPTraceExporter({
  url: 'http://your-collector:4318/v1/traces',
});
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

- [OpenTelemetry JavaScript Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [Express Instrumentation](https://opentelemetry.io/docs/instrumentation/js/libraries/)
- [OTLP Exporter](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)
