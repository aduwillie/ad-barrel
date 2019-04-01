const Joi = require('joi');
const DBModel = require('../db-model');

const validateAlphaNumeric = (name) => Joi.assert(name, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());

const validateDBModel = (model) => Joi.assert(model, Joi.object().type(DBModel).required());

const validateKnexConfig = (config) => Joi.assert(config, Joi.object({
    client: Joi.string().valid([ 'mysql', 'pg', 'sqlite3' ]).required(),
    connection: Joi.object({
        host: Joi.string().required(),
        user: Joi.string().required(),
        password: Joi.string().required(),
        database: Joi.string().required(),
    }),
}));

const validateRedisConfig = (config) => Joi.assert(config, Joi.object({
    host: Joi.string().required(),
}).optional());

module.exports = {
    validateAlphaNumeric,
    validateDBModel,
    validateKnexConfig,
    validateRedisConfig,
};
