const mongoose = require('mongoose');

mongoose.Promise = Promise;

mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
    process.exit(-1);
});

mongoose.set('useCreateIndex', true);

exports.connect = () => {
    mongoose.connect(process.env.MONGO_URI, {
        autoIndex: true,
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 500,
        poolSize: 50,
        bufferMaxEntries: 0,
        keepAlive: 120,
        useNewUrlParser: true,
    });

    return mongoose.connection;
}