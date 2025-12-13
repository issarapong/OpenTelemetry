// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { W3CTraceContextPropagator } = require("@opentelemetry/core");

// ---------------------------------------------------------
// 🛠️ ส่วนที่แก้: Logic การเลือก URL
// ถ้ามี ENV (จาก Docker) ให้ใช้ ENV, ถ้าไม่มีให้ใช้ localhost
// ---------------------------------------------------------
const protocol = 'http';
const collectorHost = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost:4318';

// เช็คว่า ENV มี http:// หรือยัง ถ้าไม่มีก็เติมให้ (เผื่อความชัวร์)
const baseUrl = collectorHost.startsWith('http') ? collectorHost : `${protocol}://${collectorHost}`;

console.log(`🔗 OTel Config: Sending data to ${baseUrl}`);

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Missing Resource Attributes
// ---------------------------------------------------------
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'master-lab-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: '2.0.0',
  'deployment.environment': 'production','service.instance.id': 'instance-42',
  'service.namespace': 'master-lab-namespace','my.custom.attribute': 'custom-value',
  'host.name': require('os').hostname(),'host.arch': require('os').arch(),'host.os.type': require('os').type(),
  'host.os.platform': require('os').platform(),'host.os.release': require('os').release(),'host.os.version': require('os').version(),'process.pid': process.pid.toString(),
  'process.command_line': process.argv.join(' '),'process.executable.path': process.execPath,
  'process.runtime.name': 'nodejs','process.runtime.version': process.version,'process.runtime.description': 'Node.js JavaScript Runtime'

});

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Add metadata automatically (Span Processor)
// ---------------------------------------------------------
const { BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');

class MyCustomProcessor {
  onStart(span) {
    span.setAttribute('my.custom.tag', 'auto-injected-by-processor');
  }
  onEnd(span) {}
  shutdown() { return Promise.resolve(); }
  forceFlush() { return Promise.resolve(); }
}

// Create the trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${baseUrl}/v1/traces`,
});

const sdk = new NodeSDK({
  resource: resource,
  // 🎯 เฉลยข้อ: Context Propagation (W3C)
  textMapPropagator: new W3CTraceContextPropagator(),
  
  // ✅ แก้แล้ว: ต้องใช้ BatchSpanProcessor เพื่อให้ส่ง traces จริง ๆ
  spanProcessors: [
    new MyCustomProcessor(),
    new BatchSpanProcessor(traceExporter),
  ],

  metricReader: new PeriodicExportingMetricReader({
    // ✅ แก้แล้ว: ใช้ baseUrl ที่คำนวณมา
    exporter: new OTLPMetricExporter({
      url: `${baseUrl}/v1/metrics`,
    }),
    exportIntervalMillis: 5000,
  }),
});

sdk.start();
console.log('✅ SDK Initialized: Resource & Processors Loaded');