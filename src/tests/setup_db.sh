#!/bin/bash
set -e

echo "Clearing MySQL database $DB_NAME"
mysql -u$DB_USER -p$DB_PASSWORD -h$DB_HOST -e "drop database if exists $DB_NAME; create database $DB_NAME CHARACTER SET utf8 COLLATE utf8_general_ci;"; 

if [ "$NODE_ENV" == "test" ]
then
    echo "Running DB Migrations..."
    npm run migrate:latest
fi
