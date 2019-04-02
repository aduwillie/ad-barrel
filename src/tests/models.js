const Database = require('../database');
const DBModel = require('../db-model');
const config = require('./knexfile');

const DB = new Database(config);

const ClassModel = new DBModel(DB.knex, 'classes');
const StudentModel = new DBModel(DB.knex, 'students');
const TeacherModel = new DBModel(DB.knex, 'teachers');

DB.addDBModel('Class', ClassModel);
DB.addDBModel('Student', StudentModel);
DB.addDBModel('Teacher', TeacherModel);

Database.addOneToManyRelationship(ClassModel, StudentModel, 'class_id');
Database.addManyToManyRelationship(TeacherModel, StudentModel, 'teachers_students', 'teacher_id', 'student_id');

module.exports = DB;
