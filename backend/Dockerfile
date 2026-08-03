FROM node:20-alpine
WORKDIR /app
# Dépendances de build pour argon2 (compilation native sur musl/alpine)
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads
EXPOSE 4000
# Migration + seed au premier démarrage, puis lancement de l'API
CMD ["sh", "-c", "node src/db/migrate.js && node src/db/seed.js || true; node src/server.js"]
