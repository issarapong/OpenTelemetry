// app.js
const express = require('express');
const { metrics, trace, context } = require('@opentelemetry/api');

const app = express();
const meter = metrics.getMeter('lab-meter');

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Cache Eviction Metric
// ใช้ Counter (Monotonic) เพราะเป็นการนับสะสม (เพิ่มอย่างเดียว)
// ---------------------------------------------------------
const evictionCounter = meter.createCounter('cache_eviction_total', {
  description: 'Counts cache evictions',
});

// ---------------------------------------------------------
// 🎯 เฉลยข้อ: Metrics to Traces Correlation
// ใช้ Histogram เพื่อดู Latency และ OTel จะแปะ "Exemplar" (Trace ID)
// มาให้ใน Histogram Bucket อัตโนมัติ (ถ้ามีการ Sampling)
// ---------------------------------------------------------
const processingHistogram = meter.createHistogram('http_request_duration_ms', {
  description: 'Request latency',
});

app.get('/run', (req, res) => {
  // 🎯 เฉลยข้อ: W3C Header
  // ดู Log นี้เพื่อเห็นหน้าตาของ 'traceparent' ที่ส่งมา
  console.log('📡 Context Header (traceparent):', req.headers.traceparent);

  const span = trace.getTracer('handler').startSpan('process-request');
  
  // จำลอง Cache Eviction
  evictionCounter.add(1);

  // จำลอง Latency
  const delay = Math.floor(Math.random() * 200);
  setTimeout(() => {
    processingHistogram.record(delay);
    span.end();
    res.send(`Done in ${delay}ms`);
  }, delay);
});

app.get('/error', (req, res) => {
  // 1. เริ่มสร้าง Span เอง
  const span = trace.getTracer('handler').startSpan('manual-error-span');
  
  // 2. ระบุว่า Span นี้คือ ERROR (Status Code 2 = Error)
  span.setStatus({ code: 2, message: 'Intentional Error' });
  
  // 3. จบ Span (ส่งข้อมูลออกไป)
  span.end();
  
  res.status(500).send('Boom! Error Trace Created.');
});

app.listen(3000, () => console.log('🚀 App running on 3000'));