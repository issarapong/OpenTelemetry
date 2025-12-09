const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// กำหนดค่า Resource สำหรับระบุ service
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'service-c-auto',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
  })
);

// ตั้งค่า Trace Exporter
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// สร้าง SDK instance พร้อม auto-instrumentation
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
    }),
  ],
});

// เริ่มต้น SDK
sdk.start();

console.log('📊 [Service C] OpenTelemetry Auto-Instrumentation initialized');
console.log('🔗 [Service C] Context propagation enabled');

// ปิด SDK อย่างถูกต้องเมื่อแอปพลิเคชันหยุดทำงาน
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('[Service C] Tracing terminated'))
    .catch((error) => console.log('[Service C] Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
