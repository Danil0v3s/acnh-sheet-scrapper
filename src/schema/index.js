import { SchemaComposer } from 'graphql-compose';
import db from '../utils/db';// eslint-disable-line no-unused-vars
import { UserQuery, UserMutation } from './user';
import { TaskQuery, TaskMutation } from './task';
const schemaComposer = new SchemaComposer();

schemaComposer.Query.addFields({
    ...UserQuery,
    ...TaskQuery
})

schemaComposer.Mutation.addFields({
    ...UserMutation,
    ...TaskMutation
})

export default schemaComposer.buildSchema();