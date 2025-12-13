const { trace, context } = require('@opentelemetry/api');
const { logger } = require('./tracing');

/**
 * Enhanced logger ที่รวม trace ID และ span ID เข้าไปใน logs
 * เพื่อให้ Grafana สามารถ correlate ระหว่าง traces และ logs ได้
 */
class CorrelatedLogger {
  constructor() {
    this.otelLogger = logger;
  }

  /**
   * ดึง trace context ปัจจุบัน
   */
  getTraceContext() {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        trace_flags: spanContext.traceFlags,
      };
    }
    return {};
  }

  /**
   * Log ข้อมูลพร้อม trace context
   */
  log(level, message, attributes = {}) {
    const traceContext = this.getTraceContext();
    const logAttributes = {
      ...attributes,
      ...traceContext,
    };

    // ส่งไปยัง OpenTelemetry Logger
    this.otelLogger.emit({
      severityText: level.toUpperCase(),
      body: message,
      attributes: logAttributes,
    });

    // แสดงใน console พร้อม trace ID (สำหรับ debug)
    const traceInfo = traceContext.trace_id 
      ? ` [trace_id=${traceContext.trace_id}]` 
      : '';
    console.log(`[${level.toUpperCase()}]${traceInfo} ${message}`, logAttributes);
  }

  info(message, attributes) {
    this.log('info', message, attributes);
  }

  error(message, attributes) {
    this.log('error', message, attributes);
  }

  warn(message, attributes) {
    this.log('warn', message, attributes);
  }

  debug(message, attributes) {
    this.log('debug', message, attributes);
  }
}

module.exports = new CorrelatedLogger();
