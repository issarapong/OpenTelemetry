# Full Stack Tracing Demo - Frontend to Backend to Database

ตัวอย่างการติดตาม trace แบบ end-to-end จาก Frontend Client → Backend API → Database โดยใช้ OpenTelemetry

## 🏗️ Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Frontend       │      │  Backend API    │      │  PostgreSQL     │
│  (HTML/JS)      │─────▶│  (Express.js)   │─────▶│  Database       │
│  Port: 8080     │      │  Port: 3001     │      │  Port: 5432     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                        │                         │
         │                        │                         │
         └────────────────────────┼─────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  OpenTelemetry Collector │
                    │  Port: 4318 (HTTP)       │
                    │  Port: 4317 (gRPC)       │
                    └──────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
         ┌─────────────────┐        ┌─────────────────┐
         │  Jaeger UI      │        │  Prometheus     │
         │  Port: 16686    │        │  Port: 9090     │
         └─────────────────┘        └─────────────────┘
```

## 📋 Components

### 1. **Frontend Client** (`frontend/`)
- HTML + Vanilla JavaScript with OpenTelemetry Web SDK
- ใช้ CDN imports สำหรับ OpenTelemetry libraries
- Auto-instrumentation สำหรับ Fetch API และ XMLHttpRequest
- ส่ง traces ไปยัง OpenTelemetry Collector ผ่าน HTTP

**Features:**
- ✅ Create, Read, Update, Delete (CRUD) operations
- ✅ Automatic trace propagation to backend
- ✅ Display Trace ID และ Span ID ใน UI
- ✅ Health check endpoint

### 2. **Backend API** (`backend/`)
- Express.js REST API with Node.js
- OpenTelemetry auto-instrumentation
- เชื่อมต่อกับ PostgreSQL database
- ส่ง traces ไปยัง OpenTelemetry Collector

**Features:**
- ✅ RESTful API endpoints for user management
- ✅ Automatic instrumentation for HTTP, Express, และ PostgreSQL
- ✅ Custom spans with detailed attributes
- ✅ Error tracking และ exception recording

### 3. **Database** (`database/`)
- PostgreSQL 15
- Sample data initialization
- Automatic instrumentation via `pg` library

### 4. **OpenTelemetry Collector**
- รับ traces จากทั้ง frontend และ backend
- Export ไปยัง Jaeger และ Prometheus
- Batch processing และ resource attributes

### 5. **Observability Stack**
- **Jaeger**: Trace visualization และ analysis
- **Prometheus**: Metrics collection และ monitoring

## 🚀 Quick Start

### Prerequisites
- Docker และ Docker Compose
- Web browser ที่รองรับ ES6 modules

### การรันโปรเจค

1. **Start all services:**
```bash
cd /Volumes/Server/git-remote/github-issarapong/OpenTelemetry/example/05-fullstack-tracing
docker-compose up -d
```

2. **รอให้ services พร้อม (ประมาณ 30 วินาที):**
```bash
docker-compose ps
```

3. **ตรวจสอบ logs:**
```bash
docker-compose logs -f backend
```

### 🌐 Access Points

- **Frontend UI**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **Collector Health**: http://localhost:13133

## 📊 Using the Demo

### 1. เปิด Frontend
เข้าไปที่ http://localhost:8080 จะเห็นหน้า UI สำหรับจัดการ users

### 2. ทดสอบ Operations

**Create User:**
- เลือก Action: "Create User"
- กรอก Username และ Email
- คลิก "Execute Action"
- ดู Trace ID ที่แสดงใน result

**List Users:**
- คลิกปุ่ม "📋 List Users"
- ดูรายการ users ทั้งหมด

**Get User by ID:**
- เลือก Action: "Get User by ID"
- กรอก User ID
- คลิก "Execute Action"

**Update User:**
- เลือก Action: "Update User"
- กรอก User ID และข้อมูลใหม่
- คลิก "Execute Action"

**Delete User:**
- เลือก Action: "Delete User"
- กรอก User ID
- คลิก "Execute Action"

**Health Check:**
- คลิกปุ่ม "❤️ Health Check"
- ตรวจสอบสถานะของ backend และ database

### 3. ดู Traces ใน Jaeger

1. เปิด Jaeger UI: http://localhost:16686
2. เลือก Service: `frontend-client`, `backend-api`, หรือ `postgres`
3. คลิก "Find Traces"
4. คลิกที่ trace เพื่อดูรายละเอียด

**สิ่งที่จะเห็นใน Trace:**
- 🔵 Frontend span: การเรียก API
- 🟢 Backend span: การประมวลผล request
- 🟡 Database span: การ query PostgreSQL
- ⏱️ Timing information สำหรับแต่ละ operation
- 🏷️ Attributes: user data, HTTP status, query parameters
- ❌ Errors และ exceptions (ถ้ามี)

### 4. ดู Metrics ใน Prometheus

1. เปิด Prometheus UI: http://localhost:9090
2. ลอง queries:
```promql
# Collector metrics
otel_collector_receiver_accepted_spans

# Collector export rate
rate(otel_collector_exporter_sent_spans[1m])
```

## 🔍 Trace Flow Example

เมื่อ user สร้าง user ใหม่ผ่าน frontend:

```
1. Frontend (Browser)
   ├─ Span: "frontend.create_user"
   │  ├─ Attributes: user.username, user.email
   │  └─ Child: Fetch API call
   │
2. Backend (Express)
   ├─ Span: "backend.create_user"
   │  ├─ Attributes: user.username, user.email, user.id
   │  └─ Child: Database query
   │
3. Database (PostgreSQL)
   └─ Span: "INSERT INTO users"
      ├─ Attributes: db.statement, db.name
      └─ Duration: query execution time
```

## 🛠️ API Endpoints

### Backend API

**Health Check:**
```bash
GET http://localhost:3001/health
```

**Create User:**
```bash
POST http://localhost:3001/users
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com"
}
```

**Get All Users:**
```bash
GET http://localhost:3001/users
```

**Get User by ID:**
```bash
GET http://localhost:3001/users/1
```

**Update User:**
```bash
PUT http://localhost:3001/users/1
Content-Type: application/json

{
  "username": "john_updated",
  "email": "john.new@example.com"
}
```

**Delete User:**
```bash
DELETE http://localhost:3001/users/1
```

## 📦 Project Structure

```
05-fullstack-tracing/
├── frontend/
│   ├── index.html          # Frontend UI with OpenTelemetry
│   ├── nginx.conf          # Nginx configuration
│   └── Dockerfile
├── backend/
│   ├── app.js              # Express API server
│   ├── tracing.js          # OpenTelemetry configuration
│   ├── package.json
│   └── Dockerfile
├── database/
│   ├── init.sql            # Database initialization
│   └── Dockerfile
├── docker-compose.yml       # Orchestration
├── otel-collector-config.yaml
├── prometheus.yml
└── README.md
```

## 🔧 Configuration

### OpenTelemetry Collector
`otel-collector-config.yaml` กำหนด:
- **Receivers**: รับ traces ผ่าน OTLP (HTTP และ gRPC)
- **Processors**: Batch, memory limiter, resource attributes
- **Exporters**: Jaeger, Prometheus, logging

### Environment Variables

**Backend:**
- `PORT`: API server port (default: 3001)
- `DB_HOST`: PostgreSQL host (default: postgres)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: testdb)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: postgres)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Collector endpoint

**Database:**
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password

## 🐛 Debugging

### ดู logs ของ services:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f otel-collector
docker-compose logs -f postgres
```

### ตรวจสอบ health:

```bash
# Backend health
curl http://localhost:3001/health

# Collector health
curl http://localhost:13133

# Jaeger health
curl http://localhost:16686
```

### Restart services:

```bash
# Restart specific service
docker-compose restart backend

# Restart all
docker-compose restart
```

## 🧹 Cleanup

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## 📚 Learn More

### Key Concepts Demonstrated:

1. **Context Propagation**: Trace context ถูกส่งต่อจาก frontend → backend → database
2. **Auto-Instrumentation**: ใช้ instrumentation libraries สำหรับ HTTP, Express, และ PostgreSQL
3. **Custom Spans**: สร้าง custom spans และเพิ่ม attributes
4. **Error Tracking**: บันทึก exceptions และ errors
5. **Distributed Tracing**: ติดตามการเดินทางของ request ข้ามหลาย services
6. **Performance Analysis**: วัดและวิเคราะห์ performance ของแต่ละส่วน

### OpenTelemetry Components:

- **Tracer**: สร้างและจัดการ spans
- **Span**: หน่วยของ work ที่ถูก trace
- **Context**: ข้อมูลที่ใช้ propagate trace information
- **Attributes**: Metadata ที่เพิ่มใน spans
- **Exporter**: ส่ง telemetry data ไปยัง backends

## 🎯 Next Steps

- เพิ่ม metrics instrumentation
- เพิ่ม logging correlation
- ใช้ sampling strategies
- เพิ่ม custom resource attributes
- ทดสอบ performance under load
- เพิ่ม authentication tracing

## ⚠️ Notes

- ตัวอย่างนี้ใช้สำหรับ development เท่านั้น
- ไม่ควรใช้ passwords ที่ hard-coded ใน production
- ควร configure proper security และ CORS policies
- ควรใช้ TLS/SSL สำหรับ production environments

## 🤝 Contributing

หากพบปัญหาหรือต้องการปรับปรุง กรุณา:
1. สร้าง issue
2. Submit pull request
3. แชร์ feedback

## 📄 License

ตัวอย่างนี้เป็น open source และสามารถใช้เพื่อการศึกษาได้อย่างอิสระ
