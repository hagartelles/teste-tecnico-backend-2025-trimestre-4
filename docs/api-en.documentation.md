# 📦 CEP Crawler - API Documentation

Asynchronous CEP crawling system using queues, MongoDB, and NestJS.

---

## 🏗️ Architecture

### Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│  API (REST)  │─────▶│  MongoDB    │
│  (Postman)  │      │  NestJS:3000 │      │  :27017     │
└─────────────┘      └──────┬───────┘      └─────────────┘
                             │
                             ▼
                     ┌──────────────┐
                     │ ElasticMQ    │
                     │ (SQS) :9324  │
                     └──────┬───────┘
                             │
                             ▼
                     ┌──────────────┐
                     │    Worker    │
                     │ Rate Limited │
                     └──────────────┘
```

### Processing Flow

1. **POST /cep/crawl** → Validates range → Creates MongoDB record → Enqueues CEPs → Returns 202
2. **SQS Queue** → Stores messages (1 per CEP)
3. **Worker** → Consumes queue (350ms between requests) → Queries ViaCEP → Saves result
4. **GET /cep/crawl/:id** → Returns real-time progress
5. **GET /cep/crawl/:id/results** → Returns processed CEPs

**Multiple simultaneous crawls:** Each request generates a unique `crawl_id` and processes independently.

---

## 🚀 Initial Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Postman (optional)

### 1. Clone and Install

```bash
git clone <repository>
cd teste-tecnico-backend-2025-trimestre-4

npm install
```

### 2. Configure Environment Variables

Configure the file `environments/.dev.env`:

```bash
# Application
NEST_PORT=3000

# MongoDB
MONGO_URI=mongodb://mongo:27017/crawler

# Queue
SQS_ENDPOINT=http://sqs:9324
QUEUE_NAME=cep-queue
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=000000000000
AWS_ACCESS_KEY_ID=x
AWS_SECRET_ACCESS_KEY=x

# ViaCEP
VIACEP_BASE_URL=https://viacep.com.br/ws
VIACEP_TEST_CEP=01001000
```

### 3. Start Containers

```bash
docker-compose up -d --build
```

**Check status:**
```bash
docker-compose ps

# Should show 3 containers UP:
# - mongo (port 27017)
# - sqs (ports 9324, 9325)
# - app (port 3000)
```

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Application only
docker-compose logs -f app
```

---

## 📡 API Endpoints

### 1. Create Crawl Request

**`POST /cep/crawl`**

```bash
curl -X POST http://localhost:3000/cep/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "cep_start": "01001000",
    "cep_end": "01001009"
  }'
```

**Response (202 Accepted):**
```json
{
  "crawl_id": "676d5a1b2c3d4e5f6a7b8c9d",
  "message": "Crawl request created successfully",
  "total_ceps": 10
}
```

**Validations:**
- CEPs with 8 numeric digits
- `cep_start <= cep_end`
- Maximum range: 1000 CEPs

---

### 2. Query Status

**`GET /cep/crawl/:crawl_id`**

```bash
curl http://localhost:3000/cep/crawl/676d5a1b2c3d4e5f6a7b8c9d
```

**Response (200 OK):**
```json
{
  "crawl_id": "676d5a1b2c3d4e5f6a7b8c9d",
  "cep_start": "01001000",
  "cep_end": "01001009",
  "total_ceps": 10,
  "processed_count": 10,
  "success_count": 8,
  "error_count": 2,
  "status": "finished",
  "started_at": "2025-12-26T05:52:32.000Z",
  "finished_at": "2025-12-26T05:52:42.000Z",
  "created_at": "2025-12-26T05:52:30.000Z",
  "updated_at": "2025-12-26T05:52:42.000Z"
}
```

**Possible statuses:**
- `pending` - Waiting for processing
- `running` - In progress
- `finished` - Completed
- `failed` - Critical error

---

### 3. Query Results

**`GET /cep/crawl/:crawl_id/results?page=1&limit=10`**

```bash
curl "http://localhost:3000/cep/crawl/676d5a1b2c3d4e5f6a7b8c9d/results?page=1&limit=10"
```

**Response (200 OK):**
```json
{
  "crawl_id": "676d5a1b2c3d4e5f6a7b8c9d",
  "results": [
    {
      "cep": "01001000",
      "success": true,
      "data": {
        "cep": "01001-000",
        "logradouro": "Praça da Sé",
        "bairro": "Sé",
        "localidade": "São Paulo",
        "uf": "SP",
        "ddd": "11"
      },
      "error_message": null,
      "created_at": "2025-12-26T05:52:33.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 10,
    "total_pages": 1
  }
}
```

**Query params:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

---

## 🔄 Parallel Processing

You can create **multiple simultaneous crawls**:

```bash
# Crawl 1
curl -X POST http://localhost:3000/cep/crawl \
  -d '{"cep_start": "01001000", "cep_end": "01001009"}'

# Crawl 2 (simultaneous!)
curl -X POST http://localhost:3000/cep/crawl \
  -d '{"cep_start": "02001000", "cep_end": "02001009"}'

# Crawl 3 (simultaneous!)
curl -X POST http://localhost:3000/cep/crawl \
  -d '{"cep_start": "03001000", "cep_end": "03001009"}'
```

Each crawl:
- ✅ Has its own `crawl_id`
- ✅ Processes independently
- ✅ Maintains separate status/counters

---

## ⚙️ Technical Features

### Rate Limiting

- **350ms** between requests (≈2.8 req/s)
- Uses Bottleneck for control
- Prevents ViaCEP API blocking

### Health Check

Validates ViaCEP availability before accepting crawls:

```bash
# If ViaCEP is offline:
POST /cep/crawl → 503 Service Unavailable
{
  "statusCode": 503,
  "message": "CEP service is currently unavailable..."
}
```

**Automatic verification:** Every 60 seconds

### Connection Pooling

- HTTP Keep-Alive enabled (via `@nestjs/axios`)
- Reuses connections (faster)
- Max 10 simultaneous connections

---

## 🗄️ Data Structure

### MongoDB Collections

**crawlrequests:**
```javascript
{
  _id: ObjectId("..."),
  cep_start: "01001000",
  cep_end: "01001009",
  total_ceps: 10,
  processed_count: 10,
  success_count: 8,
  error_count: 2,
  status: "finished",
  started_at: ISODate("..."),
  finished_at: ISODate("..."),
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**crawlresults:**
```javascript
{
  _id: ObjectId("..."),
  crawl_id: ObjectId("..."),
  cep: "01001000",
  success: true,
  data: { cep, logradouro, bairro, ... },
  error_message: null,
  retry_count: 0,
  createdAt: ISODate("...")
}
```

**Indexes:**
- `crawlrequests`: status + createdAt
- `crawlresults`: crawl_id + cep (unique)

---

## 🛠️ Monitoring

### View Queue (ElasticMQ UI)

```
http://localhost:9325
```

### View Worker Logs

```bash
docker-compose logs -f app | grep "Processing CEP"
```

### Query MongoDB

```bash
docker-compose exec mongo mongosh

use crawler
db.crawlrequests.find().pretty()
db.crawlresults.find().limit(5).pretty()
```

---

## 🐛 Troubleshooting

### Problem: App won't start

```bash
# View specific error
docker-compose logs app

# Common cause: missing variable in .env
# Solution: check environments/.dev.env
```

### Problem: Queue not processing

```bash
# Check if worker is running
docker-compose logs app | grep "CepWorker initialized"

# Check messages in queue
curl http://localhost:9324/000000000000/cep-queue
```

### Problem: Health check failing

```bash
# View logs
docker-compose logs app | grep "ViaCEP"

# Test manually
curl https://viacep.com.br/ws/01001000/json/
```

---

## 🏛️ Design Patterns

### Strategy Pattern
CEP providers are interchangeable via `ICepProvider` interface.

### Template Method
`BaseHealthCheckService` defines common flow, subclasses implement `performHealthCheck()`.

### Composite Pattern
`CompositeHealthCheckService` allows multiple providers with automatic fallback.

### Dependency Injection
All components use NestJS DI for loose coupling.

---

## 📦 Project Structure

```
src/
├── app.module.ts              # Root module
├── main.ts                    # Bootstrap
├── cep/
│   ├── cep.controller.ts      # REST endpoints
│   ├── cep.service.ts         # Business logic
│   ├── cep.worker.ts          # Queue consumer
│   ├── dto/                   # Request/response DTOs
│   ├── interfaces/            # Contracts (Provider, HealthCheck)
│   ├── providers/             # Implementations (ViaCEP)
│   ├── services/              # Health checks
│   └── validators/            # Custom validators
├── database/
│   ├── database.module.ts     # MongoDB config
│   └── mongoose-config.service.ts
├── queue/
│   ├── queue.module.ts        # SQS/ElasticMQ config
│   └── sqs-config.service.ts
└── schemas/
    ├── crawl-request.schema.ts  # Request schema
    └── crawl-result.schema.ts   # Result schema
```

---

## 🔐 Security

- Input validation with `class-validator`
- Automatic sanitization via `ValidationPipe`
- Rate limiting to prevent abuse
- Unique indexes prevent duplicates
- Health check prevents overload

---

## 🧪 Postman Collection

Import the `teste-tecnico_postman_collection.json` file into Postman for quick testing.

---

## 📝 Notes

- **Range limit:** 1000 CEPs per request
- **Estimated time:** ~6 minutes for 1000 CEPs (350ms each)
- **Automatic retry:** 3 attempts via SQS DLQ
- **Invalid CEPs:** Recorded with `success: false`

---

**Documentation generated on:** 12/26/2025