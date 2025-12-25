FROM node:22.18.0-alpine3.22

RUN apk add --no-cache openssl

WORKDIR /test

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]