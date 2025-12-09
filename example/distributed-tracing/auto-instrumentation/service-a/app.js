// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const axios = require('axios');
const { trace, context } = require('@opentelemetry/api');

const app = express();
const PORT = 3010;

const SERVICE_B_URL = process.env.SERVICE_B_URL || 'http://localhost:3011';

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    console.log(`[Service A] ${req.method} ${req.path} - TraceID: ${spanContext.traceId}`);
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    service: 'Service A - Frontend API',
    message: 'Auto-Instrumentation Distributed Tracing',
    description: 'HTTP requests ถูก propagate อัตโนมัติ',
    timestamp: new Date().toISOString()
  });
});

// Endpoint ที่เรียก Service B (auto-propagation)
app.get('/api/orders/:id', async (req, res) => {
  const tracer = trace.getTracer('service-a-auto');
  const span = tracer.startSpan('handleOrderRequest');
  
  try {
    const orderId = req.params.id;
    span.setAttribute('order.id', orderId);
    span.addEvent('processing_order_request');
    
    console.log(`[Service A] Processing order: ${orderId}`);
    
    // เรียก Service B - context จะถูก propagate อัตโนมัติผ่าน HTTP headers
    span.addEvent('calling_service_b');
    const response = await axios.get(`${SERVICE_B_URL}/api/inventory/${orderId}`);
    
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
    };
    
    span.setAttribute('order.status', 'success');
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    console.error(`[Service A] Error: ${error.message}`);
    res.status(500).json({ 
      error: 'Failed to process order',
      message: error.message,
    });
  } finally {
    span.end();
  }
});

// Endpoint ที่เรียกหลาย services พร้อมกัน
app.get('/api/dashboard', async (req, res) => {
  const tracer = trace.getTracer('service-a-auto');
  const span = tracer.startSpan('getDashboardData');
  
  try {
    span.addEvent('fetching_dashboard_data');
    console.log('[Service A] Fetching dashboard data');
    
    // เรียกหลาย endpoints พร้อมกัน
    const [orders, inventory] = await Promise.all([
      axios.get(`${SERVICE_B_URL}/api/inventory/summary`),
      axios.get(`${SERVICE_B_URL}/api/inventory/status`),
    ]);
    
    span.addEvent('all_services_responded');
    
    const result = {
      dashboard: {
        orders: orders.data,
        inventory: inventory.data,
        lastUpdated: new Date().toISOString(),
      },
    };
    
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    console.error(`[Service A] Dashboard error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  } finally {
    span.end();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Service A',
    status: 'healthy',
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message });
  }
  
  console.error(`[Service A] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Service A] Auto-Instrumentation running on http://localhost:${PORT}`);
  console.log(`📡 [Service A] Will connect to Service B at ${SERVICE_B_URL}`);
  console.log(`✨ [Service A] Context propagation is automatic via HTTP headers`);
});
