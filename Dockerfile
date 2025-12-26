FROM node:22.18.0-alpine3.22

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

RUN npm ci

COPY . .

RUN rm -rf node_modules && npm ci --only=production && npm cache clean --force

EXPOSE ${NEST_PORT:-3000}

USER node

CMD ["node", "dist/main.js"]