# Usa una imagen base oficial de Node.js
FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install mysql2 express

COPY . .

EXPOSE 4000

CMD ["node", "index.mysql.js"]
