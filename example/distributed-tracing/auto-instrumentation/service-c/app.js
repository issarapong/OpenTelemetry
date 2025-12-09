// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();
const PORT = 3012;

// Middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    console.log(`[Service C] ${req.method} ${req.path} - TraceID: ${spanContext.traceId}`);
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    service: 'Service C - Database Service',
    message: 'Auto-Instrumentation Distributed Tracing',
    timestamp: new Date().toISOString()
  });
});

// Endpoint สำหรับตรวจสอบ stock
app.get('/api/stock/:id', async (req, res) => {
  const tracer = trace.getTracer('service-c-auto');
  const span = tracer.startSpan('queryStock');
  
  try {
    const stockId = req.params.id;
    span.setAttribute('stock.id', stockId);
    
    console.log(`[Service C] Querying stock: ${stockId}`);
    
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
    
    console.log(`[Service C] Stock found: ${result.quantity} units`);
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    console.error(`[Service C] Error: ${error.message}`);
    res.status(500).json({ error: 'Failed to query stock' });
  } finally {
    span.end();
  }
});

// Endpoint สำหรับ batch query
app.post('/api/stock/batch', async (req, res) => {
  const tracer = trace.getTracer('service-c-auto');
  const span = tracer.startSpan('batchQueryStock');
  
  try {
    const stockIds = req.body.ids || [];
    span.setAttribute('batch.size', stockIds.length);
    
    console.log(`[Service C] Batch querying ${stockIds.length} stocks`);
    
    // จำลองการ query หลายรายการ
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const results = stockIds.map(id => ({
      stockId: id,
      quantity: Math.floor(Math.random() * 100) + 1,
      location: 'Warehouse A',
    }));
    
    res.json({ stocks: results });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Failed to batch query' });
  } finally {
    span.end();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Service C',
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
    span.setStatus({ code: 2, message: err.message });
  }
  
  console.error(`[Service C] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Service C] Auto-Instrumentation running on http://localhost:${PORT}`);
  console.log(`💾 [Service C] Database service ready`);
  console.log(`✨ [Service C] Receiving trace context automatically`);
});
