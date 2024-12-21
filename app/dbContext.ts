import {createContext} from 'react';
import {DB, open} from "@op-engineering/op-sqlite";


export const createdDb = open({
    name: 'myDb',
});

// createdDb.execute(`
// CREATE virtual TABLE if not Exists
//   "registered_people" (
//     id integer primary key,
//     "name" text,
//     "face_embedding" F32_BLOB(128)
//   )`
// ).then(console.log).catch(console.error);
createdDb.execute(`
CREATE TABLE if not Exists
  "registered_people" (
    id integer primary key,
    name text
  )`
).then(console.log).catch(console.error);

createdDb.execute(`
CREATE TABLE if not Exists
  "face_embedding" (
    id integer REFERENCES registered_people (id) ON UPDATE CASCADE,
    face_embedding blob
  )`
).then(console.log).catch(console.error);

createdDb.execute(`
CREATE TABLE if not exists
  "attendance" (
    user_id integer REFERENCES registered_people (id) ON UPDATE CASCADE,
    attended_date TEXT default (CURRENT_DATE), -- Derived date
    attended_at TEXT DEFAULT CURRENT_TIME,
    CONSTRAINT pk_attend PRIMARY KEY (attended_date, user_id)
  )`
).then(console.log).catch(console.error)

const dbContext = createContext<DB>(createdDb);
export default dbContext