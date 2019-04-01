const Knex = require('knex');
const Redis = require('redis');
const Joi = require('joi');

const { 
    validateAlphaNumeric,
    validateDBModel, 
    validateKnexConfig,
    validateRedisConfig
} = require('./utils/validation');

class Database {
    constructor(knexConfig, redisConfig) {
        validateKnexConfig(knexConfig);
        validateRedisConfig(redisConfig);
        this.knex = Knex(knexConfig);
        this.redis = redisConfig ? Redis.createClient(redisConfig) : null;
    }

    addDBModel(key, model) {
       validateAlphaNumeric(key);
        validateDBModel(model);

        this[key] = model;
        return this;
    }

    addOneToManyRelationship(parentModel, childModel, parentRefField, where = {}) {
        validateDBModel(parentModel);
        validateDBModel(childModel);
        validateAlphaNumeric(parentRefField);
        Joi.assert(where, Joi.object());
        parentModel._addChildModel(childModel);
        childModel._addParentModel(parentModel, parentRefField, where);
    }

    addManyToManyRelationship(firstModel, secondModel, junctionTable, firstRefField, secondRefField, associationFields = []) {
        validateDBModel(firstModel);
        validateDBModel(secondModel);
        validateAlphaNumeric(junctionTable);
        validateAlphaNumeric(firstRefField);
        validateAlphaNumeric(secondRefField);
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
