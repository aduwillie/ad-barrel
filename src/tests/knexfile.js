/* eslint-disable */
module.exports = {
    client: 'mysql',
    connection: {
        database: process.env.DB_NAME,
        user: process.env.MYSQL_USER,
        password: process.env.NODE_ENV === "ci" ? "" : process.env.DB_PASSWORD,
        host: process.env.MYSQL_HOST
    },
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'knex_migrations'
    }
};
