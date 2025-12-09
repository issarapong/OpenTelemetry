# OpenTelemetry Manual-Instrumentation Example

ตัวอย่างการใช้งาน **Manual-Instrumentation** ของ OpenTelemetry กับ Node.js Express

## 🎯 จุดเด่นของ Manual-Instrumentation

- ✅ **Full Control**: ควบคุมการสร้าง span ได้อย่างละเอียด
- ✅ **Fine-grained Tracing**: กำหนดได้ว่าจะ trace อะไร ที่ไหน และอย่างไร
- ✅ **Custom Attributes**: เพิ่ม attributes และ events ได้อย่างอิสระ
- ✅ **Performance Optimization**: เลือก trace เฉพาะส่วนที่สำคัญ ลด overhead
- ✅ **Learning**: เข้าใจการทำงานของ OpenTelemetry อย่างลึกซึ้ง

## 📦 การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install
```

## 🚀 เริ่มต้นใช้งาน

### วิธีที่ 1: รัน App แบบ standalone (แนะนำสำหรับ development)

```bash
# 1. เริ่ม Observability Stack ก่อน (ใน example/)
cd ..
docker-compose up -d

# 2. กลับมาที่ manual-instrumentation และรัน app
cd manual-instrumentation
npm start
```

### วิธีที่ 2: รันทั้งหมดด้วย Docker Compose

```bash
# รันครบทั้ง app + observability stack
docker-compose up --build
```

หรือใช้ development mode:

```bash
npm run dev
```

```bash
npm run dev
```

Application จะทำงานที่ `http://localhost:3002`

## 🧪 ทดสอบ

```bash
# ทดสอบ endpoint หลัก
curl http://localhost:3002/

# ทดสอบ endpoint ที่มี nested spans
curl http://localhost:3002/api/users/123

# ทดสอบ POST request
curl -X POST http://localhost:3002/api/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test data"}'

# ทดสอบ complex operation with multiple steps
curl http://localhost:3002/api/complex
```

## 🔍 สิ่งที่จะเห็นใน Jaeger

เมื่อเรียก API แต่ละครั้ง คุณจะเห็น traces ที่ถูกควบคุมอย่างละเอียด:

1. **Root HTTP Span**: สร้างด้วย middleware ที่เขียนเอง
2. **Operation Spans**: แต่ละ operation มี span เป็นของตัวเอง
3. **Nested Spans**: แสดง parent-child relationships อย่างชัดเจน
4. **Custom Attributes & Events**: เพิ่มข้อมูลที่เป็นประโยชน์

เปิดดูได้ที่: http://localhost:16686

## 📁 โครงสร้างไฟล์

```
manual-instrumentation/
├── app.js           # Express application with manual tracing
├── tracing.js       # OpenTelemetry SDK configuration (NO auto-instrumentations)
├── package.json     # Dependencies
└── README.md        # เอกสารนี้
```

## 🛠️ การทำงานของ Manual-Instrumentation

### 1. สร้าง Tracer

```javascript
const tracer = trace.getTracer('manual-instrumentation-example');
```

### 2. สร้าง Span

```javascript
const span = tracer.startSpan('operationName', {
  kind: SpanKind.SERVER, // หรือ CLIENT, INTERNAL, etc.
  attributes: {
    'custom.attribute': 'value',
  },
});
```

### 3. ใช้ Context API

```javascript
context.with(trace.setSpan(context.active(), span), () => {
  // ทำงานภายใน context ของ span นี้
  // child spans จะถูกสร้างภายใต้ span นี้อัตโนมัติ
});
```

### 4. เพิ่ม Attributes และ Events

```javascript
span.setAttribute('key', 'value');
span.addEvent('event_name', {
  'event.attribute': 'value',
});
```

### 5. จัดการ Error

```javascript
try {
  // ...
} catch (error) {
  span.recordException(error);
  span.setStatus({ 
    code: SpanStatusCode.ERROR, 
    message: error.message 
  });
} finally {
  span.end();
}
```

## 🔄 เปรียบเทียบกับ Auto-Instrumentation

| คุณสมบัติ | Manual-Instrumentation | Auto-Instrumentation |
|----------|----------------------|---------------------|
| Setup Speed | 🐢 ใช้เวลามากกว่า | ⚡ รวดเร็ว |
| Code Changes | ❌ ต้องเขียนเยอะ | ✅ น้อยมาก |
| Control | ✅ ควบคุมได้เต็มที่ | ⚠️ จำกัด |
| Customization | ✅ ปรับแต่งได้ทุกอย่าง | ⚠️ ขึ้นกับ instrumentation |
| Performance | ✅ Optimize ได้ตามต้องการ | ✅ Optimized โดย default |
| Learning Curve | ⚠️ สูงกว่า | ✅ ต่ำกว่า |

## 💡 Use Cases

Manual-Instrumentation เหมาะสำหรับ:

- 🎯 **Custom Business Logic**: ต้องการ trace business operations เฉพาะ
- 🔧 **Legacy Systems**: ใช้กับ frameworks หรือ libraries ที่ไม่มี auto-instrumentation
- ⚡ **Performance Critical**: ต้องการควบคุม overhead อย่างละเอียด
- 📊 **Detailed Analytics**: ต้องการ attributes และ events ที่เฉพาะเจาะจง
- 🎓 **Learning**: ต้องการเรียนรู้การทำงานของ OpenTelemetry อย่างลึกซึ้ง

## 🎓 Key Concepts

### Span Kinds

```javascript
// SERVER - รับ request จาก client
span = tracer.startSpan('handleRequest', { kind: 1 });

// CLIENT - เรียก external service
span = tracer.startSpan('callAPI', { kind: 3 });

// INTERNAL - operation ภายใน (default)
span = tracer.startSpan('processData', { kind: 0 });
```

### Context Propagation

```javascript
// สร้าง parent span
const parentSpan = tracer.startSpan('parent');

// สร้าง child span ภายใต้ parent context
context.with(trace.setSpan(context.active(), parentSpan), () => {
  const childSpan = tracer.startSpan('child');
  // childSpan จะเป็น child ของ parentSpan อัตโนมัติ
  childSpan.end();
});

parentSpan.end();
```

### Span Status

```javascript
// Success
span.setStatus({ code: SpanStatusCode.OK });

// Error
span.setStatus({ 
  code: SpanStatusCode.ERROR, 
  message: 'Error description' 
});

// Unset (default)
span.setStatus({ code: SpanStatusCode.UNSET });
```

## 🎨 ตัวอย่างใน Code

### HTTP Request Middleware

```javascript
app.use((req, res, next) => {
  const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
    },
  });
  
  req.span = span;
  
  // Intercept response
  const originalSend = res.send;
  res.send = function(data) {
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
    return originalSend.call(this, data);
  };
  
  context.with(trace.setSpan(context.active(), span), next);
});
```

### Nested Operations

```javascript
// Parent operation
const parentSpan = tracer.startSpan('complexOperation');

await context.with(trace.setSpan(context.active(), parentSpan), async () => {
  // Child operation 1
  const child1 = tracer.startSpan('step1');
  await doStep1();
  child1.end();
  
  // Child operation 2
  const child2 = tracer.startSpan('step2');
  await doStep2();
  child2.end();
  
  parentSpan.end();
});
```

## 📚 เรียนรู้เพิ่มเติม

- [OpenTelemetry JS API Documentation](https://opentelemetry.io/docs/instrumentation/js/api/)
- [Tracing API](https://opentelemetry.io/docs/instrumentation/js/instrumentation/)
- [Context API](https://opentelemetry.io/docs/instrumentation/js/context/)

## 🤝 เมื่อไหร่ควรใช้ Manual vs Auto

### ใช้ Manual เมื่อ:
- ต้องการควบคุมอย่างละเอียด
- Trace business logic เฉพาะ
- ใช้กับ custom frameworks
- Performance optimization เป็นสิ่งสำคัญ

### ใช้ Auto เมื่อ:
- ต้องการ setup รวดเร็ว
- ใช้ standard frameworks
- ต้องการ coverage กว้าง
- มีเวลาจำกัดในการ implement

### หรือใช้ทั้งสอง!
คุณสามารถใช้ auto-instrumentation เป็นพื้นฐาน และเพิ่ม manual spans สำหรับ business logic เฉพาะได้!
