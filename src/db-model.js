const Joi = require('joi');
const UUID = require('uuid');
const Promise = require('bluebird');

class DBModel {
    constructor(knex, tableName) {
        Joi.assert(tableName, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());

        this._knex = knex;
        this._table = tableName;
        this._children = new Set();
        this._parents = new Set();
        this._parentReferences = {};
        this._associates = new Set();
        this._associateReferences = {};
    }

    addAssociation(id, userUUID, associateRefs = [], associateTable, associationFields = []) {
        Joi.assert(id, Joi.number().required());
        Joi.assert(associateRefs, Joi.array().items(Joi.number()).optional());
        Joi.assert(associateTable, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(associationFields, Joi.array().items(Joi.object()).optional());

        const { junctionTable, associateRefField, idField } = this._associateReferences[associateTable];
        const deleteQuery = this._knex(junctionTable);
        const associateQueries = [];
        const updateAttrs = {
            uuid: UUID.v4(),
            last_modified_by: userUUID,
            last_modified_at: this._knex.fn.now(6),
        };
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
            associateQueries.push(Object.assign({}, updateAttrs, query, associateFieldValues[0] || {}));
        }
        
        return deleteQuery.del()
            .then(() => this._knex(junctionTable).insert(associateQueries))
            .then(results => Promise.resolve(results));
    }

    _addAssociateModel(associateModel, junctionTable, associateRefField, idField, associationFields = []) {
        Joi.assert(junctionTable, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(associateRefField, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(idField, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
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
        this._children.add(childModel);
    }

    _addParentModel(parentModel, parentRefField, where = {}) {
        Joi.assert(parentRefField, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());
        Joi.assert(where, Joi.object().optional());

        this._parents.add(parentModel);
        this._parentReferences[parentModel._table] = {
            parentRefField,
            where,
        }
    }

    create(attrs, userUUID, fetch = true) {
        Joi.assert(attrs, Joi.object().optional());
        Joi.assert(userUUID, Joi.string().uuid().required());
        Joi.assert(fetch, Joi.bool().required());

        const insertAttrs = Object.assign(attrs, {
            last_modified_by: userUUID,
            last_modified_at: this._knex.fn.now(6),
            uuid: UUID.v4(),
            deleted: 0,
        });
        return this._knex(this._table)
            .returning('id')
            .insert(insertAttrs)
            .then(ids => ids[0])
            .then(id => {
                if (!fetch) return Promise.resolve(id);
                return this.findById(id);
            });
    }

    delete(id, userUUID, soft = true, skipAssociationRecords = false) {
        Joi.assert(id, Joi.number().required());
        Joi.assert(userUUID, Joi.string().uuid().required());
        Joi.assert(soft, Joi.bool().required());
        Joi.assert(skipAssociationRecords, Joi.bool().required());

        if (skipAssociationRecords) {
            if (soft) return this.update(id, { deleted: 1 }, userUUID);
            return this._knex(this._table).where({ id }).del();
        }

        return this._deleteAssociationRecords(id, userUUID, soft)
            .then(() => Promise.map(Array.from(this._children), (child) => {
                return child.findIdsByParentRef(id, this._table)
                    .then(childIds => Promise.map(childIds, childId => child.delete(childId, userUUID, soft, skipAssociationRecords)));
            }))
            .then(() => {
                if (soft) return this.update(id, { deleted: 1 }, userUUID);
                return this._knex(this._table).where({ id }).del();
            })
            .then(() => Promise.resolve());
    }

    _deleteAssociationRecords(id, userUUID, soft = true) {
        Joi.assert(id, Joi.number().required());
        Joi.assert(userUUID, Joi.bool().required());
        Joi.assert(soft, Joi.bool().required());

        return Promise.map(this._associates, (associate) => {
            const { junctionTable, idField } = this._associateReferences[associate._table];

            let query =  this._knex(junctionTable)
                .where(idField, id);
            
            if (soft) {
                const attrs = {
                    last_modified_by: userUUID,
                    last_modified_at: this._knex.fn.now(6),
                    deleted: 1,
                };
                query = query.returning('id').update(attrs);
            } else {
                query = query.del();
            }
            
            return query
                .then(() => Promise.resolve(id));
        });
    }

    findById(id) {
        Joi.assert(id, Joi.number().required());

        return this.findWhere({ id })
            .then(items => Promise.resolve(items[0]));
    }

    findByUUID(uuid) {
        Joi.assert(uuid, Joi.string().uuid().required());

        return this.findWhere({ uuid })
            .then(items => Promise.resolve(items[0]));
    }

    findIdsByParentRef(ref, parentTable) {
        Joi.assert(ref, Joi.number().required());
        Joi.assert(parentTable, Joi.string().regex(/^[a-zA-Z0-9_]+$/).required());

        const  { parentRefField, where } = this._parentReferences[parentTable];
        if (!parentRefField) return Promise.reject(new Error('Invalid parent table'));
        const query = { deleted: 0 };
        query[parentRefField] = ref;
        return this._knex(this._table)
            .select('id')
            .where(Object.assign({}, query, where))
            .then(results => Promise.resolve(results.map(r => r.id)));
    }

    findWhere(attrs = {}) {
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
        
        const updateAttrs = Object.assign({}, {
            last_modified_by: userUUID,
            last_modified_at: this._knex.fn.now(6),
        }, attrs);
        return this._knex(this._table).update(updateAttrs).where({ id })
            .then(() => Promise.resolve(id));
    }
}

module.exports = DBModel;
