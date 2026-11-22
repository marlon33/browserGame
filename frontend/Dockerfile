FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN if [ -f package.json ]; then npm install; fi

COPY . .

EXPOSE 5173

CMD ["sh", "-c", "if [ -f package.json ]; then npm run dev -- --host 0.0.0.0; else tail -f /dev/null; fi"]