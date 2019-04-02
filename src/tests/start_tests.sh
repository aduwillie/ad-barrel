#!/bin/bash
set -e

echo "Start all test containers"
npm run start:test

echo "Prepare database"
docker-compose exec barrel_test src/tests/setup_db.sh

echo "Run tests"
docker-compose exec barrel_test npm run _test

echo "Clean database"
docker-compose exec barrel_test src/tests/clean_db.sh

echo "Clean containers"
docker-compose down
