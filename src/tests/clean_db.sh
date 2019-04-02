#!/bin/bash
set -e

echo "Clearing MySQL database $DB_NAME"
mysql -u$DB_USER -p$DB_PASSWORD -h$DB_HOST -e "drop database if exists $DB_NAME;"

