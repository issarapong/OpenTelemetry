const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

// ดึงค่าจาก environment variables สำหรับ Kubernetes
const serviceName = process.env.OTEL_SERVICE_NAME || 'express-otel-k8s-app';
const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
const deploymentEnvironment = process.env.DEPLOYMENT_ENVIRONMENT || 'production';
const k8sNamespace = process.env.K8S_NAMESPACE || 'default';
const k8sPodName = process.env.K8S_POD_NAME || 'unknown';
const k8sNodeName = process.env.K8S_NODE_NAME || 'unknown';

// OTLP endpoint (ใช้ Kubernetes service DNS)
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 
  'http://otel-collector.observability.svc.cluster.local:4318';

console.log('🔧 OpenTelemetry Configuration:');
console.log(`   Service: ${serviceName} v${serviceVersion}`);
console.log(`   Environment: ${deploymentEnvironment}`);
console.log(`   Namespace: ${k8sNamespace}`);
console.log(`   Pod: ${k8sPodName}`);
console.log(`   Node: ${k8sNodeName}`);
console.log(`   Endpoint: ${otlpEndpoint}`);

// กำหนดค่า Resource attributes พร้อมข้อมูล Kubernetes
const resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: deploymentEnvironment,
    // Kubernetes attributes
    'k8s.namespace.name': k8sNamespace,
    'k8s.pod.name': k8sPodName,
    'k8s.node.name': k8sNodeName,
    'k8s.cluster.name': process.env.K8S_CLUSTER_NAME || 'local-cluster',
  })
);

// ตั้งค่า Trace Exporter
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
  headers: {
    // เพิ่ม custom headers ถ้าต้องการ
  },
});

// ตั้งค่า Metric Exporter
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
  headers: {
    // เพิ่ม custom headers ถ้าต้องการ
  },
});

// สร้าง SDK instance
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000, // ส่งทุก 10 วินาที
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // ปิด instrumentation ที่ไม่ต้องการ
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      // ตั้งค่า HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/health', '/ready'], // ไม่ trace health checks
      },
    }),
  ],
});

// เริ่มต้น SDK
sdk.start();
console.log('📊 OpenTelemetry SDK initialized successfully');

// Graceful shutdown
const shutdown = async () => {
  try {
    console.log('🛑 Shutting down OpenTelemetry SDK...');
    await sdk.shutdown();
    console.log('✅ OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('❌ Error shutting down OpenTelemetry SDK:', error);
  }
};

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal');
  await shutdown();
  process.exit(0);
});

// Export error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = sdk;
