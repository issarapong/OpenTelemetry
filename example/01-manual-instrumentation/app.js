const express = require('express');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const { SeverityNumber } = require('@opentelemetry/api-logs');

// โหลด tracing setup
const { logger } = require('./tracing');

const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());

// Manual instrumentation สำหรับ HTTP requests
// เนื่องจากไม่ใช้ auto-instrumentation ต้องสร้าง span เองทุก request
app.use((req, res, next) => {
  const tracer = trace.getTracer('manual-instrumentation-example');
  const span = tracer.startSpan(`HTTP ${req.method} ${req.path}`, {
    kind: 1, // SpanKind.SERVER
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.get('host'),
      'http.user_agent': req.get('user-agent'),
    },
  });

  // Log incoming request
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: `Incoming ${req.method} request to ${req.path}`,
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.path': req.path,
    },
  });

  // เก็บ span ไว้ใน request object
  req.span = span;

  // สร้าง context และส่งต่อ
  const ctx = trace.setSpan(context.active(), span);
  
  // Intercept response เพื่อบันทึก status code และปิด span
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

  // ทำงานใน context ที่มี span
  context.with(ctx, () => {
    next();
  });
});

// ฟังก์ชันตัวอย่างสำหรับสร้าง custom span
function processData(data) {
  const tracer = trace.getTracer('manual-instrumentation-example');
  const span = tracer.startSpan('processData', {
    attributes: {
      'operation.type': 'data-processing',
    },
  });
  
  // ใช้ context.with เพื่อให้ span นี้เป็น active span
  return context.with(trace.setSpan(context.active(), span), () => {
    try {
      console.log('Processing data:', data);
      
      // เพิ่ม attributes ให้กับ span
      span.setAttribute('data.length', data.length);
      span.setAttribute('data.type', typeof data);
      
      // เพิ่ม event
      span.addEvent('data_processed', {
        'processing.time': Date.now(),
        'data.sample': data.substring(0, 10),
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return `Processed: ${data}`;
    } catch (error) {
      // บันทึก error
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

// จำลองการเรียก external service
async function callExternalService(userId) {
  const tracer = trace.getTracer('manual-instrumentation-example');
  const span = tracer.startSpan('callExternalService', {
    kind: 3, // SpanKind.CLIENT
    attributes: {
      'service.name': 'user-service',
      'user.id': userId,
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      span.addEvent('service_call_started');
      
      // จำลองการเรียก API
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const userData = {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        status: 'active',
      };
      
      span.addEvent('service_call_completed', {
        'response.size': JSON.stringify(userData).length,
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return userData;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

// Routes
app.get('/', (req, res) => {
  // สร้าง child span สำหรับการทำงานเฉพาะ
  const tracer = trace.getTracer('manual-instrumentation-example');
  const span = tracer.startSpan('handleRootRequest');
  
  context.with(trace.setSpan(context.active(), span), () => {
    span.addEvent('preparing_response');
    
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: 'Root endpoint accessed',
      attributes: {
        'handler': 'handleRootRequest',
      },
    });
    
    const response = {
      message: 'OpenTelemetry Manual-Instrumentation Example',
      description: 'ทุก span ถูกสร้างด้วย manual code - ควบคุมได้เต็มที่ + Logs support',
      timestamp: new Date().toISOString(),
    };
    
    span.setAttribute('response.size', JSON.stringify(response).length);
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    
    res.json(response);
  });
});

app.get('/api/users/:id', async (req, res) => {
  const tracer = trace.getTracer('manual-instrumentation-example');
  const span = tracer.startSpan('getUserById', {
    attributes: {
      'user.id': req.params.id,
      'operation': 'get-user',
    },
  });
  
  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const userId = req.params.id;
      
      logger.emit({
        severityNumber: SeverityNumber.INFO,
        severityText: 'INFO',
        body: `Fetching user with ID: ${userId}`,
        attributes: {
          'user.id': userId,
          'operation': 'getUserById',
        },
      });
      
      span.addEvent('validating_user_id');
      
      // จำลองการ validate
      if (!userId || userId.length === 0) {
        throw new Error('Invalid user ID');
      }
      
      // เรียก external service
      span.addEvent('calling_external_service');
      const user = await callExternalService(userId);
      
      span.addEvent('user_found', {
        'user.name': user.name,
        'user.status': user.status,
      });
      
      logger.emit({
        severityNumber: SeverityNumber.INFO,
        severityText: 'INFO',
        body: `User found: ${userId}`,
        attributes: {
          'user.id': userId,
          'user.name': user.name,
          'user.email': user.email,
        },
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(user);
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: `Failed to fetch user: ${error.message}`,
        attributes: {
          'error.message': error.message,
          'error.stack': error.stack,
        },
      });
      
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      span.end();
    }
  });
});

app.post('/api/process', (req, res) => {
  const tracer = trace.getTracer('manual-instrumentation-example');
  const span = tracer.startSpan('processRequest', {
    attributes: {
      'http.method': 'POST',
      'endpoint': '/api/process',
    },
  });
  
  context.with(trace.setSpan(context.active(), span), () => {
    try {
      const inputData = req.body.data || 'default data';
      
      logger.emit({
        severityNumber: SeverityNumber.INFO,
        severityText: 'INFO',
        body: 'Processing data request',
        attributes: {
          'data': inputData,
          'endpoint': '/api/process',
        },
      });
      
      span.setAttribute('input.data', inputData);
      span.addEvent('processing_started');
      
      const result = processData(inputData);
      
      span.addEvent('processing_completed');
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      
      res.json({ result });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span.end();
      
      res.status(500).json({ error: error.message });
    }
  });
});

// Endpoint ที่มี nested spans หลายชั้น
app.get('/api/complex', async (req, res) => {
  const tracer = trace.getTracer('manual-instrumentation-example');
  const parentSpan = tracer.startSpan('complexOperation', {
    attributes: {
      'operation.complexity': 'high',
    },
  });
  
  await context.with(trace.setSpan(context.active(), parentSpan), async () => {
    try {
      parentSpan.addEvent('operation_started');
      
      // Step 1
      const step1Span = tracer.startSpan('step1-validation');
      await context.with(trace.setSpan(context.active(), step1Span), async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        step1Span.addEvent('validation_completed');
        step1Span.end();
      });
      
      // Step 2
      const step2Span = tracer.startSpan('step2-processing');
      await context.with(trace.setSpan(context.active(), step2Span), async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        step2Span.addEvent('processing_completed');
        step2Span.end();
      });
      
      // Step 3
      const step3Span = tracer.startSpan('step3-finalization');
      await context.with(trace.setSpan(context.active(), step3Span), async () => {
        await new Promise(resolve => setTimeout(resolve, 75));
        step3Span.addEvent('finalization_completed');
        step3Span.end();
      });
      
      parentSpan.addEvent('all_steps_completed');
      parentSpan.setStatus({ code: SpanStatusCode.OK });
      
      res.json({ 
        status: 'success',
        message: 'Complex operation completed',
        steps: ['validation', 'processing', 'finalization'],
      });
    } catch (error) {
      parentSpan.recordException(error);
      parentSpan.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      res.status(500).json({ error: error.message });
    } finally {
      parentSpan.end();
    }
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
  
  logger.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: `Unhandled error: ${err.message}`,
    attributes: {
      'error.message': err.message,
      'error.stack': err.stack,
    },
  });
  
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Manual-Instrumentation Example running on http://localhost:${PORT}`);
  console.log(`📊 Sending telemetry to OTLP collector at http://localhost:4318`);
  console.log(`✍️  ทุก span ถูกสร้างและควบคุมด้วย manual code`);
  console.log(`📝 Traces + 📈 Metrics + 🗒️  Logs enabled`);
  
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'Application started successfully',
    attributes: {
      'service.name': 'manual-instrumentation-example',
      'port': PORT,
    },
  });
});
