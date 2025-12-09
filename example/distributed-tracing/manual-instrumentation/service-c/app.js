// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const { trace, context, propagation, SpanStatusCode, SpanKind } = require('@opentelemetry/api');

const app = express();
const PORT = 3022;

// Middleware
app.use(express.json());

// Manual HTTP tracing middleware
app.use((req, res, next) => {
  const tracer = trace.getTracer('service-c-manual');
  
  // Extract context จาก incoming request headers
  const extractedContext = propagation.extract(context.active(), req.headers);
  
  const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
    },
  }, extractedContext);

  const spanContext = span.spanContext();
  console.log(`[Service C Manual] ${req.method} ${req.path} - TraceID: ${spanContext.traceId}`);

  req.span = span;

  const originalSend = res.send;
  res.send = function(data) {
    span.setAttribute('http.status_code', res.statusCode);
    
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`,
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    
    span.end();
    return originalSend.call(this, data);
  };

  context.with(trace.setSpan(extractedContext, span), () => {
    next();
  });
});

// Routes
app.get('/', (req, res) => {
  const tracer = trace.getTracer('service-c-manual');
  const span = tracer.startSpan('handleRootRequest');
  
  context.with(trace.setSpan(context.active(), span), () => {
    res.json({ 
      service: 'Service C - Database Service',
      message: 'Manual-Instrumentation Distributed Tracing',
      timestamp: new Date().toISOString()
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  });
});

// Endpoint สำหรับตรวจสอบ stock
app.get('/api/stock/:id', async (req, res) => {
  const tracer = trace.getTracer('service-c-manual');
  const span = tracer.startSpan('queryStock', {
    attributes: {
      'stock.id': req.params.id,
    },
  });
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const stockId = req.params.id;
      
      console.log(`[Service C Manual] Querying stock: ${stockId}`);
      
      // จำลองการ query database
      span.addEvent('database_query_started');
      await new Promise(resolve => setTimeout(resolve, 80));
      span.addEvent('database_query_completed');
      
      const result = {
        stockId: stockId,
        quantity: Math.floor(Math.random() * 100) + 1,
        location: 'Warehouse A',
        lastUpdated: new Date().toISOString(),
      };
      
      span.setAttribute('stock.quantity', result.quantity);
      span.setAttribute('stock.location', result.location);
      
      console.log(`[Service C Manual] Stock found: ${result.quantity} units`);
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      console.error(`[Service C Manual] Error: ${error.message}`);
      res.status(500).json({ error: 'Failed to query stock' });
    } finally {
      span.end();
    }
  });
});

// Endpoint สำหรับ batch query
app.post('/api/stock/batch', async (req, res) => {
  const tracer = trace.getTracer('service-c-manual');
  const span = tracer.startSpan('batchQueryStock', {
    attributes: {
      'batch.size': req.body.ids ? req.body.ids.length : 0,
    },
  });
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const stockIds = req.body.ids || [];
      
      console.log(`[Service C Manual] Batch querying ${stockIds.length} stocks`);
      
      // จำลองการ query หลายรายการ
      span.addEvent('batch_query_started');
      await new Promise(resolve => setTimeout(resolve, 100));
      span.addEvent('batch_query_completed');
      
      const results = stockIds.map(id => ({
        stockId: id,
        quantity: Math.floor(Math.random() * 100) + 1,
        location: 'Warehouse A',
      }));
      
      span.setStatus({ code: SpanStatusCode.OK });
      res.json({ stocks: results });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      res.status(500).json({ error: 'Failed to batch query' });
    } finally {
      span.end();
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Service C Manual',
    status: 'healthy',
    database: 'connected',
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: err.message 
    });
  }
  
  console.error(`[Service C Manual] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Service C Manual] Manual-Instrumentation running on http://localhost:${PORT}`);
  console.log(`💾 [Service C Manual] Database service ready`);
  console.log(`✍️  [Service C Manual] Context extracted manually from headers`);
});
