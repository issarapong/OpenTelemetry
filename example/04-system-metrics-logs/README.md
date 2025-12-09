# System Metrics and Logs Example

This example demonstrates comprehensive OpenTelemetry instrumentation with:
- **Host Metrics**: Automatic collection of system-level metrics (CPU, memory, disk, network)
- **Custom Application Metrics**: Counter, Histogram, UpDownCounter, and Observable Gauge
- **Structured Logging**: Correlation of logs with traces using TraceID
- **Load Simulation**: Endpoints to test CPU and memory monitoring
- **Full Observability Stack**: Jaeger, Prometheus, Grafana, and Loki

## Features

### 🖥️ Host Metrics (Automatic)
The `@opentelemetry/host-metrics` package automatically collects:
- CPU usage and load average
- Memory usage (total, free, used)
- Disk I/O operations
- Network traffic (bytes sent/received)

### 📊 Custom Application Metrics
- **Counter**: HTTP request counter by route and status code
- **Histogram**: Response time distribution
- **UpDownCounter**: Active connections tracking
- **Observable Gauge**: Real-time memory and CPU usage

### 📝 Structured Logs
- Correlated with traces using TraceID
- Multiple severity levels (DEBUG, INFO, WARN, ERROR)
- Stored in Grafana Loki for querying

## Architecture

```
┌─────────────┐
│   Express   │ Port 3003
│     App     │
└──────┬──────┘
       │ OTLP
       ▼
┌─────────────────┐
│ OpenTelemetry   │ Port 4317 (gRPC)
│   Collector     │ Port 4318 (HTTP)
└────┬────────────┘
     │
     ├─→ Traces  ──→ Jaeger      (Port 16686)
     ├─→ Metrics ──→ Prometheus  (Port 9090)
     └─→ Logs    ──→ Loki        (Port 3100) ──→ Grafana (Port 3000)
```

## API Endpoints

### System Information
```bash
# Get system information
curl http://localhost:3003/api/system
# Response: hostname, CPU count, memory, uptime, load average

# Get process information
curl http://localhost:3003/api/process
# Response: PID, memory usage, CPU usage, uptime
```

### Load Simulation
```bash
# Simulate CPU load for 5 seconds
curl "http://localhost:3003/api/load-cpu?duration=5000"

# Allocate 100MB of memory
curl "http://localhost:3003/api/load-memory?size=100"
```

### Log Generation
```bash
# Generate logs at all severity levels
curl -X POST http://localhost:3003/api/generate-logs \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'
```

## Quick Start

### 1. Start the Stack
```bash
cd /Volumes/Server/git-remote/github-issarapong/OpenTelemetry/example/system-metrics-logs
docker-compose up --build
```

### 2. Generate Traffic
```bash
# Normal requests
curl http://localhost:3003/api/system
curl http://localhost:3003/api/process

# Simulate load
curl "http://localhost:3003/api/load-cpu?duration=3000"
curl "http://localhost:3003/api/load-memory?size=50"

# Generate logs
curl -X POST http://localhost:3003/api/generate-logs \
  -H "Content-Type: application/json" \
  -d '{"count": 20}'
```

### 3. View Observability Data

#### Jaeger (Traces)
- URL: http://localhost:16686
- View traces with timing information
- See service dependencies

#### Prometheus (Metrics)
- URL: http://localhost:9090
- Query host metrics:
  ```promql
  system_cpu_utilization
  system_memory_usage
  system_network_io
  system_disk_io
  ```
- Query custom metrics:
  ```promql
  http_requests_total
  http_response_time_seconds
  active_connections
  app_memory_usage_bytes
  app_cpu_usage_percent
  ```

#### Grafana (Dashboards)
- URL: http://localhost:3000
- Default credentials: admin/admin
- Pre-configured data sources: Prometheus, Loki
- View metrics dashboards and logs

#### Loki (Logs)
Query logs in Grafana using LogQL:
```logql
# All logs from the app
{job="node-app"}

# Logs with specific severity
{job="node-app"} |= "ERROR"

# Logs with trace correlation
{job="node-app"} | json | traceId != ""
```

## Metrics Reference

### Host Metrics (Automatic)
| Metric | Description |
|--------|-------------|
| `system.cpu.utilization` | CPU usage percentage per core |
| `system.memory.usage` | Memory usage by state (used, free) |
| `system.network.io` | Network bytes transmitted/received |
| `system.disk.io` | Disk read/write operations |
| `system.cpu.load_average.1m` | 1-minute load average |
| `system.cpu.load_average.5m` | 5-minute load average |
| `system.cpu.load_average.15m` | 15-minute load average |

### Custom Application Metrics
| Metric | Type | Description |
|--------|------|-------------|
| `http.requests` | Counter | Total HTTP requests by route and status |
| `http.response.time` | Histogram | Response time distribution (seconds) |
| `http.active.connections` | UpDownCounter | Current active connections |
| `app.memory.usage` | Gauge | Application memory usage (bytes) |
| `app.cpu.usage` | Gauge | Application CPU usage (percentage) |

## Log Structure

Each log entry includes:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "severity": "INFO",
  "body": "Log message",
  "attributes": {
    "service.name": "system-metrics-logs",
    "trace_id": "abc123...",
    "span_id": "def456...",
    "http.method": "GET",
    "http.route": "/api/system"
  }
}
```

## Performance Testing

### Load Test Script
```bash
#!/bin/bash
# Generate load for 60 seconds

echo "Starting load test..."

for i in {1..60}; do
  # Normal requests (5 per second)
  for j in {1..5}; do
    curl -s http://localhost:3003/api/system > /dev/null &
  done
  
  # CPU load every 10 seconds
  if [ $((i % 10)) -eq 0 ]; then
    curl -s "http://localhost:3003/api/load-cpu?duration=2000" > /dev/null &
  fi
  
  # Memory allocation every 15 seconds
  if [ $((i % 15)) -eq 0 ]; then
    curl -s "http://localhost:3003/api/load-memory?size=30" > /dev/null &
  fi
  
  # Generate logs every 20 seconds
  if [ $((i % 20)) -eq 0 ]; then
    curl -s -X POST http://localhost:3003/api/generate-logs \
      -H "Content-Type: application/json" \
      -d '{"count": 10}' > /dev/null &
  fi
  
  sleep 1
done

echo "Load test complete. Check observability tools for metrics."
```

## Troubleshooting

### Metrics Not Showing
1. Check OpenTelemetry Collector logs:
   ```bash
   docker-compose logs otel-collector
   ```
2. Verify Prometheus targets: http://localhost:9090/targets

### Logs Not Appearing
1. Check Loki is running:
   ```bash
   docker-compose ps loki
   ```
2. Verify Grafana data source configuration

### High Memory Usage
- Host metrics collection adds ~50-100MB overhead
- Adjust batch processor settings in `otel-collector-config.yaml`

## Configuration Files

- `otel-collector-config.yaml`: OpenTelemetry Collector configuration
- `prometheus.yml`: Prometheus scrape configuration
- `docker-compose.yml`: Full stack deployment
- `tracing.js`: OpenTelemetry SDK initialization
- `app.js`: Express application with monitoring endpoints

## Dependencies

```json
{
  "@opentelemetry/api": "^1.7.0",
  "@opentelemetry/sdk-node": "^0.45.0",
  "@opentelemetry/host-metrics": "^0.35.0",
  "@opentelemetry/api-logs": "^0.45.0",
  "@opentelemetry/sdk-logs": "^0.45.0",
  "@opentelemetry/instrumentation-express": "^0.34.0",
  "@opentelemetry/instrumentation-http": "^0.45.0",
  "express": "^4.18.2",
  "winston": "^3.11.0",
  "prom-client": "^15.1.0"
}
```

## Next Steps

1. **Custom Dashboards**: Create Grafana dashboards for your specific metrics
2. **Alerting**: Set up Prometheus alerts for critical metrics
3. **Log Aggregation**: Use Loki labels for advanced filtering
4. **Distributed Tracing**: Connect multiple services (see `02-distributed-tracing`)
5. **Production Setup**: Use persistent volumes for metrics and logs storage

## Related Examples

- `00-auto-instrumentation`: Automatic OpenTelemetry instrumentation
- `01-manual-instrumentation`: Manual span and metric creation
- `02-distributed-tracing`: Multi-service tracing with logs correlation

## References

- [OpenTelemetry Host Metrics](https://www.npmjs.com/package/@opentelemetry/host-metrics)
- [OpenTelemetry Logs](https://opentelemetry.io/docs/concepts/signals/logs/)
- [Grafana Loki LogQL](https://grafana.com/docs/loki/latest/logql/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
