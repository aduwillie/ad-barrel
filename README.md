# Ad-Barrel
This is a data mapper project.

## Installation
Using `ad-barrel.js` is very simple. All that is needed is to use `npm` or `yarn` to pull it into your project.

```npm install ad-barrel```
```yarn add ad-barrel```

## Getting Started
Ad-Barrel is not schema-oriented or opinionated. This means that data is entered as pure JS objects. Ad-Barrel is dependent on Knex as a query builder. Aside the `Database` class, you are free to use any of the 3 models:

- `ApplicationModel` (if you need to abstract the concept of AppId and AppSecret)
- `DBModel`
- `CacheModel` (if you prefer to use redis to cache your db interactions)

The most basic starter for an `ad-barrel` project is to create a database instance.

```
const { Database, DBModel, CacheModel } = require('ad-barrel');

const knexConfig = {
  client: 'mysql',
  connection: {
    host : '127.0.0.1',
    user : 'your_database_user',
    password : 'your_database_password',
    database : 'your_database_name'
  }
};

const DB = new Database(knexConfig);
```

If a redis configuration is available and would be used in tandem with a `CacheModel`, the only requirements is to pass the Redis config as the second parameter.

```
const knexConfig = {
  client: 'mysql',
  connection: {
    host : '127.0.0.1',
    user : 'your_database_user',
    password : 'your_database_password',
    database : 'your_database_name',
  },
};

const redisConfig = {
    host: '127.0.0.1',
};

const DB = new Database(knexConfig, redisConfig);
```

The above creates a Database instance which is an abstraction of your high level database related concerns. The `Database` exposes the following methods:

* `addDBModel(key, model)`
* `addOneToManyRelationship(parentModel, childModel, parentRefField, where = {})`
* `addManyToManyRelationship(firstModel, secondModel, junctionTable, firstRefField, secondRefField, associationFields = [])`
* `isRedisReady()`
* `isSQLReady()`

NB: Both `addOneToManyRelationship` and `addManyToManyRelationship` are static methods

If everything is running smoothly and the database(s) are well connected i.e MySQL, Postgres and/or Redis, executing `isSQLReady()` and `isRedisReady()` should return a promise which resolves to true.

```
DB.isRedisReady();
DB.isSQLReady();
```

Once a database instance is created and connections are verified to be active, model abstractions of your database entities can be created and their relationships established. All of this should be done as an abstraction of your database schema. A `DBModel` is primarily used to implement this concept. This class expects 2 arguments, a live connection to your sql-database and the name of the table.

The `DBModel` fulfills various scenarios of abstraction:

### Scenario 1 - A simple database table

```
const PersonModel = new DBModel(DB.knex, 'persons');
DB.addModel('Person', PersonsModel);
```

### Scenario 2 - A one-to-many relationship

This uses the concepts of `parent` and `child` models to abstract the interactions. The `parent` is the model with the `one` and the child is the model with the `many` relationship. Below is an example of an one-to-many relationship between a class(one) and students(many).

```
const ClassModel = new DBModel(DB.knex, 'classes');
const StudentModel = new DBModel(Database.knex, 'students');

DB.addModel('Class', ClassModel);
DB.addModel('Student', StudentModel);

Database.addOneToManyRelationship(ClassModel, StudentModel, 'class_id') // static method
```

The third parameter i.e. `class_id` represents the parent(one) reference in the child(many) model.

### Scenario 3 - A one-to-many relationship

The difference between this scenario and `one-to-many` is that, there is the presence of a `Junction Table' which we would prefer not to manage. There could also be a special query which would want to attach to the model especially in a partitioned environment. Below is an example of a many-to-many relationship between a class and a teacher.

```
const ClassModel = new DBModel(DB.knex, 'classes');
const TeacherModel = new DBModel(DB.knex, 'teachers');

DB.addModel('Class', ClassModel);
DB.addModel('Teacher', TeacherModel);

Database.addManyToManyRelationship(ClassModel, TeacherModel, 'class_teacher', 'class_id', 'teacher_id') // static method
```

## An Example 

```
const { Database, DBModel, CacheModel } = require('ad-barrel');

const knexConfig = {
  client: 'mysql',
  connection: {
    host : '127.0.0.1',
    user : 'your_database_user',
    password : 'your_database_password',
    database : 'your_database_name'
  }
};

const redisConfig = {
    host: '127.0.0.1',
};

const DB = new Database(knexConfig, redisConfig);
if (!(DB.isRedisReady() && DB.isSQLReady())) {
    throw new Error('One or all of the database connections is/are not ready');
};

const ClassModel = new DBModel(DB.knex, 'classes');
const StudentModel = new DBModel(Database.knex, 'students');
const TeacherModel = new DBModel(DB.knex, 'teachers');

DB.addModel('Class', ClassModel);
DB.addModel('Student', StudentModel);
DB.addModel('Teacher', TeacherModel);

Database.addOneToManyRelationship(ClassModel, StudentModel, 'class_id');
Database.addManyToManyRelationship(ClassModel, TeacherModel, 'class_teacher', 'class_id', 'teacher_id');

// Create a dummy userUUID (user performing the following actions)
const userUUID = '9a074430-2316-4b51-8a6b-fc07b9cd123b';

// create a new class
const createAttrs = { name: 'class 1' };
await DB.Class.create(createAttrs, userUUID, true);
```

## The DBModel

This class is an abstraction of data interactions within the data layer. This implements the `Repository Pattern` and allows for all the CRUD operations on the model. All the commands expect a user uuid (user executing the command).

### Create

```
create(attrs, userUUID, fetch = true);
```
The first argument is the object to create. It shoud be noted that fields such as `uuid`, `last_modified_by`, `last_modified_at` and `deleted` will be added to the passed in create object (first argument). If fetch is specified, the entire db record will be returned.

### Read

```
findById(id);
findByUUID(uuid);
findIdsByParentRef(ref, parentTable); // used with a one-to-many relationship
findWhere(attrs); // custom object container the field and values to use with the query
```

### Update

```
update(id, attrs, userUUID);
```

## Testing

Run the npm script command in the root of the project directory. 

```
npm run test
```

The above command would:

- Move to the `src/tests` directory
- Run the `start_tests.sh` script
- Move back to the root of the project

You need to ensure that `start_tests.sh`, `setup_db.sh` and `clean_db.sh` scripts are executable. You can do so with `chmode +x <file_name>`.
