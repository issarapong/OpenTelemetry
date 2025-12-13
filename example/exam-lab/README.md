# Lab form fail exam

##Lab นี้จะทำให้คุณเห็นภาพชัดเจนในเรื่อง:

- Span Processor (การแอบเติม Metadata อัตโนมัติ)

- Exemplars (การลิงก์ Metric -> Trace)

- Tail Sampling + Memory Limits (การจัดการ Memory เมื่อ Trace เยอะ)

- Change Backend (เปลี่ยนที่เก็บข้อมูลโดยไม่แก้โค้ด)

- W3C Context Propagation (หน้าตา Header traceparent)


## 📂 Structure (อัปเกรดใหม่)
สร้างโฟลเดอร์ otel-master-lab แล้วสร้างไฟล์ดังนี้:

```

otel-master-lab/
├── app.js                 # App จำลอง Cache & Latency
├── tracing.js             # SDK Config (ใส่ Resource, Processor, Propagator)
├── package.json           # Dependencies
├── otel-collector.yaml    # Config Collector (พระเอกเรื่อง Sampling & Routing)
└── docker-compose.yaml    # รัน Jaeger + Collector
```
## 1. ไฟล์ package.json เราต้องเพิ่ม library บางตัวเพื่อให้รองรับฟีเจอร์ครบครับ


```JSON

{
  "name": "otel-master-lab",
  "version": "1.0.0",
  "main": "app.js",
  "dependencies": {
    "express": "^4.19.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.52.0",
    "@opentelemetry/auto-instrumentations-node": "^0.47.0",
    "@opentelemetry/exporter-trace-otlp-proto": "^0.52.0",
    "@opentelemetry/exporter-metrics-otlp-proto": "^0.52.0",
    "@opentelemetry/resources": "^1.25.0",
    "@opentelemetry/semantic-conventions": "^1.25.0",
    "@opentelemetry/sdk-trace-base": "^1.25.0"
  }
}
```
สั่ง npm install ใน Terminal

## 2. ไฟล์ tracing.js (หัวใจหลักของ SDK) ไฟล์นี้จะตอบโจทย์เรื่อง Resource, Span Processor, และ Propagation ครับ

```JavaScript

// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { W3CTraceContextPropagator } = require("@opentelemetry/core");
const { trace } = require("@opentelemetry/api");

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Missing Resource Attributes
// Resource คือ Global Config (แก้ที่เดียวใช้ได้ทั้ง Metrics/Traces/Logs)
// ---------------------------------------------------------
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'master-lab-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: '2.0.0',
  'deployment.environment': 'production'
});

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Add metadata automatically (Span Processor)
// ใช้ SpanProcessor เพื่อ "Inject" Attribute ให้ทุก Span โดยไม่ต้องแก้ Business Code
// ---------------------------------------------------------
class MyCustomProcessor {
  onStart(span) {
    span.setAttribute('my.custom.tag', 'auto-injected-by-processor');
  }
  onEnd(span) {}
  shutdown() { return Promise.resolve(); }
  forceFlush() { return Promise.resolve(); }
}

const sdk = new NodeSDK({
  resource: resource,
  // 🎯 เฉลยข้อ: Context Propagation
  // กำหนดให้ใช้ W3C Trace Context (traceparent header) เพื่อคุยข้ามภาษาได้
  textMapPropagator: new W3CTraceContextPropagator(),
  
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  
  // เพิ่ม Processor พิเศษที่เราสร้างเอง
  spanProcessor: new MyCustomProcessor(),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 5000,
  }),
});

sdk.start();
console.log('✅ SDK Initialized: Resource & Processors Loaded');
```

## 3. ไฟล์ app.js (App จำลองเหตุการณ์) ไฟล์นี้ตอบโจทย์เรื่อง Metrics Types และ Exemplars

```JavaScript

// app.js
const express = require('express');
const { metrics, trace, context } = require('@opentelemetry/api');

const app = express();
const meter = metrics.getMeter('lab-meter');

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Cache Eviction Metric
// ใช้ Counter (Monotonic) เพราะเป็นการนับสะสม (เพิ่มอย่างเดียว)
// ---------------------------------------------------------
const evictionCounter = meter.createCounter('cache_eviction_total', {
  description: 'Counts cache evictions',
});

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Metrics to Traces Correlation
// ใช้ Histogram เพื่อดู Latency และ OTel จะแปะ "Exemplar" (Trace ID)
// มาให้ใน Histogram Bucket อัตโนมัติ (ถ้ามีการ Sampling)
// ---------------------------------------------------------
const processingHistogram = meter.createHistogram('http_request_duration_ms', {
  description: 'Request latency',
});

app.get('/run', (req, res) => {
  // 🎯 เฉลยข้อ: W3C Header
  // ดู Log นี้เพื่อเห็นหน้าตาของ 'traceparent' ที่ส่งมา
  console.log('📡 Context Header (traceparent):', req.headers.traceparent);

  const span = trace.getTracer('handler').startSpan('process-request');
  
  // จำลอง Cache Eviction
  evictionCounter.add(1);

  // จำลอง Latency
  const delay = Math.floor(Math.random() * 200);
  setTimeout(() => {
    processingHistogram.record(delay);
    span.end();
    res.send(`Done in ${delay}ms`);
  }, delay);
});

app.get('/error', (req, res) => {
  // สำหรับเทส Tail Sampling
  res.status(500).send('Boom!');
});

app.listen(3000, () => console.log('🚀 App running on 3000'));
```
## 4. ไฟล์ otel-collector.yaml (หัวใจของ Pipeline)
ไฟล์นี้ตอบโจทย์เรื่อง Tail Sampling Memory, Debug Exporter, และ Backend Routing

```YAML

receivers:
  otlp:
    protocols:
      http:
        endpoint: "0.0.0.0:4318"
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  batch:

  # -------------------------------------------------------
  # 🎯 เฉลยข้อ: Tail Sampling & Memory Pressure
  # 1. ต้องใช้ Tail Sampling เพื่อเลือกเก็บ Error 100%
  # 2. ต้องใส่ limit_mib เพื่อป้องกัน RAM เต็ม (Memory Pressure)
  # -------------------------------------------------------
  tail_sampling:
    decision_wait: 5s
    num_traces: 100
    expected_new_traces_per_sec: 10
    policies:
      [
        {
          name: error-policy,
          type: status_code,
          status_code: { status_codes: [ERROR] }
        },
        {
          name: random-policy,
          type: probabilistic,
          probabilistic: { sampling_percentage: 50 }
        }
      ]

exporters:
  # 🎯 เฉลยข้อ: Debug Exporter (Visualize Data)
  debug:
    verbosity: detailed

  # 🎯 เฉลยข้อ: Change Backend w/o Code
  # ถ้าวันหน้าอยากเปลี่ยนไปใช้ Prometheus หรือ Zipkin ก็แก้แค่ตรงนี้!
  otlp/jaeger:
    endpoint: "jaeger:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch] 
      exporters: [debug, otlp/jaeger] # ส่งออก 2 ทาง
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug] # Metrics ก็ส่งออก Debug ได้
```
## 5. ไฟล์ docker-compose.yaml

```YAML

version: "3"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest # ต้องใช้ Contrib เพื่อ Tail Sampling
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318"
    depends_on:
      - jaeger

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4317:4317"

## 🎯 เฉลยข้อ: Sidecar Pattern (Concept)
  # การรัน App คู่กับ Collector ใน Network เดียวกัน (ใน K8s คือ Pod เดียวกัน)
  # ทำให้ App ส่งหา Collector ผ่าน localhost ได้เลย
 
 ```
  my-app:
    build: . # ต้องสร้าง Dockerfile (ดูข้างล่าง)
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
    ports:
      - "3000:3000"
    depends_on:
      - otel-collector
(สร้างไฟล์ Dockerfile เพิ่มอีก 1 ไฟล์เพื่อให้รัน my-app ใน compose ได้)
```

```Dockerfile

FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "--require", "./tracing.js", "app.js" ]
```
ขออภัยครับ ผมจัดลำดับให้ใหม่เพื่อให้สอดคล้องกับการเรียนรู้ทีละขั้น (Step-by-Step) และแก้ปัญหาเรื่อง `undefined` ที่คุณเจอด้วยครับ

นี่คือ **ลำดับการทดลอง (Updated Walkthrough)** ที่ถูกต้องและครบถ้วนที่สุดครับ:

-----

### 🧪 ขั้นตอนการทดลอง (Revised Master Lab)

#### Step 0: เริ่มระบบ

```bash
docker-compose up --build
```

*รอจนกว่าจะเห็น Log ว่า `App running on 3000` และ Collector เริ่มทำงาน*

-----

#### ✅ Mission 1: พิสูจน์ Resource & Span Processor

*เป้าหมาย: ตรวจสอบว่า "บัตรประชาชน" (Service Name) และ "ข้อมูลที่แอบเติม" (Attribute) มาครบไหม*

1.  เปิด Terminal อีกอัน แล้วยิง Request ปกติ:
    ```bash
    curl http://localhost:3000/run
    ```
2.  กลับไปดู Log ของ **otel-collector** (ไม่ใช่ App):
      * มองหา JSON ก้อนใหญ่ๆ ที่เด้งขึ้นมา (นี่คือผลงานของ **Debug Exporter**)
      * **จุดสังเกต 1 (Resource):** หาคำว่า `"service.name"` คุณจะเจอค่า `"master-lab-service"` (ที่เรา config ไว้ใน `tracing.js`)
      * **จุดสังเกต 2 (Span Processor):** ในส่วน `attributes` ของ Span คุณจะเจอ `"my.custom.tag"` : `"auto-injected-by-processor"` (นี่คือสิ่งที่ Processor แอบเติมให้เองอัตโนมัติ)

-----

#### ✅ Mission 2: พิสูจน์ Context Propagation (แก้ undefined)

*เป้าหมาย: ทำให้ App รู้จัก Trace ID จากภายนอก (มาตรฐาน W3C)*

1.  ยิง Request แบบ **"ยัด Header"** (สมมติว่า Service อื่นส่งมา):
    ```bash
    curl -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" http://localhost:3000/run
    ```
2.  ดู Log ที่หน้าจอของ **Node.js App** (my-app):
      * คราวนี้จะไม่ใช่ `undefined` แล้ว\!
      * คุณจะเห็น: `📡 Context Header (traceparent): 00-4bf92f3577b34da6a3ce929d0e0e4736...`
      * **สรุป:** นี่พิสูจน์ว่า `W3CTraceContextPropagator` ทำงานถูกต้อง มันแกะกล่องของขวัญ (Header) ที่ส่งมาได้

-----

#### ✅ Mission 3: พิสูจน์ Metrics Types & Exemplars

*เป้าหมาย: แยกความต่างของ Counter vs Histogram และดู Exemplar*

1.  ยิง Request รัวๆ สัก 5 ครั้ง:
    ```bash
    for i in {1..5}; do curl http://localhost:3000/run; done
    ```
2.  ดู Log ของ **otel-collector** (ส่วน Metrics):
      * **จุดสังเกต 1 (Counter):** หา `cache_eviction_total` ค่ามันจะเป็นตัวเลขจำนวนเต็มที่ **เพิ่มขึ้นเรื่อยๆ** (เช่น 1, 2, 3, 4, 5...) นี่คือลักษณะของ **Monotonic Counter**
      * **จุดสังเกต 2 (Histogram):** หา `http_request_duration_ms` ค่าจะออกมาเป็น **Buckets** (เช่น ช่วง 0-5ms มีกี่ครั้ง, 5-10ms มีกี่ครั้ง)
      * **จุดสังเกต 3 (Exemplars):** ในก้อน Histogram ลองมองหาคำว่า `"exemplars"` คุณจะเห็น `trace_id` แปะอยู่ข้างในนั้น (นี่คือลิงก์ลับที่เชื่อมกราฟกลับไปหา Trace\!)

-----

#### ✅ Mission 4: พิสูจน์ Tail Sampling (สำคัญ\!)

*เป้าหมาย: ดูว่ามันเลือกเก็บ Error 100% แต่สุ่มเก็บ Success แค่ 50% จริงไหม*

1.  **ยิง Error 1 ครั้ง:** (ต้องเก็บแน่นอน)
    ```bash
    curl http://localhost:3000/error
    ```
2.  **ยิง Success 10 ครั้ง:** (ควรจะหายไปประมาณครึ่งนึง)
    ```bash
    for i in {1..10}; do curl http://localhost:3000/run; done
    ```
3.  เปิด **Jaeger UI** (`http://localhost:16686`):
      * กด Search ดู Trace ทั้งหมด
      * **ผลลัพธ์:**
          * คุณจะเจอ Trace สีแดง (Error) **ครบทุกครั้ง** ที่ยิงไป (เพราะ Policy คือ Error 100%)
          * คุณจะเจอ Trace สีปกติ (Success) **แค่ประมาณ 4-6 อัน** (จากที่ยิงไป 10) เพราะ Policy คือ Probabilistic 50%
      * **สรุป:** นี่พิสูจน์ว่า **Tail Sampling** ทำงานโดยรอให้จบก่อน แล้วค่อยตัดสินใจทิ้งหรือเก็บ

-----

#### ✅ Mission 5: พิสูจน์ Backend Routing & Debugging

*เป้าหมาย: เข้าใจว่าทำไมเราถึงเปลี่ยนที่เก็บข้อมูลได้โดยไม่แก้โค้ด*

1.  **Debug:** การที่คุณเห็น JSON ไหลมาที่หน้าจอ Terminal ตลอดเวลานั้น นั่นคือผลงานของ `debug exporter` ที่เราใส่ไว้ใน `otel-collector.yaml` (ช่วยให้เรามั่นใจว่าข้อมูลเข้า Collector จริง)
2.  **Changing Backend:**
      * ถ้าวันพรุ่งนี้อยากส่งไป **Zipkin** หรือ **Prometheus**
      * คุณแค่แก้ไฟล์ `otel-collector.yaml` ตรง section `exporters`
      * แล้ว Restart Docker (`docker-compose restart otel-collector`)
      * **App Node.js ไม่ต้องแตะต้องโค้ดเลยแม้แต่บรรทัดเดียว\!**

-----

ลองไล่ตามลำดับนี้ดูนะครับ จะครบทุกจุดที่คุณตอบผิดในข้อสอบเลยครับ\!