# OpenTelemetry on Kubernetes Example

ตัวอย่างการ deploy OpenTelemetry บน Kubernetes พร้อม Express Application

## 📋 ข้อกำหนดเบื้องต้น

- Kubernetes cluster:
  - **Rancher Desktop** (แนะนำสำหรับ local development)
  - minikube
  - Docker Desktop with Kubernetes
  - GKE, EKS, AKS (สำหรับ production)
- kubectl ติดตั้งและตั้งค่าแล้ว
- Helm 3.x (สำหรับติดตั้ง components บางตัว)
- Docker (สำหรับ build image - มีใน Rancher Desktop แล้ว)

## 🏗️ สถาปัตยกรรม

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Namespace: observability              │    │
│  │                                                    │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │    │
│  │  │   Jaeger    │  │ Prometheus  │  │ Grafana  │  │    │
│  │  │  (Service)  │  │  (Service)  │  │(Service) │  │    │
│  │  └─────────────┘  └─────────────┘  └──────────┘  │    │
│  │                                                    │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │    OpenTelemetry Collector               │     │    │
│  │  │    (DaemonSet - runs on each node)       │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Namespace: app                        │    │
│  │                                                    │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │    Express App (Deployment)              │     │    │
│  │  │    Replicas: 3                           │     │    │
│  │  │    - Pod 1                               │     │    │
│  │  │    - Pod 2                               │     │    │
│  │  │    - Pod 3                               │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  │                                                    │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │    Service (LoadBalancer/NodePort)       │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📁 โครงสร้างไฟล์

```
example-kubernetes/
├── app/
│   ├── Dockerfile              # Docker image สำหรับ Express app
│   ├── app.js                  # Express application
│   ├── tracing.js              # OpenTelemetry configuration
│   └── package.json            # Dependencies
├── k8s/
│   ├── namespace.yaml          # Namespaces
│   ├── app-deployment.yaml     # Express app deployment
│   ├── app-service.yaml        # Express app service
│   ├── otel-collector-config.yaml   # Collector ConfigMap
│   ├── otel-collector-daemonset.yaml # Collector DaemonSet
│   ├── jaeger.yaml             # Jaeger deployment
│   ├── prometheus.yaml         # Prometheus deployment
│   └── grafana.yaml            # Grafana deployment
├── helm/
## 🚀 วิธีการติดตั้ง

### ขั้นตอนที่ 0: ตั้งค่า Rancher Desktop (แนะนำสำหรับ Local Development)

#### ติดตั้ง Rancher Desktop

1. **ดาวน์โหลดและติดตั้ง Rancher Desktop**
   - macOS: [ดาวน์โหลดจาก GitHub](https://github.com/rancher-sandbox/rancher-desktop/releases)
   - Windows: ใช้ installer จาก GitHub releases
   - Linux: ใช้ AppImage หรือติดตั้งผ่าน package manager

2. **เริ่มต้น Rancher Desktop**
   ```bash
   # เปิด Rancher Desktop application
   # รอให้ Kubernetes cluster เริ่มต้น (ประมาณ 2-3 นาที)
   ```

3. **ตั้งค่า Rancher Desktop**
   - เปิด Preferences/Settings
   - **Kubernetes Settings**:
     - Kubernetes Version: เลือกเวอร์ชันล่าสุด (1.28+)
     - Memory: แนะนำ 4GB ขึ้นไป
     - CPUs: แนะนำ 2 cores ขึ้นไป
   - **Container Engine**: เลือก `dockerd (moby)` หรือ `containerd`
   - คลิก Apply & Restart

4. **ตรวจสอบว่า Kubernetes ทำงาน**
   ```bash
   # ตรวจสอบ kubectl context
   kubectl config current-context
   # ควรเห็น: rancher-desktop
   
   # ตรวจสอบ nodes
   kubectl get nodes
   # ควรเห็น node ชื่อ lima-rancher-desktop หรือคล้ายกัน
   
   # ตรวจสอบ system pods
   kubectl get pods -n kube-system
   ```

5. **ตั้งค่า Docker CLI (ถ้าเลือก containerd)**
   ```bash
   # สำหรับ macOS/Linux
   export PATH="$HOME/.rd/bin:$PATH"
   
   # หรือเพิ่มใน ~/.zshrc หรือ ~/.bashrc
   echo 'export PATH="$HOME/.rd/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   
   # ตรวจสอบ
   docker version
   ```

#### ทางเลือกอื่น: ใช้ Built-in Registry ของ Rancher Desktop

Rancher Desktop มี container registry ในตัว ไม่ต้อง push image ไปที่ external registry:

```bash
# สำหรับ containerd runtime
nerdctl build -t express-otel-app:v1.0 .
nerdctl images

# สำหรับ dockerd runtime
docker build -t express-otel-app:v1.0 .
docker images
### ขั้นตอนที่ 3: Build และ Push Docker Image

#### ตัวเลือก A: ใช้ Local Image ใน Rancher Desktop (แนะนำสำหรับ Development)

```bash
# เข้าไปที่ app directory
cd app/

# Build image โดยใช้ nerdctl (containerd) หรือ docker (dockerd)
# สำหรับ containerd runtime:
nerdctl build -t express-otel-app:v1.0 .

# สำหรับ dockerd runtime:
docker build -t express-otel-app:v1.0 .

# ตรวจสอบ image
nerdctl images express-otel-app  # หรือ docker images express-otel-app
```

**แก้ไข `k8s/app-deployment.yaml` สำหรับ local image:**
```yaml
spec:
  template:
    spec:
      containers:
      - name: express-otel-app
        image: express-otel-app:v1.0          # ไม่ต้องใส่ registry prefix
        imagePullPolicy: Never                # เพิ่มบรรทัดนี้!
```

#### ตัวเลือก B: Push ไปยัง External Registry (สำหรับ Production)

```bash
# Build image พร้อม registry prefix
cd app/
docker build -t your-registry/express-otel-app:v1.0 .

# Login ไปยัง registry
### เข้าถึง Application

#### สำหรับ Rancher Desktop (Local)

```bash
# วิธีที่ 1: ใช้ Port Forward (แนะนำ - ง่ายที่สุด)
kubectl port-forward -n app svc/express-app-service 3000:80
# เปิดเบราว์เซอร์: http://localhost:3000

# วิธีที่ 2: เปลี่ยนเป็น NodePort และเข้าผ่าน localhost
kubectl patch svc express-app-service -n app -p '{"spec":{"type":"NodePort"}}'
kubectl get svc express-app-service -n app
# จะได้ NodePort (เช่น 30123)
# เข้าถึงได้ที่: http://localhost:30123

# ทดสอบ (Port Forward)
curl http://localhost:3000/
curl http://localhost:3000/api/users/123
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"data": "test data"}'
```

#### สำหรับ Cloud Kubernetes (Production)

```bash
# ถ้าใช้ LoadBalancer (GKE, EKS, AKS)
export APP_URL=$(kubectl get svc express-app-service -n app -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Application URL: http://$APP_URL"

# ถ้าใช้ NodePort
export NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
export NODE_PORT=$(kubectl get svc express-app-service -n app -o jsonpath='{.spec.ports[0].nodePort}')
echo "Application URL: http://$NODE_IP:$NODE_PORT"

# ทดสอบ
curl http://$APP_URL/
curl http://$APP_URL/api/users/123
```     image: your-registry/express-otel-app:v1.0  # ใส่ registry ของคุณ
        imagePullPolicy: Always                     # Pull image ทุกครั้ง
```

#### ตัวเลือก C: ใช้ Docker Hub

```bash
# Build และ tag image
cd app/
docker build -t your-dockerhub-username/express-otel-app:v1.0 .

# Login Docker Hub
docker login

# Push image
docker push your-dockerhub-username/express-otel-app:v1.0
```

**แก้ไข image ใน deployment:**
```yaml
image: your-dockerhub-username/express-otel-app:v1.0
imagePullPolicy: Always
```

#### เปิด Kubernetes Dashboard (Optional)

Rancher Desktop มี Dashboard ในตัว:

```bash
# เปิด Rancher Desktop UI
# ไปที่ Preferences > Kubernetes
# เปิด "Enable Kubernetes Dashboard"

# หรือติดตั้งด้วย kubectl
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# สร้าง admin user
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF

# ดู token
kubectl -n kubernetes-dashboard create token admin-user

# เปิด proxy
kubectl proxy

# เปิดเบราว์เซอร์: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

#### Tips สำหรับ Rancher Desktop

**ข้อดี:**
- ✅ ติดตั้งง่าย GUI-based
- ✅ มี Docker และ Kubernetes ในตัว
- ✅ ใช้ทรัพยากรน้อยกว่า Docker Desktop
- ✅ ไม่ต้องจ่ายเงิน (ฟรีสำหรับองค์กรทุกขนาด)
- ✅ รองรับทั้ง dockerd และ containerd

**ข้อควรระวัง:**
- ⚠️ ครั้งแรกอาจใช้เวลาโหลด images นานหน่อย
- ⚠️ ถ้าเปลี่ยน container runtime ต้อง rebuild images ใหม่
- ⚠️ ตั้งค่า memory/CPU ให้เพียงพอ (แนะนำ 4GB+ RAM)

**Port Forwarding สำหรับ Services:**
```bash
# Rancher Desktop expose services แบบ NodePort ได้ง่าย
# ไม่ต้องใช้ LoadBalancer

# ตัวอย่าง: เปลี่ยน service type เป็น NodePort
kubectl patch svc express-app-service -n app -p '{"spec":{"type":"NodePort"}}'

# ดู port ที่ถูก assign
kubectl get svc express-app-service -n app
# เข้าถึงที่: http://localhost:<NodePort>
```

---

### ขั้นตอนที่ 1: สร้าง Namespaces

## 🚀 วิธีการติดตั้ง

### ขั้นตอนที่ 1: สร้าง Namespaces

```bash
kubectl apply -f k8s/namespace.yaml
```

### ขั้นตอนที่ 2: ติดตั้ง Observability Stack

#### ตัวเลือก A: ใช้ Helm (แนะนำ)

```bash
# เพิ่ม Helm repositories
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

# ติดตั้ง Jaeger
helm install jaeger jaegertracing/jaeger \
  --namespace observability \
  --set provisionDataStore.cassandra=false \
  --set allInOne.enabled=true \
  --set storage.type=memory \
  --set query.service.type=LoadBalancer
### เข้าถึง Observability UIs

#### วิธีที่ 1: ใช้ Port Forward (แนะนำสำหรับ Rancher Desktop)

```bash
# Jaeger UI (Tracing)
kubectl port-forward -n observability svc/jaeger-query 16686:16686
# เปิดเบราว์เซอร์: http://localhost:16686
# ค้นหา service: express-otel-k8s-app

# Prometheus (Metrics) - ถ้าติดตั้งด้วย Helm
kubectl port-forward -n observability svc/prometheus-server 9090:80
# เปิดเบราว์เซอร์: http://localhost:9090
# ทดลอง query: rate(http_server_requests_total[5m])

# Grafana (Visualization) - ถ้าติดตั้งด้วย Helm
kubectl port-forward -n observability svc/grafana 3000:80
# เปิดเบราว์เซอร์: http://localhost:3000
# Username: admin
# Password: รันคำสั่งด้านล่าง
kubectl get secret -n observability grafana -o jsonpath="{.data.admin-password}" | base64 --decode && echo
```

#### วิธีที่ 2: เปิดหลาย Port Forward พร้อมกัน (Rancher Desktop)

สร้างสคริปต์ `port-forward-all.sh`:

```bash
#!/bin/bash

# ฟังก์ชันสำหรับ port forward
start_port_forward() {
    local namespace=$1
    local service=$2
    local port=$3
    local target_port=$4
    
    echo "Starting port-forward for $service..."
    kubectl port-forward -n $namespace svc/$service $port:$target_port &
}

# เริ่ม port forwards
start_port_forward "app" "express-app-service" "3000" "80"
start_port_forward "observability" "jaeger-query" "16686" "16686"
start_port_forward "observability" "prometheus-server" "9090" "80"
start_port_forward "observability" "grafana" "3001" "80"

echo "
✅ Port forwards started!

📱 Application: http://localhost:3000
🔍 Jaeger:     http://localhost:16686
📊 Prometheus: http://localhost:9090
📈 Grafana:    http://localhost:3001 (admin / รันคำสั่งด้านล่างเพื่อดู password)

ดู Grafana password:
kubectl get secret -n observability grafana -o jsonpath=\"{.data.admin-password}\" | base64 --decode && echo

กด Ctrl+C เพื่อหยุดทั้งหมด
"

# รอจนกว่าจะกด Ctrl+C
wait
```

รัน:
```bash
chmod +x port-forward-all.sh
./port-forward-all.sh
```

#### วิธีที่ 3: เปลี่ยนเป็น NodePort (สำหรับเข้าถึงโดยไม่ต้อง Port Forward)

```bash
# เปลี่ยน Jaeger เป็น NodePort
kubectl patch svc jaeger-query -n observability -p '{"spec":{"type":"NodePort"}}'

# ดู port
kubectl get svc -n observability jaeger-query
# เข้าถึง: http://localhost:<NodePort>
```

#### Tips สำหรับ Rancher Desktop

**เปิด Services ผ่าน Rancher Desktop UI:**
1. เปิด Rancher Desktop
2. ไปที่ Port Forwarding tab
3. เลือก namespace และ service
4. คลิก Forward Port

**ใช้ kubectl proxy (เข้าถึง Kubernetes API):**
```bash
kubectl proxy
# เข้าถึง Jaeger ผ่าน proxy:
# http://localhost:8001/api/v1/namespaces/observability/services/jaeger-query:16686/proxy/
```
#### ตัวเลือก B: ใช้ YAML Manifests

```bash
# ติดตั้ง Jaeger
kubectl apply -f k8s/jaeger.yaml

# ติดตั้ง Prometheus
kubectl apply -f k8s/prometheus.yaml

# ติดตั้ง Grafana
kubectl apply -f k8s/grafana.yaml

# ติดตั้ง OpenTelemetry Collector
kubectl apply -f k8s/otel-collector-config.yaml
kubectl apply -f k8s/otel-collector-daemonset.yaml
```

### ขั้นตอนที่ 3: Build และ Push Docker Image

```bash
# Build image
cd app/
docker build -t your-registry/express-otel-app:v1.0 .

# Push ไปยัง registry (แก้ไข registry ของคุณ)
docker push your-registry/express-otel-app:v1.0
```

**หมายเหตุ**: แก้ไข image name ใน `k8s/app-deployment.yaml` ให้ตรงกับ registry ของคุณ

### ขั้นตอนที่ 4: Deploy Application

```bash
# Deploy Express app
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml
```

### ขั้นตอนที่ 5: ตรวจสอบการติดตั้ง

```bash
# ตรวจสอบ pods
kubectl get pods -n observability
kubectl get pods -n app

# ตรวจสอบ services
kubectl get svc -n observability
kubectl get svc -n app

# ดู logs ของ app
kubectl logs -f -n app -l app=express-otel-app
```

## 🧪 ทดสอบ Application

### เข้าถึง Application

```bash
# ถ้าใช้ LoadBalancer
export APP_URL=$(kubectl get svc express-app-service -n app -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# ถ้าใช้ NodePort
export APP_URL=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
export APP_PORT=$(kubectl get svc express-app-service -n app -o jsonpath='{.spec.ports[0].nodePort}')

# ทดสอบ
curl http://$APP_URL:3000/
curl http://$APP_URL:3000/api/users/123
```

### เข้าถึง Observability UIs

```bash
# Jaeger UI
kubectl port-forward -n observability svc/jaeger-query 16686:16686
# เปิดเบราว์เซอร์: http://localhost:16686

# Prometheus
kubectl port-forward -n observability svc/prometheus-server 9090:80
# เปิดเบราว์เซอร์: http://localhost:9090

# Grafana
kubectl port-forward -n observability svc/grafana 3000:80
# เปิดเบราว์เซอร์: http://localhost:3000
# Username: admin
# Password: kubectl get secret -n observability grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```

## 📊 ตัวอย่าง PromQL Queries

เปิด Prometheus UI และลอง queries เหล่านี้:

```promql
# Request rate
rate(http_server_requests_total[5m])

# Average response time
rate(http_server_duration_milliseconds_sum[5m]) / rate(http_server_duration_milliseconds_count[5m])

# Error rate
rate(http_server_requests_total{status_code=~"5.."}[5m])

# CPU usage by pod
container_cpu_usage_seconds_total{namespace="app"}
```

## 🔧 การปรับแต่ง

### ปรับจำนวน Replicas

```bash
kubectl scale deployment express-otel-app -n app --replicas=5
```

### อัปเดต Application

```bash
# Build image ใหม่
docker build -t your-registry/express-otel-app:v1.1 .
docker push your-registry/express-otel-app:v1.1

# อัปเดต deployment
kubectl set image deployment/express-otel-app -n app \
  express-otel-app=your-registry/express-otel-app:v1.1

# หรือใช้ Rolling update
kubectl rollout restart deployment/express-otel-app -n app
```

### ปรับแต่ง Resource Limits

แก้ไข `k8s/app-deployment.yaml`:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```
## 🧹 ทำความสะอาด

### ลบทั้งหมด

```bash
# ลบ application
kubectl delete -f k8s/app-service.yaml
kubectl delete -f k8s/app-deployment.yaml

# ลบ observability stack (ถ้าใช้ Helm)
helm uninstall jaeger -n observability
helm uninstall prometheus -n observability
helm uninstall grafana -n observability
helm uninstall otel-collector -n observability

# ลบ observability stack (ถ้าใช้ YAML)
kubectl delete -f k8s/otel-collector-daemonset.yaml
kubectl delete -f k8s/otel-collector-config.yaml
kubectl delete -f k8s/jaeger.yaml

# ลบ namespaces (จะลบทุกอย่างใน namespace)
kubectl delete namespace app
kubectl delete namespace observability
```

---

## 🎯 Quick Start Guide สำหรับ Rancher Desktop

### คำสั่งเดียวจบ (All-in-One)

สร้างสคริปต์ `quick-start.sh`:

```bash
#!/bin/bash

echo "🚀 Starting OpenTelemetry on Kubernetes with Rancher Desktop"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install Rancher Desktop first."
    exit 1
fi

# Create namespaces
echo "📦 Creating namespaces..."
kubectl apply -f k8s/namespace.yaml

# Install Jaeger
echo "🔍 Installing Jaeger..."
kubectl apply -f k8s/jaeger.yaml

# Install OpenTelemetry Collector
echo "📊 Installing OpenTelemetry Collector..."
kubectl apply -f k8s/otel-collector-config.yaml
kubectl apply -f k8s/otel-collector-daemonset.yaml

# Wait for observability stack
echo "⏳ Waiting for observability stack to be ready..."
kubectl wait --for=condition=ready pod -l app=jaeger -n observability --timeout=120s
kubectl wait --for=condition=ready pod -l app=otel-collector -n observability --timeout=120s

# Build and deploy application
echo "🏗️  Building application image..."
cd app/
docker build -t express-otel-app:v1.0 .
cd ..

echo "🚀 Deploying application..."
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml

# Wait for application
echo "⏳ Waiting for application to be ready..."
kubectl wait --for=condition=ready pod -l app=express-otel-app -n app --timeout=120s

# Patch services to NodePort for easy access
echo "🔧 Configuring services for local access..."
kubectl patch svc express-app-service -n app -p '{"spec":{"type":"NodePort"}}'
kubectl patch svc jaeger-query -n observability -p '{"spec":{"type":"NodePort"}}'

# Get service ports
APP_PORT=$(kubectl get svc express-app-service -n app -o jsonpath='{.spec.ports[0].nodePort}')
JAEGER_PORT=$(kubectl get svc jaeger-query -n observability -o jsonpath='{.spec.ports[0].nodePort}')

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Application:    http://localhost:$APP_PORT"
echo "🔍 Jaeger UI:      http://localhost:$JAEGER_PORT"
echo ""
echo "Test the application:"
echo "  curl http://localhost:$APP_PORT/"
echo "  curl http://localhost:$APP_PORT/api/users/123"
echo ""
echo "View traces in Jaeger:"
echo "  Open http://localhost:$JAEGER_PORT and select 'express-otel-k8s-app'"
echo ""
```

รัน:
```bash
chmod +x quick-start.sh
./quick-start.sh
```

### การทดสอบแบบครบวงจร

```bash
# 1. สร้าง traffic
for i in {1..10}; do
  curl http://localhost:<APP_PORT>/api/users/$i
  sleep 1
done

# 2. ทดสอบ slow endpoint
curl http://localhost:<APP_PORT>/api/slow

# 3. ทดสอบ error handling
curl http://localhost:<APP_PORT>/api/error

# 4. ดู traces ใน Jaeger
# เปิด http://localhost:<JAEGER_PORT>
# เลือก service: express-otel-k8s-app
# คลิก Find Traces

# 5. ดู real-time logs
kubectl logs -f -n app -l app=express-otel-app
```

---

## 📝 Troubleshooting สำหรับ Rancher Desktop

### ปัญหาที่พบบ่อย

**1. Pod ไม่สามารถ pull image ได้**
```bash
# ตรวจสอบ imagePullPolicy
kubectl describe pod -n app <pod-name> | grep -A 5 "Events:"

# แก้ไข: เปลี่ยนเป็น Never สำหรับ local images
kubectl patch deployment express-otel-app -n app -p '{"spec":{"template":{"spec":{"containers":[{"name":"express-otel-app","imagePullPolicy":"Never"}]}}}}'
```

**2. Service ไม่สามารถเข้าถึงได้**
```bash
# ตรวจสอบ service
kubectl get svc -n app
kubectl describe svc express-app-service -n app

# ตรวจสอบ endpoints
kubectl get endpoints express-app-service -n app

# ใช้ port-forward แทน
kubectl port-forward -n app svc/express-app-service 3000:80
```

**3. Collector ไม่ได้รับ traces**
```bash
# ตรวจสอบ collector logs
kubectl logs -n observability -l app=otel-collector

# ตรวจสอบ connectivity จาก app pod
kubectl exec -n app <pod-name> -- wget -O- http://otel-collector.observability.svc.cluster.local:4318/v1/traces

# ตรวจสอบ environment variables
kubectl exec -n app <pod-name> -- env | grep OTEL
```

**4. Rancher Desktop ใช้ memory มาก**
```bash
# ลด resource ใน deployment
kubectl patch deployment express-otel-app -n app -p '{"spec":{"template":{"spec":{"containers":[{"name":"express-otel-app","resources":{"requests":{"memory":"64Mi","cpu":"50m"},"limits":{"memory":"256Mi","cpu":"200m"}}}]}}}}'

# ลด replicas
kubectl scale deployment express-otel-app -n app --replicas=1
```

---

**หมายเหตุ**: 
- ตัวอย่างนี้เหมาะสำหรับ **development และ testing กับ Rancher Desktop**
- สำหรับ **production** ควรใช้:
  - Persistent storage (PV/PVC)
  - High availability setup (multiple replicas across zones)
  - Production-grade backends (Elasticsearch, Cassandra)
  - External load balancers
  - Ingress controllers
  - Monitoring และ alerting (Prometheus Operator, Alert Manager)
  - Backup และ disaster recovery plans
  - Security scanning และ policies
# วิธีที่ 2: Reset ด้วย command line
# หยุด Rancher Desktop ก่อน
# จากนั้นลบ data directories:

# macOS:
rm -rf ~/Library/Application\ Support/rancher-desktop
rm -rf ~/.rd

# Linux:
rm -rf ~/.local/share/rancher-desktop
rm -rf ~/.rd

# Windows (PowerShell):
# Remove-Item -Recurse -Force "$env:LOCALAPPDATA\rancher-desktop"
# Remove-Item -Recurse -Force "$env:APPDATA\rancher-desktop"
```

### ตรวจสอบว่าลบหมดแล้ว

```bash
# ตรวจสอบ namespaces
kubectl get namespaces

# ตรวจสอบว่าไม่มี pods เหลืออยู่
kubectl get pods --all-namespaces | grep -E "(app|observability)"

# ตรวจสอบ local images (ถ้าต้องการลบ)
docker images express-otel-app  # หรือ nerdctl images express-otel-app

# ลบ local images
docker rmi express-otel-app:v1.0  # หรือ nerdctl rmi express-otel-app:v1.0
```

### ปัญหาที่พบบ่อย

**1. Application ส่งข้อมูลไม่ถึง Collector**
```bash
# ตรวจสอบว่า endpoint ถูกต้อง
kubectl exec -n app -it <pod-name> -- env | grep OTEL

# ควรเห็น:
# OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.observability.svc.cluster.local:4318
```

**2. Collector ไม่ส่งข้อมูลไป Jaeger**
```bash
# ตรวจสอบ Collector config
kubectl get configmap -n observability otel-collector-config -o yaml
```

**3. Pods ไม่สามารถ start ได้**
```bash
# ดู events
kubectl describe pod <pod-name> -n app

# ดู logs
kubectl logs <pod-name> -n app
```

## 🎯 Best Practices สำหรับ Kubernetes

### 1. ใช้ DaemonSet สำหรับ Collector
- รัน collector บนทุก node
- ลด network hops
- เหมาะกับ high-traffic environments

### 2. ตั้งค่า Resource Limits
```yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

### 3. ใช้ Service Mesh (ถ้ามี)
- Istio, Linkerd สามารถ auto-inject tracing
- ง่ายกว่าการ instrument แต่ละ app

### 4. ใช้ Persistent Storage
- สำหรับ production ใช้ persistent storage แทน memory
- Cassandra, Elasticsearch สำหรับ Jaeger

### 5. ตั้งค่า Sampling Rate
```yaml
env:
  - name: OTEL_TRACES_SAMPLER
    value: "parentbased_traceidratio"
  - name: OTEL_TRACES_SAMPLER_ARG
    value: "0.1"  # 10% sampling
```

### 6. ใช้ Horizontal Pod Autoscaler (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: express-otel-app-hpa
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: express-otel-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔐 Security Best Practices

### 1. ใช้ RBAC
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
- apiGroups: [""]
  resources: ["pods", "nodes", "services"]
  verbs: ["get", "list", "watch"]
```

### 2. ใช้ Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-to-collector
  namespace: app
spec:
  podSelector:
    matchLabels:
      app: express-otel-app
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: observability
    ports:
    - protocol: TCP
      port: 4318
```

### 3. เก็บ Secrets อย่างปลอดภัย
```bash
# สร้าง secret สำหรับ credentials
kubectl create secret generic grafana-admin \
  --from-literal=username=admin \
  --from-literal=password=secretpassword \
  -n observability
```

## 📚 แหล่งข้อมูลเพิ่มเติม

- [OpenTelemetry Operator](https://github.com/open-telemetry/opentelemetry-operator)
- [OpenTelemetry Helm Charts](https://github.com/open-telemetry/opentelemetry-helm-charts)
- [Kubernetes Observability](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Jaeger on Kubernetes](https://www.jaegertracing.io/docs/latest/operator/)

## 🧹 ทำความสะอาด

```bash
# ลบ application
kubectl delete -f k8s/app-service.yaml
kubectl delete -f k8s/app-deployment.yaml

# ลบ observability stack (ถ้าใช้ Helm)
helm uninstall jaeger -n observability
helm uninstall prometheus -n observability
helm uninstall grafana -n observability
helm uninstall otel-collector -n observability

# ลบ observability stack (ถ้าใช้ YAML)
kubectl delete -f k8s/otel-collector-daemonset.yaml
kubectl delete -f k8s/otel-collector-config.yaml
kubectl delete -f k8s/grafana.yaml
kubectl delete -f k8s/prometheus.yaml
kubectl delete -f k8s/jaeger.yaml

# ลบ namespaces
kubectl delete namespace app
kubectl delete namespace observability
```

---

**หมายเหตุ**: ตัวอย่างนี้เหมาะสำหรับ development และ testing ใน production ควรใช้:
- Persistent storage
- High availability setup (multiple replicas)
- Production-grade backends (Elasticsearch, Cassandra)
- Monitoring และ alerting
- Backup และ disaster recovery plans
