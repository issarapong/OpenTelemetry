// โหลด tracing ก่อนทุกอย่าง
const { logger, meterProvider } = require('./tracing');

const express = require('express');
const os = require('os');
const { trace } = require('@opentelemetry/api');
const { SeverityNumber } = require('@opentelemetry/api-logs');

const app = express();
const PORT = 3003;

// Middleware
app.use(express.json());

// สร้าง Custom Metrics
const meter = meterProvider.getMeter('app-metrics');

// Counter: จำนวน requests
const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total number of HTTP requests',
});

// Histogram: Response time
const responseTimeHistogram = meter.createHistogram('http.response.duration', {
  description: 'HTTP response duration in milliseconds',
  unit: 'ms',
});

// UpDownCounter: Active connections
const activeConnectionsCounter = meter.createUpDownCounter('http.connections.active', {
  description: 'Number of active HTTP connections',
});

// Gauge: Memory usage (Observable)
const memoryGauge = meter.createObservableGauge('process.memory.usage', {
  description: 'Process memory usage in bytes',
  unit: 'bytes',
});

memoryGauge.addCallback((observableResult) => {
  const memUsage = process.memoryUsage();
  observableResult.observe(memUsage.heapUsed, { type: 'heap_used' });
  observableResult.observe(memUsage.heapTotal, { type: 'heap_total' });
  observableResult.observe(memUsage.rss, { type: 'rss' });
  observableResult.observe(memUsage.external, { type: 'external' });
});

// Observable Gauge: CPU usage
const cpuGauge = meter.createObservableGauge('process.cpu.usage', {
  description: 'Process CPU usage percentage',
  unit: '%',
});

let lastCpuUsage = process.cpuUsage();
let lastTime = Date.now();

cpuGauge.addCallback((observableResult) => {
  const currentCpuUsage = process.cpuUsage(lastCpuUsage);
  const currentTime = Date.now();
  const timeDiff = currentTime - lastTime;
  
  if (timeDiff > 0) {
    const cpuPercent = ((currentCpuUsage.user + currentCpuUsage.system) / (timeDiff * 1000)) * 100;
    observableResult.observe(cpuPercent);
  }
  
  lastCpuUsage = process.cpuUsage();
  lastTime = currentTime;
});

// Middleware: Track metrics
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Increment active connections
  activeConnectionsCounter.add(1);
  
  // Increment request counter
  requestCounter.add(1, {
    method: req.method,
    path: req.path,
  });
  
  // Log request
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: `Incoming ${req.method} request to ${req.path}`,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.path': req.path,
      'http.user_agent': req.get('user-agent'),
    },
  });
  
  // Track response time and decrement active connections on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    responseTimeHistogram.record(duration, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
    });
    
    activeConnectionsCounter.add(-1);
    
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `Request completed: ${req.method} ${req.path}`,
      attributes: {
        'http.method': req.method,
        'http.path': req.path,
        'http.status_code': res.statusCode,
        'http.response_time_ms': duration,
      },
    });
  });
  
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'OpenTelemetry System Metrics & Logs Example',
    description: 'Monitor host metrics, custom metrics, and structured logs',
    features: [
      'Host Metrics (CPU, Memory, Disk, Network)',
      'Custom Application Metrics',
      'Structured Logging with TraceID',
      'Traces correlation'
    ],
    timestamp: new Date().toISOString()
  });
});

// Endpoint: System info
app.get('/api/system', (req, res) => {
  const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
    loadAverage: os.loadavg(),
  };
  
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'System information retrieved',
    attributes: {
      'system.hostname': systemInfo.hostname,
      'system.platform': systemInfo.platform,
      'system.cpus': os.cpus().length,
    },
  });
  
  res.json(systemInfo);
});

// Endpoint: Process info
app.get('/api/process', (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const processInfo = {
    pid: process.pid,
    uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
    nodeVersion: process.version,
    memory: {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
    },
    cpu: {
      user: `${(cpuUsage.user / 1000).toFixed(2)} ms`,
      system: `${(cpuUsage.system / 1000).toFixed(2)} ms`,
    },
  };
  
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Process information retrieved',
    attributes: {
      'process.pid': processInfo.pid,
      'process.memory.heap_used': memUsage.heapUsed,
      'process.memory.rss': memUsage.rss,
    },
  });
  
  res.json(processInfo);
});

// Endpoint: Simulate CPU load
app.get('/api/load-cpu', (req, res) => {
  const duration = parseInt(req.query.duration) || 5000;
  
  logger.emit({
    severityNumber: SeverityNumber.WARN,
    severityText: 'WARN',
    body: `CPU load simulation started for ${duration}ms`,
    attributes: {
      'simulation.type': 'cpu_load',
      'simulation.duration': duration,
    },
  });
  
  const startTime = Date.now();
  
  // Simulate CPU intensive task
  while (Date.now() - startTime < duration) {
    Math.sqrt(Math.random());
  }
  
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'CPU load simulation completed',
    attributes: {
      'simulation.type': 'cpu_load',
      'simulation.duration': duration,
    },
  });
  
  res.json({ 
    message: 'CPU load simulation completed',
    duration: `${duration}ms`
  });
});

// Endpoint: Simulate memory allocation
app.get('/api/load-memory', (req, res) => {
  const sizeMB = parseInt(req.query.size) || 10;
  
  logger.emit({
    severityNumber: SeverityNumber.WARN,
    severityText: 'WARN',
    body: `Memory allocation simulation started: ${sizeMB}MB`,
    attributes: {
      'simulation.type': 'memory_allocation',
      'simulation.size_mb': sizeMB,
    },
  });
  
  // Allocate memory
  const array = new Array(sizeMB * 1024 * 1024 / 8); // Approximate MB
  array.fill(Math.random());
  
  const memUsage = process.memoryUsage();
  
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Memory allocation completed',
    attributes: {
      'simulation.type': 'memory_allocation',
      'simulation.size_mb': sizeMB,
      'memory.heap_used': memUsage.heapUsed,
    },
  });
  
  res.json({ 
    message: 'Memory allocated',
    size: `${sizeMB}MB`,
    currentHeapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
  });
});

// Endpoint: Generate logs at different severity levels
app.post('/api/generate-logs', (req, res) => {
  const { level = 'INFO', count = 10 } = req.body;
  
  const severityMap = {
    'TRACE': SeverityNumber.TRACE,
    'DEBUG': SeverityNumber.DEBUG,
    'INFO': SeverityNumber.INFO,
    'WARN': SeverityNumber.WARN,
    'ERROR': SeverityNumber.ERROR,
    'FATAL': SeverityNumber.FATAL,
  };
  
  const severityNumber = severityMap[level] || SeverityNumber.INFO;
  
  for (let i = 0; i < count; i++) {
    logger.emit({
      severityNumber: severityNumber,
      severityText: level,
      body: `Generated ${level} log #${i + 1}`,
      attributes: {
        'log.type': 'generated',
        'log.index': i + 1,
        'log.total': count,
      },
    });
  }
  
  res.json({ 
    message: `Generated ${count} ${level} logs`,
    level,
    count
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message });
  }
  
  logger.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: `Unhandled error: ${err.message}`,
    attributes: {
      'error.message': err.message,
      'error.stack': err.stack,
      'http.method': req.method,
      'http.url': req.url,
    },
  });
  
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 System Metrics & Logs Example running on http://localhost:${PORT}`);
  console.log(`📊 Sending telemetry to OTLP collector at http://localhost:4318`);
  console.log(`🖥️  Monitoring host metrics (CPU, Memory, Disk, Network)`);
  console.log(`📈 Collecting custom application metrics`);
  console.log(`📝 Traces + 📈 Metrics + 🗒️  Logs enabled`);
  
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Application started successfully',
    attributes: {
      'service.name': 'system-metrics-logs-example',
      'port': PORT,
      'pid': process.pid,
    },
  });
});
