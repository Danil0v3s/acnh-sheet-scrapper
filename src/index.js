Promise = require('bluebird');
const dotenv = require('dotenv-safe');
const { GraphQLServer } = require('graphql-yoga');
const mongoose = require('./config/mongoose');
const User = require('./models/user');

dotenv.config();

const typeDefs = `
type Query {
    getUser(id: ID!): User
    getUsers: [User]
}

type User {
    id: ID!,
    name: String!
    email: String!
}

type Mutation {
    addUser(name: String!, email: String!): User!
    deleteUser(id: ID!): String
}
`

const resolvers = {
    Query: {
        getUsers: () => User.find(),
        getUser: async (_, { id }) => {
            var result = await User.findById(id);
            return result;
        }
    },
    Mutation: {
        addUser: async (_, { name, email }) => {
            const user = new User({ name, email });
            await user.save();
            return user;
        },
        deleteUser: async (_, { id }) => {
            await User.findByIdAndRemove(id);
            return "User deleted";
        }
    }
}

const server = new GraphQLServer({ typeDefs, resolvers });
const connection = mongoose.connect();
connection.once("open", () => {
    server.start({
        cors: true,
        tracing: true,
        port: process.env.PORT,
        playground: process.env.NODE_ENV === 'development' ? '/playground' : false,
        introspection: true,
        tracing: true,
        path: '/'
    }, () => console.log('Server is running on localhost:4000'))
})