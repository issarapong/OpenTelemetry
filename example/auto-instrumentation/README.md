# OpenTelemetry Auto-Instrumentation Example

ตัวอย่างการใช้งาน **Auto-Instrumentation** ของ OpenTelemetry กับ Node.js Express

## 🎯 จุดเด่นของ Auto-Instrumentation

- ✅ **Automatic Tracing**: Express routes, HTTP requests ถูก trace อัตโนมัติโดยไม่ต้องเขียนโค้ดเพิ่มเติม
- ✅ **Low Code**: ใช้โค้ดน้อยที่สุดในการเริ่มต้น observability
- ✅ **Quick Setup**: เริ่มใช้งานได้รวดเร็ว เหมาะสำหรับ prototype และ production
- ✅ **Comprehensive Coverage**: รองรับ libraries ยอดนิยมมากมาย (Express, HTTP, MySQL, PostgreSQL, Redis, etc.)

## 📦 การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# กลับไปที่ example หลัก และเริ่ม Docker stack (ถ้ายังไม่ได้เริ่ม)
cd ..
docker-compose up -d
```

## 🚀 เริ่มต้นใช้งาน

```bash
npm start
```

หรือใช้ development mode:

```bash
npm run dev
```

Application จะทำงานที่ `http://localhost:3001`

## 🧪 ทดสอบ

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

## 🔍 สิ่งที่จะเห็นใน Jaeger

เมื่อเรียก API แต่ละครั้ง คุณจะเห็น traces ที่ถูกสร้างอัตโนมัติ:

1. **HTTP Request Span**: สร้างโดย HTTP instrumentation
2. **Express Middleware Spans**: สร้างโดย Express instrumentation
3. **Custom Spans**: สร้างโดยโค้ดของเรา (เช่น `getUserById`, `processData`)

เปิดดูได้ที่: http://localhost:16686

## 📁 โครงสร้างไฟล์

```
auto-instrumentation/
├── app.js           # Express application
├── tracing.js       # OpenTelemetry SDK configuration with auto-instrumentations
├── package.json     # Dependencies
└── README.md        # เอกสารนี้
```

## 🛠️ การทำงานของ Auto-Instrumentation

### ใน `tracing.js`

```javascript
const sdk = new NodeSDK({
  // ...
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instrument ทุกอย่างตาม default
      // หรือสามารถ configure แต่ละ instrumentation ได้
    }),
  ],
});
```

### Libraries ที่ได้รับการ Auto-Instrument

- **HTTP/HTTPS**: Incoming และ outgoing HTTP requests
- **Express**: Routes, middlewares, error handlers
- **DNS**: DNS lookups
- **Net**: TCP connections
- และอื่นๆ อีกมากมาย

## 🔄 เปรียบเทียบกับ Manual Instrumentation

| คุณสมบัติ | Auto-Instrumentation | Manual Instrumentation |
|----------|---------------------|----------------------|
| Setup Speed | ⚡ รวดเร็ว | 🐢 ใช้เวลามากกว่า |
| Code Changes | ✅ น้อยมาก | ❌ ต้องเขียนเยอะ |
| Coverage | ✅ ครอบคลุมทั้ง framework | ⚠️ ต้องเขียนเอง |
| Customization | ⚠️ จำกัด | ✅ ควบคุมได้เต็มที่ |
| Performance | ✅ Optimized | ⚠️ ขึ้นกับการเขียน |

## 💡 Use Cases

Auto-Instrumentation เหมาะสำหรับ:

- 🚀 **Quick Start**: ต้องการเริ่ม observability อย่างรวดเร็ว
- 🏢 **Production Applications**: ต้องการความครอบคลุมที่ดีโดยใช้โค้ดน้อย
- 🎯 **Standard Frameworks**: ใช้ frameworks และ libraries ยอดนิยม
- ⏰ **Time Constraints**: มีเวลาจำกัดในการ implement

## 📚 เรียนรู้เพิ่มเติม

- [OpenTelemetry Auto-Instrumentation Documentation](https://opentelemetry.io/docs/instrumentation/js/automatic/)
- [Supported Libraries](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node)
