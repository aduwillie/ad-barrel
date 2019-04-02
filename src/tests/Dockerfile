FROM node:dubnium

WORKDIR /app

RUN apt-get update \
    && apt-get install -y mysql-client

EXPOSE 8080

COPY /src ./src
COPY package.json ./package.json
COPY src/tests/migrations ./migrations
COPY src/tests/knexfile.js knexfile.js
COPY src/tests/setup_db.sh ./setup_db.sh

RUN chmod 777 ./setup_db.sh

RUN npm install

ENTRYPOINT /bin/bash -c -- "sleep infinity"