FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

ENV NODE_ENV=production
ENV PORT=13000

EXPOSE 13000

CMD ["yarn", "start:prod"]