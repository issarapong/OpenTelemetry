const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
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
    [SemanticResourceAttributes.SERVICE_NAME]: 'auto-instrumentation-example',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
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

// สร้าง SDK instance พร้อม auto-instrumentation
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // ปิด instrumentation ที่ไม่ต้องการ
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      // Express และ HTTP จะถูก instrument อัตโนมัติ
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
    }),
  ],
});

// เริ่มต้น SDK
sdk.start();

console.log('📊 OpenTelemetry Auto-Instrumentation initialized (Traces + Metrics + Logs)');
console.log('📝 Traces: http://localhost:4318/v1/traces');
console.log('📈 Metrics: http://localhost:4318/v1/metrics');
console.log('🗒️  Logs: http://localhost:4318/v1/logs');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => {
      loggerProvider.shutdown();
      console.log('OpenTelemetry SDK shut down successfully');
    })
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

console.log('✨ Auto-instrumentations enabled:');
console.log('   - Express');
console.log('   - HTTP/HTTPS');
console.log('   - และอื่นๆ ตาม default configuration');

// Export logger และ sdk สำหรับใช้ใน application
module.exports = { logger, sdk };
