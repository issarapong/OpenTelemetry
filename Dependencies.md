| Dependency                                    | หมวดหมู่         | ความหมาย / ใช้ทำอะไร                                    | ต้องมีหรือไม่                      |
| --------------------------------------------- | ---------------- | ------------------------------------------------------- | ---------------------------------- |
| **@opentelemetry/api**                        | Core API         | API กลางของ OTel ที่โค้ดจะเรียกใช้ เช่น tracer, context | ✔️ จำเป็น                          |
| **@opentelemetry/sdk-node**                   | SDK              | ตัวประมวลผลหลักสำหรับ Node.js ทำ trace/metrics/logs     | ✔️ จำเป็น                          |
| **@opentelemetry/auto-instrumentations-node** | Instrumentation  | ติดตามการทำงานของ Express, HTTP, DB อัตโนมัติ           | ⭐ แนะนำ                            |
| **@opentelemetry/exporter-trace-otlp-http**   | Exporter         | ส่ง Trace ออกไป Collector/Backend ผ่าน HTTP             | ✔️ ถ้าต้องส่ง trace                |
| @opentelemetry/exporter-trace-console         | Exporter         | แสดง Trace บน console ใช้ debug                         | ทางเลือก                           |
| @opentelemetry/sdk-metrics                    | Metrics SDK      | เก็บและส่ง Metrics เช่น CPU, Latency                    | ถ้าต้องการ Metrics                 |
| @opentelemetry/exporter-metrics-otlp-http     | Metrics Exporter | ส่ง Metrics แบบ OTLP ผ่าน HTTP                          | ถ้าส่ง metrics                     |
| @opentelemetry/sdk-logs                       | Log SDK          | เก็บ Logs ให้เป็น OTel format                           | ถ้าต้องการ Logs                    |
| @opentelemetry/exporter-logs-otlp-http        | Log Exporter     | ส่ง Logs ออกไปผ่าน OTLP                                 | ถ้าส่ง logs                        |
| @opentelemetry/instrumentation-express        | Instrumentation  | ติดตาม Express เฉพาะเจาะจง                              | ทางเลือก ถ้าไม่ใช้ auto-instrument |



## Tracing only
```
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http

```
## Tracing + Matrices
```
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/sdk-metrics \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http
```
## Tracing + Matrices+ Logs
```
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/sdk-metrics \
            @opentelemetry/sdk-logs \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http \
            @opentelemetry/exporter-logs-otlp-http
```