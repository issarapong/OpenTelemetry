// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint (ไม่ trace)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Readiness probe
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Home endpoint
app.get('/', (req, res) => {
  const tracer = trace.getTracer('express-otel-k8s-app');
  const span = tracer.startSpan('home-endpoint');
  
  try {
    // เพิ่ม Kubernetes context
    span.setAttribute('k8s.pod.name', process.env.K8S_POD_NAME || 'unknown');
    span.setAttribute('k8s.namespace', process.env.K8S_NAMESPACE || 'default');
    
    res.json({ 
      message: 'OpenTelemetry Express App on Kubernetes',
      pod: process.env.K8S_POD_NAME || 'unknown',
      node: process.env.K8S_NODE_NAME || 'unknown',
      namespace: process.env.K8S_NAMESPACE || 'default',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    span.end();
  }
});

// Simulate database query
async function simulateDatabaseQuery(userId) {
  const tracer = trace.getTracer('express-otel-k8s-app');
  const span = tracer.startSpan('database.query');
  
  try {
    span.setAttribute('db.system', 'postgresql');
    span.setAttribute('db.operation', 'SELECT');
    span.setAttribute('db.statement', 'SELECT * FROM users WHERE id = $1');
    span.setAttribute('user.id', userId);
    
    // จำลอง database latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    span.addEvent('query_completed');
    return {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      pod: process.env.K8S_POD_NAME || 'unknown'
    };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

// Simulate external API call
async function callExternalAPI(service) {
  const tracer = trace.getTracer('express-otel-k8s-app');
  const span = tracer.startSpan('external.api.call');
  
  try {
    span.setAttribute('peer.service', service);
    span.setAttribute('http.method', 'GET');
    
    // จำลอง API latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    // สุ่มว่าจะสำเร็จหรือไม่ (90% success rate)
    if (Math.random() < 0.9) {
      span.setAttribute('http.status_code', 200);
      span.addEvent('api_call_success');
      return { status: 'success', data: 'API response data' };
    } else {
      throw new Error('External API timeout');
    }
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.setAttribute('http.status_code', 500);
    throw error;
  } finally {
    span.end();
  }
}

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  const tracer = trace.getTracer('express-otel-k8s-app');
  const span = tracer.startSpan('get-user-by-id');
  
  try {
    const userId = req.params.id;
    span.setAttribute('user.id', userId);
    span.setAttribute('http.route', '/api/users/:id');
    
    // Query database
    const user = await simulateDatabaseQuery(userId);
    
    // Call external service (เช่น authentication service)
    try {
      await callExternalAPI('auth-service');
    } catch (error) {
      // Log error แต่ไม่ fail request
      console.error('External API call failed:', error.message);
      span.addEvent('external_api_error', { 'error.message': error.message });
    }
    
    span.addEvent('user_retrieved');
    res.json(user);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    span.end();
  }
});

// Process data endpoint
app.post('/api/process', async (req, res) => {
  const tracer = trace.getTracer('express-otel-k8s-app');
  const span = tracer.startSpan('process-data');
  
  try {
    const data = req.body.data || 'default data';
    
    span.setAttribute('data.length', data.length);
    span.setAttribute('data.type', typeof data);
    
    // จำลองการประมวลผล
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
    
    const result = {
      processed: `Processed: ${data}`,
      pod: process.env.K8S_POD_NAME || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    span.addEvent('data_processed', {
      'processing.time': Date.now(),
      'result.size': JSON.stringify(result).length
    });
    
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});

// Simulate slow endpoint (สำหรับทดสอบ performance monitoring)
app.get('/api/slow', async (req, res) => {
  const tracer = trace.getTracer('express-otel-k8s-app');
  const span = tracer.startSpan('slow-endpoint');
  
  try {
    span.setAttribute('endpoint.type', 'slow');
    
    // สุ่มเวลา 1-3 วินาที
    const delay = Math.random() * 2000 + 1000;
    span.setAttribute('delay.ms', delay);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    res.json({ 
      message: 'This was intentionally slow',
      delay: `${delay.toFixed(0)}ms`,
      pod: process.env.K8S_POD_NAME || 'unknown'
    });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    span.end();
  }
});

// Simulate error endpoint (สำหรับทดสอบ error tracking)
app.get('/api/error', (req, res) => {
  const tracer = trace.getTracer('express-otel-k8s-app');
  const span = tracer.startSpan('error-endpoint');
  
  try {
    span.setAttribute('endpoint.type', 'error');
    
    // สร้าง error จงใจ
    throw new Error('This is a simulated error for testing');
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ 
      error: error.message,
      pod: process.env.K8S_POD_NAME || 'unknown'
    });
  } finally {
    span.end();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  }
  
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server Information:');
  console.log(`   URL: http://0.0.0.0:${PORT}`);
  console.log(`   Pod: ${process.env.K8S_POD_NAME || 'unknown'}`);
  console.log(`   Node: ${process.env.K8S_NODE_NAME || 'unknown'}`);
  console.log(`   Namespace: ${process.env.K8S_NAMESPACE || 'default'}`);
  console.log('📊 OpenTelemetry enabled and sending data to collector');
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
