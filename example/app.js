// โหลด tracing ก่อนทุกอย่าง
require('./tracing');

const express = require('express');
const { trace, context } = require('@opentelemetry/api');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// ฟังก์ชันตัวอย่างสำหรับสร้าง custom span
function processData(data) {
  const tracer = trace.getTracer('my-express-app');
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
  res.json({ 
    message: 'OpenTelemetry Express App',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users/:id', async (req, res) => {
  const tracer = trace.getTracer('my-express-app');
  const span = tracer.startSpan('getUserById');
  
  try {
    const userId = req.params.id;
    span.setAttribute('user.id', userId);
    
    // จำลองการดึงข้อมูลจากฐานข้อมูล
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const user = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`
    };
    
    span.addEvent('user_found');
    res.json(user);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    span.end();
  }
});

app.post('/api/process', (req, res) => {
  try {
    const result = processData(req.body.data || 'default data');
    res.json({ result });
  } catch (error) {
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
  
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Sending traces to OTLP collector at http://localhost:4318`);
});
