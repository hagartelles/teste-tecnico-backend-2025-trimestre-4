# teste-tecnico-backend-2025-trimestre-4

Teste técnico para a posição de Backend Dev. Edição do quarto trimestre de 2025.

---

## 📚 Documentação da API

A documentação completa da API está disponível em:

- **Português:** [docs/pt-br/API.md](docs/pt-br/API.md)
- **English:** [docs/en/API.md](docs/en/API.md)

---

## 🚀 Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis (já deve existir)
# Editar: environments/.dev.env

# 3. Subir containers
docker-compose up -d --build

# 4. Testar
curl -X POST http://localhost:3000/cep/crawl \
  -H "Content-Type: application/json" \
  -d '{"cep_start": "01001000", "cep_end": "01001009"}'
```

---

## A proposta: Crawler assíncrono de CEPs + Fila + MongoDB

A ideia é bem simples:

- [x] uma API que permita solicitar o processamento de um **range de CEPs**
- [x] cada CEP do range deve ser processado de forma **assíncrona**
- [x] os dados devem ser obtidos a partir da API pública do **ViaCEP**
- [x] os resultados e o progresso devem ser persistidos em um banco **MongoDB**

---

## ✅ Implementado

### API

- [x] Rota `POST /cep/crawl` para solicitar processamento de range
- [x] Validação de formato, range e limite (1000 CEPs)
- [x] Identificador único (`crawl_id`)
- [x] Um item na fila para cada CEP
- [x] Retorno `202 Accepted`

---

- [x] Rota `GET /cep/crawl/:crawl_id` para consultar status
- [x] Contadores: total, processado, sucessos, erros
- [x] Status: `pending`, `running`, `finished`, `failed`
- [x] Retorno `404` se não existir, `200` se existir

---

- [x] Rota `GET /cep/crawl/:crawl_id/results` para consultar resultados
- [x] Resultados processados
- [x] Paginação simples

---

### Processamento Assíncrono

- [x] Processamento fora do ciclo HTTP
- [x] Consumo individual da fila
- [x] Consulta à API ViaCEP
- [x] Persistência no MongoDB em caso de sucesso
- [x] Registro de erro para CEPs inexistentes
- [x] Retry automático (3 tentativas via SQS DLQ)

---

### Fila Assíncrona

- [x] ElasticMQ em Docker (compatível com SQS)
- [x] Rate limiting (350ms entre requests)
- [x] Controle de taxa para prevenir bloqueio da API

---

### Persistência

- [x] MongoDB para dados
- [x] Dados associados à requisição (`crawl_id`)
- [x] Acompanhamento de progresso
- [x] Identificação de erros
- [x] Consulta de resultados por `crawl_id`

---

### Infraestrutura

- [x] Dockerfile para aplicação
- [x] docker-compose.yml com:
  - [x] Aplicação HTTP
  - [x] Worker de processamento assíncrono
  - [x] MongoDB
  - [x] ElasticMQ (serviço de fila)

---

## 🏗️ Arquitetura

- **Strategy Pattern:** Providers de CEP intercambiáveis
- **Template Method:** Health checks extensíveis
- **Composite Pattern:** Múltiplos providers com fallback
- **Dependency Injection:** Baixo acoplamento
- **Connection Pooling:** Keep-alive HTTP
- **Rate Limiting:** Bottleneck (350ms)

---

## 🛠️ Stack Tecnológico

- **Runtime:** Node.js 18+
- **Framework:** NestJS
- **Database:** MongoDB (Mongoose)
- **Queue:** ElasticMQ (SQS-compatible)
- **HTTP Client:** Axios
- **Rate Limiting:** Bottleneck
- **Validation:** class-validator
- **Container:** Docker & Docker Compose

---

## 📦 Estrutura

```
src/
├── cep/              # Módulo principal (controller, service, worker)
├── database/         # Configuração MongoDB
├── queue/            # Configuração SQS/ElasticMQ
└── schemas/          # Schemas Mongoose
```

---

Para detalhes completos sobre instalação, configuração e uso, consulte a [documentação completa](docs/pt-br/API.md).