const REDIS_DEFAULT_TTLS = {
    create: 300,
    findById: 300,
    findByUUID: 300,
    findIdsByRef: 86400,
    getSummary: 86400,
};

const REDIS_PREFIX = {
    ID: 'id:',
    UUID: 'uuid:',
};

module.exports = {
    REDIS_DEFAULT_TTLS,
    REDIS_PREFIX,
};
