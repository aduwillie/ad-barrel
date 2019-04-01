const UUID = require('uuid');
const Bcrypt = require('bcrypt');

const DBModel = require('./db-model');

class ApplicationModel extends DBModel {
    constructor(knex, tableName) {
        super(knex, tableName);
        this._encoding = 'base64';
        this._tokenRegex = /^[a-zA-Z0-9-]+:[a-z0-9]{32}$/;
    }

    create(attrs, userUUID) {
        const apiKey = UUID.v4().replace(/-/g, '');
        return Bcrypt.hash(apiKey, 10)
            .then(hash => Promise.resolve(Object.assign({}, attrs, { api_key: hash })))
            .then(obj => super.create(obj, userUUID, true))
            .then(result => Promise.resolve({}, result, { api_key: apiKey }));
    }

    static generateToken(clientId, clientSecret) {
        return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    }

    validateToken(token) {
        const parsedToken = new Buffer(token, 'base64').toString('ascii');
        const testPassed = this._tokenRegex.test(parsedToken);
        if (!testPassed) throw new Error('Invalid token');
        const [appUUID, apiKey] = parsedToken.split(':');
        return this.findByUUID(appUUID)
            .then((app) => {
                if (!app) return Promise.reject(new Error('No such application exists.'));
                return Promise.resolve(app);
            })
            .then(app => Bcrypt.compare(apiKey, app.api_key))
            .then(match => {
                if (!match) return Promise.reject(new Error('Invalid application key'));
                return match;
            });
    }
}

module.exports = ApplicationModel;
