const DBModel = require('./db-model');
const {
    REDIS_DEFAULT_TTLS,
    REDIS_PREFIX,
} = require('./utils/constants');

class CacheModel extends DBModel {
    constructor(knex, redis, tableName, redisPrefix, cacheKey = null) {
        super(knex, tableName);
        this._redis = redis;
        this._redisPrefix = redisPrefix;
        this._cacheKey = cacheKey || this._table;
        this._ttls = Object.assign({}, REDIS_DEFAULT_TTLS);
    }

    create(attrs, userUUID, fetch = true) {
        return super.create(attrs, userUUID, fetch)
            .then(item => {
                const key = _getKey(`${REDIS_PREFIX.ID}${item.id}`);
                this._redis.set(key, JSON.stringify(item), 'EX', REDIS_DEFAULT_TTLS.create);
                return Promise.resolve(item);
            })
    }

    delete(id, userUUID) {
        return this.findById(id)
            .then(obj => {
                if (!obj) return Promise.reject(new Error('Inalid delete operation'));
                return super.delete(obj.id, userUUID)
            })
            .then(() => {
                const key = _getKey(`${REDIS_PREFIX.ID}${id}`);
                this._redis.del(key);
            })
    }

    findById(id) {
        if (!this._redis.ready) return super.findById(id);
        const key = _getKey(`${REDIS_PREFIX.ID}${item.id}`);
        return this._redis.getAsync(key)
            .then((data) => {
                if (!data) return super.findById(id);
                return JSON.parse(data);
            })
            .then((item) => {
                if (!item) return Promise.resolve(item);
                return this._redis.setAsync(key, JSON.stringify(item), 'EX', this.ttls.findById)
                    .then(() => Promise.resolve(item));
            })
    }

    _getKey(suffix) {
        return `${this._redisPrefix}${this._cacheKey}:${suffix}`;
    }
}

module.exports = CacheModel;
