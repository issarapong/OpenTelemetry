const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// กำหนดค่า Resource สำหรับระบุ service
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'service-c-manual',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
  })
);

// ตั้งค่า Trace Exporter
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// สร้าง SDK instance โดยไม่ใช้ auto-instrumentation
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  // ไม่มี instrumentations - ต้อง manual ทุกอย่าง
});

// เริ่มต้น SDK
sdk.start();

console.log('📊 [Service C Manual] OpenTelemetry Manual-Instrumentation initialized');
console.log('✍️  [Service C Manual] All tracing and propagation done manually');

// ปิด SDK อย่างถูกต้องเมื่อแอปพลิเคชันหยุดทำงาน
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('[Service C Manual] Tracing terminated'))
    .catch((error) => console.log('[Service C Manual] Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
