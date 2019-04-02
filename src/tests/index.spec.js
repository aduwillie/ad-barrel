/* eslint-disable */
const uuid = require('uuid');
const Database = require('./models');

describe('Database', () => {
    it('should be sql ready with correct config', async () => {
        const expected = await Database.isSQLReady();
        expect(expected).toBeTruthy();
    });

    it('should have models registered', () => {
        expect(Database.Class).not.toBeNull();
        expect(Database.Teacher).not.toBeNull();
        expect(Database.Student).not.toBeNull();
    });
});

describe('Class Model', () => {
    it('should have a child model', () => {
        expect(Database.Class._children).not.toBeNull();
        expect(Database.Class._children.size).toEqual(1);
        expect(Array.from(Database.Class._children)[0]).toBe(Database.Student);
    });
});
describe('Student Model', () => {
    it('should have a parent model', () => {
        expect(Database.Student._parents).not.toBeNull();
        expect(Database.Student._parents.size).toEqual(1);
        expect(Array.from(Database.Student._parents)[0]).toBe(Database.Class);
    });
});
describe('Teacher Model', () => {
    it('should have a an associate', () => {
        expect(Database.Teacher._associcates).not.toBeNull();
        expect(Database.Teacher._associates.size).toEqual(1);
        expect(Array.from(Database.Teacher._associates)[0]).toBe(Database.Student);
        expect(Database.Teacher._associateReferences['students']).not.toBeNull();
        const { junctionTable, associateRefField, idField, associationFields } = Database.Teacher._associateReferences['students'];
        expect(junctionTable).toEqual('teachers_students');
        expect(associateRefField).toEqual('student_id');
        expect(idField).toEqual('teacher_id');
        expect(associationFields.length).toEqual(0);
    });
});

describe('DBModel', () => {
    beforeAll(() => {
        this.userUUID = uuid.v4();
    });
    it('#create without fetch', async () => {
        const attrs = { name: uuid.v4() };
        // using the class model
        const id = await Database.Class.create(attrs, this.userUUID, false);
        expect(id).not.toBeNull();
        expect(typeof id === 'number').toBeTruthy();
    });
    it('#create with fetch', async () => {
        const attrs = { name: uuid.v4() };
        const obj = await Database.Class.create(attrs, this.userUUID, true);
        expect(obj).not.toBeNull();
        expect(obj.id).not.toBeNull();
        expect(obj.uuid).not.toBeNull();
        expect(obj.name).toEqual(attrs.name);
    });
    it('#findWhere', async () => {
        const attrs = { name: uuid.v4() };
        await Database.Class.create(attrs, this.userUUID, false);

        const foundObj = await Database.Class.findWhere({ name: attrs.name });
        expect(foundObj).not.toBeNull();
        expect(Array.isArray(foundObj)).toBeTruthy();
        expect(foundObj.find(x => x.name === attrs.name)).toBeDefined();
    });
    it('#findById', async () => {
        const attrs = { name: uuid.v4() };
        const createdObj = await Database.Class.create(attrs, this.userUUID, true);
        expect(createdObj).not.toBeNull();
        const foundObj = await Database.Class.findById(createdObj.id);
        expect(foundObj).not.toBeNull();
        expect(foundObj.id).toEqual(createdObj.id);
        expect(foundObj.uuid).toEqual(createdObj.uuid);
        expect(foundObj.name).toEqual(attrs.name);
    });
    it('#findByUUID', async () => {
        const attrs = { name: uuid.v4() };
        const createdObj = await Database.Class.create(attrs, this.userUUID, true);
        expect(createdObj).not.toBeNull();
        const foundObj = await Database.Class.findByUUID(createdObj.uuid);
        expect(foundObj).not.toBeNull();
        expect(foundObj.id).toEqual(createdObj.id);
        expect(foundObj.uuid).toEqual(createdObj.uuid);
        expect(foundObj.name).toEqual(attrs.name);
    });
    it('#delete', async () => {
        const classAttrs = { name: uuid.v4() };
        const createdClassId = await Database.Class.create(classAttrs, this.userUUID, false);
        console.log('created class', createdClassId);
        const teacherAttrs = { name: uuid.v4() };
        const teacherAttrs2 = { name: uuid.v4() };
        const studentAttrs = { name: uuid.v4(), class_id: createdClassId };

        const createdTeacherId = await Database.Teacher.create(teacherAttrs, this.userUUID, false);
        const createdTeacherId2 = await Database.Teacher.create(teacherAttrs2, this.userUUID, false);
        const createdStudentId = await Database.Student.create(studentAttrs, this.userUUID, false);

        await Database.Teacher.addAssociation(createdTeacherId, this.userUUID, [createdStudentId], 'students');
        console.log('after first add association');
        await Database.Teacher.addAssociation(createdTeacherId2, this.userUUID, [createdStudentId], 'students');
        console.log('after second add association');
        await Database.Teacher.delete(createdTeacherId, this.userUUID, true, true);

        const teacher1 = await Database.Teacher.findWhere({ name: teacherAttrs.name });
        const teacher2 = await Database.Teacher.findWhere({ name: teacherAttrs2.name });

        expect(teacher1.length).toEqual(0);
        expect(teacher2.length).toEqual(1);
    });
    it('#update', async () => {
        const attrs = { name: uuid.v4() };
        const newAttrs = { name: `${attrs.name}-new` };

        const createdClass = await Database.Class.create(attrs, this.userUUID, true);
        console.log('created class', createdClass);
        await Database.Class.update(createdClass.id, newAttrs, this.userUUID);
        const foundClass = await Database.Class.findById(createdClass.id);
        console.log('found class', foundClass);
        expect(foundClass.id).toEqual(createdClass.id);
        expect(foundClass.name).toEqual(newAttrs.name);
        expect(foundClass.last_modified_by).toEqual(this.userUUID);
        expect(foundClass.last_modified_at).not.toEqual(createdClass.last_modified_at);
    });
});
