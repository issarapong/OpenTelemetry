// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const axios = require('axios');
const { trace, context, propagation, SpanStatusCode, SpanKind } = require('@opentelemetry/api');

const app = express();
const PORT = 3020;

const SERVICE_B_URL = process.env.SERVICE_B_URL || 'http://localhost:3021';

// Middleware
app.use(express.json());

// Manual HTTP tracing middleware - สร้าง span สำหรับทุก request
app.use((req, res, next) => {
  const tracer = trace.getTracer('service-a-manual');
  
  // Extract context จาก incoming request headers (สำหรับกรณีที่มี upstream service)
  const extractedContext = propagation.extract(context.active(), req.headers);
  
  const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.get('host'),
    },
  }, extractedContext);

  const spanContext = span.spanContext();
  console.log(`[Service A Manual] ${req.method} ${req.path} - TraceID: ${spanContext.traceId}`);

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
  const tracer = trace.getTracer('service-a-manual');
  const span = tracer.startSpan(`HTTP ${method} ${url}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': method,
      'http.url': url,
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      // สร้าง headers object และ inject trace context
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
  const tracer = trace.getTracer('service-a-manual');
  const span = tracer.startSpan('handleRootRequest');
  
  context.with(trace.setSpan(context.active(), span), () => {
    res.json({ 
      service: 'Service A - Frontend API',
      message: 'Manual-Instrumentation Distributed Tracing',
      description: 'Context ถูก inject และ extract ด้วยโค้ดที่เขียนเอง',
      timestamp: new Date().toISOString()
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  });
});

// Endpoint ที่เรียก Service B (manual propagation)
app.get('/api/orders/:id', async (req, res) => {
  const tracer = trace.getTracer('service-a-manual');
  const span = tracer.startSpan('handleOrderRequest', {
    attributes: {
      'order.id': req.params.id,
    },
  });
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const orderId = req.params.id;
      
      console.log(`[Service A Manual] Processing order: ${orderId}`);
      span.addEvent('processing_order_request');
      
      // เรียก Service B โดย manual inject context
      span.addEvent('calling_service_b');
      const response = await callServiceWithContext(
        `${SERVICE_B_URL}/api/inventory/${orderId}`,
        'GET'
      );
      
      span.addEvent('service_b_responded', {
        'response.status': response.status,
      });
      
      const result = {
        order: {
          id: orderId,
          status: 'processing',
          inventory: response.data,
        },
        timestamp: new Date().toISOString(),
        traceId: span.spanContext().traceId,
      };
      
      span.setAttribute('order.status', 'success');
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      console.error(`[Service A Manual] Error: ${error.message}`);
      res.status(500).json({ 
        error: 'Failed to process order',
        message: error.message,
      });
    } finally {
      span.end();
    }
  });
});

// Endpoint ที่เรียกหลาย services พร้อมกัน
app.get('/api/dashboard', async (req, res) => {
  const tracer = trace.getTracer('service-a-manual');
  const span = tracer.startSpan('getDashboardData');
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      span.addEvent('fetching_dashboard_data');
      console.log('[Service A Manual] Fetching dashboard data');
      
      // เรียกหลาย endpoints พร้อมกัน - แต่ละ call จะมี span เป็นของตัวเอง
      const [orders, inventory] = await Promise.all([
        callServiceWithContext(`${SERVICE_B_URL}/api/inventory/summary`, 'GET'),
        callServiceWithContext(`${SERVICE_B_URL}/api/inventory/status`, 'GET'),
      ]);
      
      span.addEvent('all_services_responded');
      
      const result = {
        dashboard: {
          orders: orders.data,
          inventory: inventory.data,
          lastUpdated: new Date().toISOString(),
        },
      };
      
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      console.error(`[Service A Manual] Dashboard error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    } finally {
      span.end();
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Service A Manual',
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
  
  console.error(`[Service A Manual] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Service A Manual] Manual-Instrumentation running on http://localhost:${PORT}`);
  console.log(`📡 [Service A Manual] Will connect to Service B at ${SERVICE_B_URL}`);
  console.log(`✍️  [Service A Manual] Context propagation via manual inject/extract`);
});
