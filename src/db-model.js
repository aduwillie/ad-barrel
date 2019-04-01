const Joi = require('joi');
const UUID = require('uuid');
const Promise = require('bluebird');

const {
    validateDBModel,
    validateAlphaNumeric,
} = require('./utils/validation');

class DBModel {
    constructor(knex, tableName) {
        validateAlphaNumeric(tableName);
        this._knex = knex;
        this._table = tableName;
        this._children = new Set();
        this._parents = new Set();
        this._parentReferences = {};
        this._associates = new Set();
        this._associateReferences = {};
    }

    addAssociation(id, associateRefs, associateTable, associationFields = []) {
        const { junctionTable, associateRefField, idField } = this._associateReferences[associateTable];
        const deleteQuery = this._knex(junctionTable);
        const associateQueries = [];
        for (let i = 0; i < associateRefs.length; i += 1) {
            const query = {};
            query[idField] = id;
            query[associateRefField] = associateRefs[i];

            // create a delete query
            if (i === 0) deleteQuery.where(query);
            else deleteQuery.orWhere(query);

            // build the associate query
            const associateFieldValues = associationFields.filter(a => a[associateRefField] === associateRefs[i]);
            if (associationFields.length > 1) return Promise.reject(new Error('Multiple association field entry'));
            associateQueries.push(Object.assign({}, query, associateFieldValues[0] || {}));
        }
        return deleteQuery.del()
            .then(() => this._knex(junctionTable).insert(associateQueries))
            .then(results => Promise.resolve(results));
    }

    _addAssociateModel(associateModel, junctionTable, associateRefField, idField, associationFields = []) {
        validateDBModel(associateModel);
        validateAlphaNumeric(junctionTable);
        validateAlphaNumeric(associateRefField);
        validateAlphaNumeric(idField);
        Joi.assert(associationFields, Joi.array().items(Joi.string()).optional());
        this._associates.add(associateModel);
        this._associateReferences[associateModel._table] = {
            junctionTable,
            associateRefField,
            idField,
            associationFields,
        };
    }

    _addChildModel(childModel) {
        validateDBModel(childModel);
        this._children.add(childModel);
    }

    _addParentModel(parentModel, parentRefField, where = {}) {
        validateDBModel(parentModel);
        validateAlphaNumeric(parentRefField);
        Joi.assert(where, Joi.object().optional())
        this._parents.add(parentModel);
        this._parentReferences[parentModel._table] = {
            parentRefField,
            where,
        }
    }

    create(attrs, userUUID, fetch = true) {
        Joi.assert(attrs, Joi.object().optional());
        const insertAttrs = Object.assign(attrs, {
            last_modified_by: userUUID,
            last_modified_at: this._knex.fn.now(),
            uuid: UUID.v4(),
            deleted = 0,
        });
        return this._knex(this._table)
            .returning('id')
            .insert(insertAttrs)
            .then(ids => ids[0])
            .then(id => {
                if (!fetch) return Promise.resolve(id);
                return findById(id);
            });
    }

    delete(id, userUUID, soft = true, skipAssociationRecords = false) {
        Joi.assert(id, Joi.number().required());
        Joi.assert(userUUID, Joi.string().uuid().required());
        if (soft === false) {
            return this._knex(this._table)
                .where({ id })
                .del();
        }
        const deleteAttrs = { deleted = 1 };
        return this.update(id, deleteAttrs, userUUID)
            .then(() => {
                if (skipAssociationRecords) return Promise.resolve();
                return this._deleteAssociationRecords(id)
                    .then(() => Promise.map(this._children, child => {
                        return child.findIdsByParentRef(id, this._table)
                            .then(childIds => Promise.map(childIds, childId => child.delete(childId, userUUID, soft, skipAssociationRecords)) )
                    }));
            })
            .then(() => Promise.resolve());
    }

    _deleteAssociationRecords(id) {
        return Promise.map(this._associates, (associate) => {
            const { junctionTable, idField } = this._associateReferences[associate._table];
            return this._knex(junctionTable)
                .where(idField, id)
                .del()
                .then(affectedRows => affectedRows.reduce((a, b) => a + b, 0));
        });
    }

    findById(id) {
        Joi.assert(id, Joi.number().required());
        return this.findWhere({ id })
            .then(items => Promise.resolve(items[0]));
    }

    findByUUID(uuid) {
        Joi.assert(userUUID, Joi.string().uuid().required());
        return this.findWhere({ uuid })
            .then(items => Promise.resolve(items[0]));
    }

    findIdsByParentRef(ref, parentTable) {
        const  { parentRefField, where } = this._parentReferences[parentTable];
        if (!parentRefField) return Promise.reject(new Error('Invalid parent table'));
        const query = { deleted: 0 };
        query[parentRefField] = ref;
        return this._knex(this._table)
            .select('id')
            .where(Object.assign({}, query, where))
            .then(results => Promise.resolve(results.map(r => r.id)));
    }

    findWhere(attrs) {
        Joi.assert(attrs, Joi.object().optional());
        return this._knex(this._table)
            .select()
            .where(Object.assign(attrs, { deleted: 0 }))
            .then(items => Promise.resolve(items));
    }

    update(id, attrs, userUUID) {
        Joi.assert(id, Joi.number().required());
        Joi.assert(attrs, Joi.object().optional());
        Joi.assert(userUUID, Joi.string().uuid().required());
        const updateAttrs = Object.assign({
            last_modified_by: userUUID,
            last_modified_at: this._knex.fn.now(),
        }, attrs);
        return this._knex(this._table).update(updateAttrs).where({ id })
            .then(() => Promise.resolve(id));
    }
}

module.exports = DBModel;
