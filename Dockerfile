# Usa una imagen base oficial de Node.js
FROM node:20

WORKDIR /app

# Copia ambos proyectos
COPY UrbanGoal_FrontEnd ./UrbanGoal_FrontEnd
COPY UrbanGoal_BackEnd ./UrbanGoal_BackEnd
COPY start-all.sh ./start-all.sh

# Instala dependencias de ambos
RUN cd UrbanGoal_FrontEnd && npm install && cd ../UrbanGoal_BackEnd && npm install && npm install -g concurrently serve && chmod +x /app/start-all.sh

EXPOSE 3000 4000

CMD ["/app/start-all.sh"]
