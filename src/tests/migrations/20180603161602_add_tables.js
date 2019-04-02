const tables = [ 'classes', 'students', 'teachers' ];

const createClassTable = (knex, Promise) => {
    return Promise.all([
        knex.schema.createTable('classes', (table) => {
            table.increments('id').primary();
            table.specificType('created_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.specificType('last_modified_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.string('last_modified_by', 40).notNullable();
            table.boolean('deleted').defaultTo(0);
            table.string('name', 1024).notNullable();
            table.uuid('uuid').unique().notNullable();
        })
    ])
};

const createTeacherTable = (knex, Promise) => {
    return Promise.all([
        knex.schema.createTable('teachers', (table) => {
            table.increments('id').primary();
            table.specificType('created_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.specificType('last_modified_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.string('last_modified_by', 40).notNullable();
            table.boolean('deleted').defaultTo(0);
            table.string('name', 1024).notNullable();
            table.uuid('uuid').unique().notNullable();
        })
    ]);
};

const createStudentTable = (knex, Promise) => {
    return Promise.all([
        knex.schema.createTable('students', (table) => {
            table.increments('id').primary();
            table.specificType('created_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.specificType('last_modified_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.string('last_modified_by', 40).notNullable();
            table.boolean('deleted').defaultTo(0);
            table.string('name', 1024).notNullable();
            table.uuid('uuid').unique().notNullable();

            table.integer('class_id').unsigned().notNullable().references('id').inTable('classes');
        })
    ]);
}

const createTeacherStudentTable = (knex, Promise) => {
    return Promise.all([
        knex.schema.createTable('teachers_students', (table) => {
            table.increments('id').primary();
            table.specificType('created_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.specificType('last_modified_at', 'TIMESTAMP(6)').defaultTo(knex.raw('CURRENT_TIMESTAMP(6)'));
            table.string('last_modified_by', 40).notNullable();
            table.boolean('deleted').defaultTo(0);
            table.uuid('uuid').unique().notNullable();

            table.integer('teacher_id').unsigned().notNullable().references('id').inTable('teachers');
            table.integer('student_id').unsigned().notNullable().references('id').inTable('students');
        })
    ]);
}
exports.up = function(knex, Promise) {
    return createClassTable(knex, Promise)
        .then(() => createTeacherTable(knex, Promise))
        .then(() => createStudentTable(knex, Promise))
        .then(() => createTeacherStudentTable(knex, Promise));
};

exports.down = function(knex, Promise) {
    return Promise.map(tables, (table) => knex.schema.dropTable(table));
};
