// โหลด tracing ก่อนทุกอย่าง
require('./tracing');
const correlatedLogger = require('./logger');

const express = require('express');
const { trace } = require('@opentelemetry/api');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// ฟังก์ชันตัวอย่างสำหรับสร้าง custom span
function processData(data) {
  const tracer = trace.getTracer('auto-instrumentation-example');
  const span = tracer.startSpan('processData');
  
  try {
    // ทำงานบางอย่าง
    console.log('Processing data:', data);
    
    // เพิ่ม attributes ให้กับ span
    span.setAttribute('data.length', data.length);
    span.setAttribute('data.type', typeof data);
    
    // เพิ่ม event
    span.addEvent('data_processed', {
      'processing.time': Date.now(),
    });
    
    return `Processed: ${data}`;
  } catch (error) {
    // บันทึก error
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // ERROR status
    throw error;
  } finally {
    span.end();
  }
}

// Routes
app.get('/', (req, res) => {
  // Log with trace correlation
  correlatedLogger.info('Root endpoint accessed', {
    'http.method': req.method,
    'http.url': req.url,
  });

  res.json({ 
    message: 'OpenTelemetry Auto-Instrumentation Example',
    description: 'HTTP requests และ Express routes ถูก trace อัตโนมัติ + Logs support with correlation',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users/:id', async (req, res) => {
  const tracer = trace.getTracer('auto-instrumentation-example');
  const span = tracer.startSpan('getUserById');
  
  try {
    const userId = req.params.id;
    span.setAttribute('user.id', userId);
    
    // Log with trace correlation
    correlatedLogger.info(`Fetching user with ID: ${userId}`, {
      'user.id': userId,
      'operation': 'getUserById',
    });
    
    // จำลองการดึงข้อมูลจากฐานข้อมูล
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const user = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`
    };
    
    span.addEvent('user_found');
    
    correlatedLogger.info(`User found: ${userId}`, {
      'user.id': userId,
      'user.email': user.email,
    });
    
    res.json(user);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    
    // Log ERROR with trace correlation
    correlatedLogger.error(`Failed to fetch user: ${error.message}`, {
      'error.message': error.message,
      'error.stack': error.stack,
    });
    
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    span.end();
  }
});

app.post('/api/process', (req, res) => {
  try {
    correlatedLogger.info('Processing data request', {
      'http.method': req.method,
      'data': req.body.data || 'default data',
    });

    const result = processData(req.body.data || 'default data');
    res.json({ result });
  } catch (error) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: `Failed to process data: ${error.message}`,
      attributes: {
        'error.message': error.message,
      },
    });
    
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message });
  }
  
  // Log ERROR
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
  console.log(`🚀 Auto-Instrumentation Example running on http://localhost:${PORT}`);
  console.log(`📊 Sending telemetry to OTLP collector at http://otel-collector:4318`);
  console.log(`✨ Express และ HTTP requests ถูก instrument อัตโนมัติ`);
  console.log(`📝 Traces + 📈 Metrics + 🗒️  Logs enabled`);
  
  correlatedLogger.info('Application started successfully', {
    'service.name': 'auto-instrumentation-example',
    'port': PORT,
  });
});
