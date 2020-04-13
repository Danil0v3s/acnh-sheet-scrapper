const path = require('path');
const fs = require('fs');
const allItemsJson = require('./files/items.json');
const { camelCase, zipObject, groupBy, keyBy, mapValues } = require('lodash');

const transformCsv = location => {
    const file = fs.readFileSync(path.join(__dirname, location), 'utf8').split('\n');
    const keys = file.shift().split(',').map(key => camelCase(key));
    const rows = file.slice(1).map(row => row.split(','));
    return rows.map(row => zipObject(keys, row));
}

const mapCatchAndMuseumPhrases = json => {
    return Object.keys(json).map(key => {
        let obj = json[key];
        return {
            fileName: obj['file-name'],
            name: obj.name['name-en'],
            catchPhrase: obj['catch-phrase'],
            museumPhrase: obj['museum-phrase']
        }
    })
}

const fillItemsData = (items, fullItemDetails) => {
    const catchPhrasesFish = mapCatchAndMuseumPhrases(require('./files/fish_phrases.json'));
    const catchPhrasesInsect = mapCatchAndMuseumPhrases(require('./files/bugs_phrases.json'));
    const fiDetailsArray = fullItemDetails.map(({ primaryKey, size, ingameName, category }) => ({ primaryKey, size, ingameName: camelCase(ingameName), category }));
    const fiDetails = mapValues(keyBy(fiDetailsArray, 'ingameName'));

    items.forEach(item => {
        const fullDetail = fiDetails[camelCase(item.name)];
        if (fullDetail) {
            item.id = fullDetail.primaryKey;
            item.size = fullDetail.size;

            if (item.category == "Bugs" || item.category == "Fish") {
                const arr = item.category == "Bugs" ? catchPhrasesInsect : catchPhrasesFish
                try {
                    const { catchPhrase, museumPhrase } = arr.filter(el => camelCase(el.name) == camelCase(item.name) || camelCase(el.fileName) == camelCase(item.name))[0]
                    item.catchPhrase = catchPhrase
                    item.museumPhrase = museumPhrase
                } catch (e) {
                    console.log(e, item.name)
                }
            }
        }
    });
}

exports.scrapeLocalFiles = async (mongoClient) => {
    console.log('Starting parse');
    const mongoCollection = mongoClient.db('nookcommunity').collection('items');
    const fullItemDetails = transformCsv('files/ItemParam.csv');
    const items = allItemsJson.results;

    fillItemsData(items, fullItemDetails);

    console.log('Parse finished. Saving...');
    mongoCollection.insertMany(items);
}