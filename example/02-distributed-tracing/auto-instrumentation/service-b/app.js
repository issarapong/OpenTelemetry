// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const axios = require('axios');
const { trace } = require('@opentelemetry/api');

const app = express();
const PORT = 3011;

const SERVICE_C_URL = process.env.SERVICE_C_URL || 'http://localhost:3012';

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    console.log(`[Service B] ${req.method} ${req.path} - TraceID: ${spanContext.traceId}`);
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    service: 'Service B - Backend API',
    message: 'Auto-Instrumentation Distributed Tracing',
    timestamp: new Date().toISOString()
  });
});

// Endpoint ที่เรียก Service C
app.get('/api/inventory/:id', async (req, res) => {
  const tracer = trace.getTracer('service-b-auto');
  const span = tracer.startSpan('checkInventory');
  
  try {
    const inventoryId = req.params.id;
    span.setAttribute('inventory.id', inventoryId);
    
    console.log(`[Service B] Checking inventory: ${inventoryId}`);
    
    // จำลองการ process
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // เรียก Service C - context จะถูก propagate อัตโนมัติ
    span.addEvent('calling_service_c');
    const stockResponse = await axios.get(`${SERVICE_C_URL}/api/stock/${inventoryId}`);
    
    span.addEvent('service_c_responded');
    
    const result = {
      inventoryId: inventoryId,
      available: true,
      stock: stockResponse.data,
      checkedAt: new Date().toISOString(),
    };
    
    span.setAttribute('inventory.available', true);
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    console.error(`[Service B] Error: ${error.message}`);
    res.status(500).json({ error: 'Failed to check inventory' });
  } finally {
    span.end();
  }
});

// Endpoint สำหรับ summary (ไม่เรียก service อื่น)
app.get('/api/inventory/summary', async (req, res) => {
  const tracer = trace.getTracer('service-b-auto');
  const span = tracer.startSpan('getInventorySummary');
  
  try {
    console.log('[Service B] Getting inventory summary');
    
    // จำลองการ query database
    await new Promise(resolve => setTimeout(resolve, 30));
    
    const result = {
      total: 1250,
      available: 980,
      reserved: 200,
      lowStock: 70,
    };
    
    span.setAttribute('inventory.total', result.total);
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to get summary' });
  } finally {
    span.end();
  }
});

// Endpoint สำหรับ status
app.get('/api/inventory/status', async (req, res) => {
  const tracer = trace.getTracer('service-b-auto');
  const span = tracer.startSpan('getInventoryStatus');
  
  try {
    console.log('[Service B] Getting inventory status');
    
    await new Promise(resolve => setTimeout(resolve, 20));
    
    const result = {
      status: 'operational',
      lastSync: new Date().toISOString(),
      health: 'good',
    };
    
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to get status' });
  } finally {
    span.end();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Service B',
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
  
  console.error(`[Service B] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Service B] Auto-Instrumentation running on http://localhost:${PORT}`);
  console.log(`📡 [Service B] Will connect to Service C at ${SERVICE_C_URL}`);
  console.log(`✨ [Service B] Receiving and forwarding trace context automatically`);
});
