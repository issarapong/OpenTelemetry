const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { 
  LoggerProvider,
  BatchLogRecordProcessor,
} = require('@opentelemetry/sdk-logs');
const { logs } = require('@opentelemetry/api-logs');

// กำหนดค่า Resource สำหรับระบุ service
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'manual-instrumentation-example',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
  })
);

// ตั้งค่า Trace Exporter
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces', // OTLP HTTP endpoint
});

// ตั้งค่า Metric Exporter
const metricExporter = new OTLPMetricExporter({
  url: 'http://localhost:4318/v1/metrics',
});

// ตั้งค่า Log Exporter และ Logger Provider
const logExporter = new OTLPLogExporter({
  url: 'http://localhost:4318/v1/logs',
});

const loggerProvider = new LoggerProvider({
  resource: resource,
});

loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(logExporter)
);

// Register the logger provider
logs.setGlobalLoggerProvider(loggerProvider);

// Export logger instance สำหรับใช้ใน app
const logger = loggerProvider.getLogger('default', '1.0.0');

// สร้าง SDK instance โดยไม่ใช้ auto-instrumentation
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
  }),
  // ไม่มี instrumentations: [] หรือ instrumentations: []
  // ทุก span ต้องสร้างด้วย manual code
});

// เริ่มต้น SDK
sdk.start();

console.log('📊 OpenTelemetry Manual-Instrumentation initialized (Traces + Metrics + Logs)');
console.log('✍️  No auto-instrumentations enabled');
console.log('🎯 All spans must be created manually for full control');
console.log('📝 Traces: http://localhost:4318/v1/traces');
console.log('📈 Metrics: http://localhost:4318/v1/metrics');
console.log('🗒️  Logs: http://localhost:4318/v1/logs');

// ปิด SDK อย่างถูกต้องเมื่อแอปพลิเคชันหยุดทำงาน
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => {
      loggerProvider.shutdown();
      console.log('OpenTelemetry SDK shut down successfully');
    })
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

module.exports = { sdk, logger };
