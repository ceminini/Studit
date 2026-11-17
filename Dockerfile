FROM node:22

WORKDIR /app

ENV CI=1

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx expo export -p web

EXPOSE 8081
CMD ["npx", "expo", "serve", "--port", "8081"]