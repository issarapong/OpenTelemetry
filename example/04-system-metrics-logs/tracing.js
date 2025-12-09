const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { PeriodicExportingMetricReader, MeterProvider } = require('@opentelemetry/sdk-metrics');
const { HostMetrics } = require('@opentelemetry/host-metrics');
const { 
  LoggerProvider,
  BatchLogRecordProcessor,
} = require('@opentelemetry/sdk-logs');
const { logs } = require('@opentelemetry/api-logs');

// กำหนดค่า Resource สำหรับระบุ service
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'system-metrics-logs-example',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'development',
    'service.instance.id': process.pid.toString(),
    'host.name': require('os').hostname(),
  })
);

// ตั้งค่า Trace Exporter
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
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

// สร้าง Metric Reader
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 5000, // Export ทุก 5 วินาที
});

// สร้าง MeterProvider
const meterProvider = new MeterProvider({
  resource: resource,
  readers: [metricReader],
});

// สร้าง SDK instance
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  metricReader: metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
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

// เริ่ม Host Metrics Collection
const hostMetrics = new HostMetrics({
  meterProvider: meterProvider,
  name: 'system-metrics-logs-host',
});

hostMetrics.start();

console.log('📊 OpenTelemetry System Metrics & Logs initialized');
console.log('🖥️  Host Metrics collection started');
console.log('📝 Traces: http://localhost:4318/v1/traces');
console.log('📈 Metrics: http://localhost:4318/v1/metrics (includes host metrics)');
console.log('🗒️  Logs: http://localhost:4318/v1/logs');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => {
      loggerProvider.shutdown();
      hostMetrics.shutdown();
      console.log('OpenTelemetry SDK shut down successfully');
    })
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  sdk.shutdown()
    .then(() => {
      loggerProvider.shutdown();
      hostMetrics.shutdown();
      console.log('OpenTelemetry SDK shut down successfully');
    })
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

// Export logger และ meterProvider
module.exports = { logger, meterProvider };
