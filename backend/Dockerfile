FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/server.js"]
