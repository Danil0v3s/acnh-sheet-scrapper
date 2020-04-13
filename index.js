Promise = require('bluebird');
const { mongo } = require('./config/vars');
const MongoClient = require('mongodb').MongoClient;
const scrapper = require('./scrapper');


MongoClient.connect(mongo.uri, function (err, client) {
    if (err) throw err;

    // client.db('nookcommunity').collection('items').deleteMany(function (err, obj) {
    //     if (err) throw err;
    //     console.log(obj.result.n + " document(s) deleted");
    //     client.close();
    // })

    scrapper.scrapeLocalFiles(client);
});