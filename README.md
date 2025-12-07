# OpenTelemetry Overview

## 📚 OpenTelemetry คืออะไร?

OpenTelemetry (OTel) เป็นเฟรมเวิร์กและมาตรฐานแบบ Open Source สำหรับการสังเกตการณ์ (Observability) ของระบบ ที่ช่วยให้เราสามารถติดตาม วัดผล และวิเคราะห์พฤติกรรมของแอปพลิเคชันได้อย่างครบวงจร

### 🎯 องค์ประกอบหลักของ OpenTelemetry

1. **Traces (การติดตาม)** - ติดตามการเดินทางของ request ผ่านระบบต่างๆ
2. **Metrics (ตัวชี้วัด)** - เก็บข้อมูลเชิงตัวเลข เช่น CPU, Memory, Request count
3. **Logs (บันทึก)** - บันทึกเหตุการณ์ที่เกิดขึ้นในระบบ

## 🏗️ สถาปัตยกรรม OpenTelemetry

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Application Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────--┐       │
│  │  Web App  │  │  Mobile   │  │    API    │  │ Microservice│       │
│  │           │  │    App    │  │  Gateway  │  │             │       │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬───────┘       │
│        │              │              │              │               │
│        └──────────────┴──────────────┴──────────────┘               │
│                            │                                        │
│                            ▼                                        │
│              ┌──────────────────────────────┐                       │
│              │  OpenTelemetry SDK/Agent     │                       │
│              │  - Auto-instrumentation      │                       │
│              │  - Manual instrumentation    │                       │
│              │  - Context Propagation       │                       │
│              └──────────────┬───────────────┘                       │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ Export Telemetry Data
                             │ (gRPC/HTTP)
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Collection Layer                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│              ┌──────────────────────────────┐                      │
│              │  OpenTelemetry Collector     │                      │
│              │  ┌────────────────────────┐  │                      │
│              │  │     Receivers          │  │  รับข้อมูล              │
│              │  │  - OTLP                │  │                      │
│              │  │  - Jaeger              │  │                      │
│              │  │  - Prometheus          │  │                      │
│              │  └───────────┬────────────┘  │                      │
│              │              │               │                      │
│              │  ┌───────────▼────────────┐  │                      │
│              │  │     Processors         │  │  ประมวลผล            │
│              │  │  - Batch               │  │                      │
│              │  │  - Filter              │  │                      │
│              │  │  - Attributes          │  │                      │
│              │  └───────────┬────────────┘  │                      │
│              │              │               │                      │
│              │  ┌───────────▼────────────┐  │                      │
│              │  │     Exporters          │  │  ส่งข้อมูลออก           │
│              │  │  - Jaeger              │  │                      │
│              │  │  - Prometheus          │  │                      │
│              │  │  - Grafana             │  │                      │
│              │  └────────────────────────┘  │                      │
│              └──────────────┬───────────────┘                      │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             │ Send to Backend
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend/Storage Layer                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Jaeger     │  │  Prometheus  │  │   Grafana    │               │
│  │   (Traces)   │  │   (Metrics)  │  │ (Visualization)│             │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │    Loki      │  │ Elasticsearch│  │   Tempo      │               │
│  │    (Logs)    │  │   (Logs)     │  │  (Traces)    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagram: Application → Backend

```
┌─────────────────────────────────────────────────────────────────────┐
│                         1. Application Layer                        │
└─────────────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌───────────┐  ┌───────────┐  ┌───────────┐
        │  Traces   │  │  Metrics  │  │   Logs    │
        │           │  │           │  │           │
        │ - Spans   │  │ - Counter │  │ - Info    │
        │ - Context │  │ - Gauge   │  │ - Warning │
        │ - Events  │  │ - Histogram│ │ - Error   │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────────┐
        │      OpenTelemetry SDK                   │
        │  - Instrumentation                       │
        │  - Sampling (การสุ่มตัวอย่าง)                │
        │  - Context Propagation (การส่งต่อ context) │
        └──────────────┬───────────────────────────┘
                       │
                       │ Protocol: OTLP/gRPC or HTTP
                       │ Format: Protobuf/JSON
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      2. Collection Layer                            │
└─────────────────────────────────────────────────────────────────────┘
                       │
        ┌──────────────▼───────────────┐
        │  OpenTelemetry Collector     │
        │                              │
        │  ┌────────────────────────┐  │
        │  │ Step 1: Receive        │  │
        │  │ - รับข้อมูลจาก SDK        │  │
        │  │ - Validate format      │  │
        │  └───────────┬────────────┘  │
        │              │               │
        │  ┌───────────▼────────────┐  │
        │  │ Step 2: Process        │  │
        │  │ - Batch รวมข้อมูล        │  │
        │  │ - Filter กรองข้อมูล      │  │
        │  │ - Enrich เพิ่มข้อมูล       │  │
        │  │ - Sample สุ่มตัวอย่าง      │  │
        │  └───────────┬────────────┘  │
        │              │               │
        │  ┌───────────▼────────────┐  │
        │  │ Step 3: Export         │  │
        │  │ - แปลง format          │  │
        │  │ - Retry ถ้าส่งไม่สำเร็จ    │  │
        │  │ - Queue management     │  │
        │  └───────────┬────────────┘  │
        └──────────────┼───────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    3. Backend Storage Layer                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Jaeger     │      │  Prometheus  │      │    Loki      │
│              │      │              │      │              │
│ Store Traces │      │Store Metrics │      │ Store Logs   │
│              │      │              │      │              │
│ - Spans      │      │ - Counters   │      │ - Log lines  │
│ - Services   │      │ - Gauges     │      │ - Timestamps │
│ - Operations │      │ - Histograms │      │ - Labels     │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    4. Visualization Layer                           │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │    Grafana     │
                    │                │
                    │ - Dashboards   │
                    │ - Alerts       │
                    │ - Query        │
                    └────────────────┘
```

## 🌟 ประโยชน์ของ OpenTelemetry

- **🔍 Distributed Tracing**: ติดตามการทำงานของ request ผ่านหลาย microservices
- **📊 Unified Observability**: รวบรวม traces, metrics, และ logs ในที่เดียว
- **🔌 Vendor-Agnostic**: ไม่ผูกกับ vendor ใดเฉพาะ สามารถเปลี่ยนเครื่องมือได้ง่าย
- **🚀 Performance Monitoring**: วัดประสิทธิภาพและระบุจุดคอขวด
- **🐛 Debugging**: แก้ไขปัญหาได้รวดเร็วขึ้นด้วยข้อมูลที่ละเอียด
- **📈 Business Insights**: วิเคราะห์พฤติกรรมผู้ใช้และระบบ

## 🛠️ การทำงานทีละขั้นตอน

1. **Application ส่งข้อมูล**: แอปพลิเคชันสร้าง telemetry data (traces/metrics/logs)
2. **SDK ประมวลผล**: OpenTelemetry SDK จัดการและเตรียมข้อมูล
3. **Collector รับและประมวลผล**: OTel Collector รับข้อมูล กรอง และแปลง format
4. **ส่งไป Backend**: Collector ส่งข้อมูลไปยังระบบ storage ต่างๆ
5. **Visualization**: แสดงผลผ่าน Grafana หรือเครื่องมือ visualization อื่นๆ

## 📦 ตัวอย่างการใช้งาน

### Node.js Express Application

ตัวอย่างการใช้งาน OpenTelemetry กับ Express.js แบบเต็มรูปแบบพร้อมทั้ง:
- Auto-instrumentation สำหรับ Express และ HTTP
- Custom spans, attributes, และ events
- Error tracking และ exception handling
- Metrics collection
- Docker Compose stack พร้อม Jaeger, Prometheus, และ Grafana

👉 **[ดูตัวอย่างโค้ดแบบเต็มได้ที่ folder `example/`](./example/)**

### คุณสมบัติที่มีในตัวอย่าง

✅ **Auto-instrumentation**: ติดตามการทำงานของ Express และ HTTP requests อัตโนมัติ  
✅ **Custom Spans**: สร้าง span เพิ่มเติมสำหรับการทำงานเฉพาะ  
✅ **Attributes**: เพิ่มข้อมูลเพิ่มเติมให้กับ span  
✅ **Events**: บันทึกเหตุการณ์สำคัญใน span  
✅ **Error Tracking**: จับและบันทึก exceptions  
✅ **Metrics Export**: ส่งข้อมูล metrics ไปยัง collector  
✅ **Full Observability Stack**: Docker Compose พร้อม Jaeger, Prometheus, Grafana

### วิธีการรัน

```bash
# เข้าไปที่ folder example
cd example/

# ติดตั้ง dependencies
npm install

# เริ่มต้น observability stack
docker-compose up -d

# รันแอปพลิเคชัน
npm start
```

### ทดสอบ API

```bash
# ทดสอบ endpoint หลัก
curl http://localhost:3000/

# ทดสอบ endpoint ที่มี custom span
curl http://localhost:3000/api/users/123

# ทดสอบ POST request
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test data"}'
```

### เข้าถึง UI

- **Jaeger UI** (Traces): http://localhost:16686
- **Prometheus** (Metrics): http://localhost:9090
- **Grafana** (Visualization): http://localhost:3001 (admin/admin)

## 📖 เอกสารเพิ่มเติม

- **[คำศัพท์ OpenTelemetry (Vocabulary)](./vocabulary.md)** - รวมคำศัพท์พร้อมคำแปลภาษาไทย จัดเรียงตาม Layer
- **[ตัวอย่างการใช้งาน Docker (Example)](./example/)** - ตัวอย่าง Node.js Express พร้อม Docker Compose Stack
- **[ตัวอย่างการใช้งาน Kubernetes (Example K8s)](./example-kubernetes/)** - ตัวอย่างการ deploy บน Kubernetes พร้อม Helm Charts

## 🔗 แหล่งข้อมูลเพิ่มเติม

- [OpenTelemetry Official Website](https://opentelemetry.io/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry GitHub](https://github.com/open-telemetry)
- [CNCF OpenTelemetry](https://www.cncf.io/projects/opentelemetry/)

---

**สร้างโดย**: OpenTelemetry Community  
**ใบอนุญาต**: Apache License 2.0