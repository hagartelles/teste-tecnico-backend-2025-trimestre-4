# 📦 CEP Crawler - Documentação da API

Sistema de crawling assíncrono de CEPs utilizando filas, MongoDB e NestJS.

---

## 🏗️ Arquitetura

### Visão Geral

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Cliente   │─────▶│  API (REST)  │─────▶│  MongoDB    │
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

### Fluxo de Processamento

1. **POST /cep/crawl** → Valida range → Cria registro no MongoDB → Enfileira CEPs → Retorna 202
2. **Fila SQS** → Armazena mensagens (1 por CEP)
3. **Worker** → Consome fila (350ms entre requests) → Consulta ViaCEP → Salva resultado
4. **GET /cep/crawl/:id** → Retorna progresso em tempo real
5. **GET /cep/crawl/:id/results** → Retorna CEPs processados

**Múltiplos crawls simultâneos:** Cada requisição gera um `crawl_id` único e processa independentemente.

---

## 🚀 Setup Inicial

### Pré-requisitos

- Node.js 18+
- Docker & Docker Compose
- Postman (opcional)

### 1. Clonar e Instalar

```bash
git clone <repository>
cd teste-tecnico-backend-2025-trimestre-4

npm install
```

### 2. Configurar Variáveis de Ambiente

Configure o arquivo `environments/.dev.env`:

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

### 3. Subir Containers

```bash
docker-compose up -d --build
```

**Verificar status:**
```bash
docker-compose ps

# Deve mostrar 3 containers UP:
# - mongo (porta 27017)
# - sqs (portas 9324, 9325)
# - app (porta 3000)
```

### 4. Ver Logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas aplicação
docker-compose logs -f app
```

---

## 📡 Endpoints da API

### 1. Criar Crawl Request

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

**Validações:**
- CEPs com 8 dígitos numéricos
- `cep_start <= cep_end`
- Range máximo: 1000 CEPs

---

### 2. Consultar Status

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

**Status possíveis:**
- `pending` - Aguardando processamento
- `running` - Em processamento
- `finished` - Concluído
- `failed` - Erro crítico

---

### 3. Consultar Resultados

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
- `page` - Número da página (default: 1)
- `limit` - Itens por página (default: 50, max: 100)

---

## 🔄 Processamento Paralelo

Você pode criar **múltiplos crawls simultâneos**:

```bash
# Crawl 1
curl -X POST http://localhost:3000/cep/crawl \
  -d '{"cep_start": "01001000", "cep_end": "01001009"}'

# Crawl 2 (simultâneo!)
curl -X POST http://localhost:3000/cep/crawl \
  -d '{"cep_start": "02001000", "cep_end": "02001009"}'

# Crawl 3 (simultâneo!)
curl -X POST http://localhost:3000/cep/crawl \
  -d '{"cep_start": "03001000", "cep_end": "03001009"}'
```

Cada crawl:
- ✅ Tem seu próprio `crawl_id`
- ✅ Processa independentemente
- ✅ Mantém status/contadores separados

---

## ⚙️ Características Técnicas

### Rate Limiting

- **350ms** entre requests (≈2.8 req/s)
- Usa Bottleneck para controle
- Previne bloqueio da API do ViaCEP

### Health Check

Valida disponibilidade do ViaCEP antes de aceitar crawls:

```bash
# Se ViaCEP estiver offline:
POST /cep/crawl → 503 Service Unavailable
{
  "statusCode": 503,
  "message": "CEP service is currently unavailable..."
}
```

**Verificação automática:** A cada 60 segundos

### Connection Pooling

- HTTP Keep-Alive ativo (via `@nestjs/axios`)
- Reutiliza conexões (mais rápido)
- Max 10 conexões simultâneas

---

## 🗄️ Estrutura de Dados

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

**Índices:**
- `crawlrequests`: status + createdAt
- `crawlresults`: crawl_id + cep (unique)

---

## 🛠️ Monitoramento

### Ver Fila (ElasticMQ UI)

```
http://localhost:9325
```

### Ver Logs do Worker

```bash
docker-compose logs -f app | grep "Processing CEP"
```

### Consultar MongoDB

```bash
docker-compose exec mongo mongosh

use crawler
db.crawlrequests.find().pretty()
db.crawlresults.find().limit(5).pretty()
```

---

## 🐛 Troubleshooting

### Problema: App não inicia

```bash
# Ver erro específico
docker-compose logs app

# Causa comum: variável faltando no .env
# Solução: verificar environments/.dev.env
```

### Problema: Fila não processa

```bash
# Verificar se worker está rodando
docker-compose logs app | grep "CepWorker initialized"

# Verificar mensagens na fila
curl http://localhost:9324/000000000000/cep-queue
```

### Problema: Health check falhando

```bash
# Ver logs
docker-compose logs app | grep "ViaCEP"

# Testar manualmente
curl https://viacep.com.br/ws/01001000/json/
```

---

## 🏛️ Padrões de Design

### Strategy Pattern
Providers de CEP são intercambiáveis via interface `ICepProvider`.

### Template Method
`BaseHealthCheckService` define fluxo comum, subclasses implementam `performHealthCheck()`.

### Composite Pattern
`CompositeHealthCheckService` permite múltiplos providers com fallback automático.

### Dependency Injection
Todos os componentes usam DI do NestJS para baixo acoplamento.

---

## 📦 Estrutura do Projeto

```
src/
├── app.module.ts              # Módulo raiz
├── main.ts                    # Bootstrap
├── cep/
│   ├── cep.controller.ts      # Endpoints REST
│   ├── cep.service.ts         # Lógica de negócio
│   ├── cep.worker.ts          # Consumidor da fila
│   ├── dto/                   # DTOs de request/response
│   ├── interfaces/            # Contratos (Provider, HealthCheck)
│   ├── providers/             # Implementações (ViaCEP)
│   ├── services/              # Health checks
│   └── validators/            # Validadores customizados
├── database/
│   ├── database.module.ts     # Config MongoDB
│   └── mongoose-config.service.ts
├── queue/
│   ├── queue.module.ts        # Config SQS/ElasticMQ
│   └── sqs-config.service.ts
└── schemas/
    ├── crawl-request.schema.ts  # Schema de requisição
    └── crawl-result.schema.ts   # Schema de resultado
```

---

## 🔐 Segurança

- Validação de entrada com `class-validator`
- Sanitização automática via `ValidationPipe`
- Rate limiting para prevenir abuse
- Índices únicos previnem duplicatas
- Health check previne sobrecarga

---

## 🧪 Collection do Postman

Importe o arquivo `teste-tecnico_postman_collection.json` no Postman para testes rápidos.

---

## 📝 Notas

- **Limite de range:** 1000 CEPs por requisição
- **Tempo estimado:** ~6 minutos para 1000 CEPs (350ms cada)
- **Retry automático:** 3 tentativas via SQS DLQ
- **CEPs inválidos:** Registrados com `success: false`

---

**Documentação gerada em:** 26/12/2025