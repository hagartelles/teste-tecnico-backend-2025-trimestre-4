# teste-tecnico-backend-2025-trimestre-4
Teste técnico para a posição de Backend Dev. Edição do quarto trimestre de 2025.

## A proposta: Crawler assíncrono de CEPs + Fila + MongoDB

A ideia é bem simples:

- [ ] uma API que permita solicitar o processamento de um **range de CEPs**
- [ ] cada CEP do range deve ser processado de forma **assíncrona**
- [ ] os dados devem ser obtidos a partir da API pública do **ViaCEP**
- [ ] os resultados e o progresso devem ser persistidos em um banco **MongoDB**

---

## API

### Solicitação de crawl

- [ ] uma rota `POST /cep/crawl` que recebe um range de CEPs no seguinte formato:

```json
{
  "cep_start": "01000000",
  "cep_end": "01001000"
}
```

* [ ] validar:

  * [ ] formato dos CEPs
  * [ ] `cep_start` menor ou igual a `cep_end`
  * [ ] tamanho máximo do range (critério livre)
* [ ] criar um identificador único da requisição (`crawl_id`)
* [ ] inserir **um item na fila para cada CEP do range**
* [ ] retornar:

  * [ ] código de status `202 Accepted`
  * [ ] o `crawl_id` gerado

---

### Consulta de status

* [ ] uma rota `GET /cep/crawl/:crawl_id` que retorna o status do processamento
* [ ] o status deve conter, no mínimo:

  * [ ] total de CEPs
  * [ ] quantidade processada
  * [ ] quantidade de sucessos
  * [ ] quantidade de erros
  * [ ] status geral da requisição (`pending`, `running`, `finished`, `failed`)
* [ ] retornar:

  * [ ] `404` caso o `crawl_id` não exista
  * [ ] `200` caso exista

---

### (Opcional) Consulta de resultados

* [ ] uma rota `GET /cep/crawl/:crawl_id/results`
* [ ] retornar os resultados já processados
* [ ] paginação simples é desejável

---

## Processamento assíncrono

* [ ] o processamento dos CEPs deve ocorrer fora do ciclo da requisição HTTP
* [ ] cada CEP deve ser consumido individualmente a partir de uma fila
* [ ] para cada CEP:

  * [ ] consultar a API do ViaCEP
  * [ ] em caso de sucesso, persistir o endereço no MongoDB
  * [ ] em caso de CEP inexistente, registrar o erro associado ao `crawl_id`
  * [ ] em caso de falha temporária, permitir retry

---

## Fila assíncrona

* [ ] sugerimos o uso do **ElasticMQ** em Docker
  ([https://github.com/softwaremill/elasticmq](https://github.com/softwaremill/elasticmq)), por ser compatível com a API do Amazon SQS
* [ ] o candidato pode utilizar outra solução de fila, desde que justifique a escolha
* [ ] o sistema deve garantir que o consumo da fila **não exceda limites da API externa**

```plain
A API do ViaCEP pode aplicar limitação de requisições.
O sistema deve ser capaz de controlar a taxa de processamento da fila,
mesmo quando o usuário solicita ranges grandes de CEPs.

O não controle da fila pode resultar em falhas, retries excessivos ou bloqueio
da API externa.
```

---

## Persistência

* [ ] utilizar **MongoDB** para persistência dos dados
* [ ] os dados devem estar associados à requisição que originou o processamento
* [ ] o modelo de dados é livre, mas deve permitir:

  * [ ] acompanhar progresso
  * [ ] identificar erros
  * [ ] consultar resultados por `crawl_id`

---

## Infraestrutura

Para infra, vamos usar o seguinte conjunto:

* [ ] um arquivo `Dockerfile` para a aplicação
* [ ] um arquivo `docker-compose.yml` contendo, no mínimo:

  * [ ] aplicação HTTP
  * [ ] worker de processamento assíncrono
  * [ ] MongoDB
  * [ ] serviço de fila (ElasticMQ ou equivalente)

---

## Restrições

A única limitação obrigatória é o uso da runtime **Node.js**.

Você tem total liberdade para escolher bibliotecas auxiliares, ORMs, drivers de fila
e organização do projeto.

Acaso você esteja utilizando este projeto como meio de estudo, recomendamos o uso
da biblioteca padrão `http` do Node.js para lidar com requisições web.

---

## O que estamos avaliando

Este teste busca avaliar as seguintes competências:

1. Integração com APIs externas;
2. Uso correto de filas assíncronas;
3. Controle de concorrência e taxa de processamento;
4. Modelagem e uso de banco de dados MongoDB;
5. Domínio sobre a linguagem JavaScript;
6. Domínio sobre a runtime `node.js`;
7. Capacidade de organização de código e separação de responsabilidades;
8. Capacidade de lidar com contêineres Docker e ambientes compostos

---