#!/bin/bash

export JWT_SECRET=test-jwt-secret
export JWT_EXPIRATION_TIME=1h
export ADMIN_SECRET=admin
export NODE_ENV=test
export DATABASE_HOST=localhost
export DATABASE_PORT=5433
export DATABASE_USERNAME=admin
export DATABASE_PASSWORD=changeit
export DATABASE_NAME=test_db
export DATABASE_LOGGING=false
export TEST_DATABASE_NAME=test_db
export DATABASE_SYNC=true
export CORS_ORIGIN=http://localhost:5173

cd ../database/test
docker-compose down
docker-compose up -d

echo "Waiting for database to be ready..."
sleep 5

cd ../../backend
yarn test:e2e 

cd ../database/test
docker-compose down 