#!/bin/bash
# Script para inicializar UrbanGoal (frontend y backend en un solo contenedor)

docker build -t urban-goal-all .
docker run -d --name urban-goal-all --restart=always -p 3000:3000 -p 4000:4000 urban-goal-all

echo "\nUrbanGoal inicializado."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000"
