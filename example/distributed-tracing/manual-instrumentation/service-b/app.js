// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const axios = require('axios');
const { trace, context, propagation, SpanStatusCode, SpanKind } = require('@opentelemetry/api');

const app = express();
const PORT = 3021;

const SERVICE_C_URL = process.env.SERVICE_C_URL || 'http://localhost:3022';

// Middleware
app.use(express.json());

// Manual HTTP tracing middleware
app.use((req, res, next) => {
  const tracer = trace.getTracer('service-b-manual');
  
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
  console.log(`[Service B Manual] ${req.method} ${req.path} - TraceID: ${spanContext.traceId}`);

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

// ฟังก์ชันสำหรับเรียก HTTP โดย manual inject context
async function callServiceWithContext(url, method = 'GET', data = null) {
  const tracer = trace.getTracer('service-b-manual');
  const span = tracer.startSpan(`HTTP ${method} ${url}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': method,
      'http.url': url,
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      // Manual inject context ไปยัง headers
      const headers = {};
      propagation.inject(context.active(), headers);
      
      span.addEvent('request_sent');
      
      const config = {
        method: method,
        url: url,
        headers: headers,
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      
      span.setAttribute('http.status_code', response.status);
      span.addEvent('response_received');
      span.setStatus({ code: SpanStatusCode.OK });
      
      return response;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

// Routes
app.get('/', (req, res) => {
  const tracer = trace.getTracer('service-b-manual');
  const span = tracer.startSpan('handleRootRequest');
  
  context.with(trace.setSpan(context.active(), span), () => {
    res.json({ 
      service: 'Service B - Backend API',
      message: 'Manual-Instrumentation Distributed Tracing',
      timestamp: new Date().toISOString()
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  });
});

// Endpoint ที่เรียก Service C
app.get('/api/inventory/:id', async (req, res) => {
  const tracer = trace.getTracer('service-b-manual');
  const span = tracer.startSpan('checkInventory', {
    attributes: {
      'inventory.id': req.params.id,
    },
  });
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const inventoryId = req.params.id;
      
      console.log(`[Service B Manual] Checking inventory: ${inventoryId}`);
      
      // จำลองการ process
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // เรียก Service C โดย manual inject context
      span.addEvent('calling_service_c');
      const stockResponse = await callServiceWithContext(
        `${SERVICE_C_URL}/api/stock/${inventoryId}`,
        'GET'
      );
      
      span.addEvent('service_c_responded');
      
      const result = {
        inventoryId: inventoryId,
        available: true,
        stock: stockResponse.data,
        checkedAt: new Date().toISOString(),
      };
      
      span.setAttribute('inventory.available', true);
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      console.error(`[Service B Manual] Error: ${error.message}`);
      res.status(500).json({ error: 'Failed to check inventory' });
    } finally {
      span.end();
    }
  });
});

// Endpoint สำหรับ summary (ไม่เรียก service อื่น)
app.get('/api/inventory/summary', async (req, res) => {
  const tracer = trace.getTracer('service-b-manual');
  const span = tracer.startSpan('getInventorySummary');
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      console.log('[Service B Manual] Getting inventory summary');
      
      // จำลองการ query database
      await new Promise(resolve => setTimeout(resolve, 30));
      
      const result = {
        total: 1250,
        available: 980,
        reserved: 200,
        lowStock: 70,
      };
      
      span.setAttribute('inventory.total', result.total);
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      res.status(500).json({ error: 'Failed to get summary' });
    } finally {
      span.end();
    }
  });
});

// Endpoint สำหรับ status
app.get('/api/inventory/status', async (req, res) => {
  const tracer = trace.getTracer('service-b-manual');
  const span = tracer.startSpan('getInventoryStatus');
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      console.log('[Service B Manual] Getting inventory status');
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const result = {
        status: 'operational',
        lastSync: new Date().toISOString(),
        health: 'good',
      };
      
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      res.status(500).json({ error: 'Failed to get status' });
    } finally {
      span.end();
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Service B Manual',
    status: 'healthy',
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
  
  console.error(`[Service B Manual] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Service B Manual] Manual-Instrumentation running on http://localhost:${PORT}`);
  console.log(`📡 [Service B Manual] Will connect to Service C at ${SERVICE_C_URL}`);
  console.log(`✍️  [Service B Manual] Context extract/inject done manually`);
});
