#!/bin/bash
set -e

echo "Clearing MySQL database $DB_NAME"
if [ "$MYSQL_HOST" == "127.0.0.1" ]
then
    echo "Running in CI"
    mysql -u $MYSQL_USER -e "drop database if exists $DB_NAME; create database $DB_NAME CHARACTER SET utf8 COLLATE utf8_general_ci;"; 
else
    mysql -u $DB_USER -p $DB_PASSWORD -h $DB_HOST -e "drop database if exists $DB_NAME; create database $DB_NAME CHARACTER SET utf8 COLLATE utf8_general_ci;"; 
fi

if [ "$NODE_ENV" == "test" ]
then
    echo "Running DB Migrations..."
    npm run migrate:latest
fi
