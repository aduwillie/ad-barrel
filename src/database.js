const Knex = require('knex');
const Redis = require('redis');
const Joi = require('joi');

const DBModel = require('./db-model');

const validateKnexConfig = (config) => Joi.assert(config, Joi.object({
    client: Joi.string().valid([ 'mysql', 'pg', 'sqlite3' ]).required(),
    connection: Joi.object({
        host: Joi.string().required(),
        user: Joi.string().required(),
        password: Joi.string().required(),
        database: Joi.string().required(),
    }),
    pool: Joi.object().optional(),
    migrations: Joi.object().optional(),
}));

const validateRedisConfig = (config) => Joi.assert(config, Joi.object({
    host: Joi.string().required(),
}).optional());

class Database {
    constructor(knexConfig, redisConfig) {
        validateKnexConfig(knexConfig);
        validateRedisConfig(redisConfig);
        this.knex = Knex(knexConfig);
        this.redis = redisConfig ? Redis.createClient(redisConfig) : null;
    }

    addDBModel(key, model) {
        Joi.assert(key, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(model, Joi.object().type(DBModel).required());

        this[key] = model;
        return this;
    }

    static addOneToManyRelationship(parentModel, childModel, parentRefField, where = {}) {
        Joi.assert(parentModel, Joi.object().type(DBModel).required());
        Joi.assert(childModel, Joi.object().type(DBModel).required());
        Joi.assert(parentRefField, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(where, Joi.object());

        parentModel._addChildModel(childModel);
        childModel._addParentModel(parentModel, parentRefField, where);
    }

    static addManyToManyRelationship(firstModel, secondModel, junctionTable, firstRefField, secondRefField, associationFields = []) {
        Joi.assert(firstModel, Joi.object().type(DBModel).required());
        Joi.assert(secondModel, Joi.object().type(DBModel).required());
        Joi.assert(junctionTable, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(firstRefField, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(secondRefField, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(associationFields, Joi.array().items(Joi.string()).optional());

        firstModel._addAssociateModel(secondModel, junctionTable, secondRefField, firstRefField, associationFields);
        secondModel._addAssociateModel(firstModel, junctionTable, firstRefField, secondRefField, associationFields);
    }

    isRedisReady() {
        return Promise.resolve(this.redis.ready);
    }

    isSQLReady() {
        return this.knex.raw('select 1 as isUp')
            .then(() => Promise.resolve(true));
    }
}

module.exports = Database;
