#!/bin/bash
# Script para iniciar backend y frontend juntos en un solo contenedor

# Iniciar backend
cd /app/UrbanGoal_BackEnd
npm install
yarn global add concurrently > /dev/null 2>&1 || npm install -g concurrently

# Iniciar ambos servicios
concurrently "npm start --prefix /app/UrbanGoal_BackEnd" "npm run build --prefix /app/UrbanGoal_FrontEnd && npx serve -s /app/UrbanGoal_FrontEnd/dist -l 3000"
