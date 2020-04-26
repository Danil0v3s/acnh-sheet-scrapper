const { GoogleSpreadsheet } = require('google-spreadsheet');
const { camelCase, zipObject } = require('lodash');
const axios = require('axios');
const { googleApiKey, sourceSheetId } = require('../config/vars');
const fs = require("fs");
const path = require('path');

const getUrl = (sheet, range) => `https://sheets.googleapis.com/v4/spreadsheets/${sourceSheetId}/values/${sheet}!${range}?key=${googleApiKey}&valueRenderOption=FORMULA`;

const downloadImages = async (parsed) => {
    for (category of parsed) {
        for (item of category.values) {
            const { filename, image } = item
            try {
                const url = image.split("\"")[1]
                const response = await axios.request({ url, responseType: 'stream', method: 'get' })
                response.data.pipe(fs.createWriteStream(path.join(__dirname, `/../public/images/${filename}.png`)));
            } catch (e) {
                console.log(filename)
            }
        }
    }
}

const downloadImage = async (url, filePath) => {
    try {
        const response = await axios.request({ url, responseType: 'stream', method: 'get' })
        response.data.pipe(fs.createWriteStream(filePath));
    } catch (e) {
        console.log(url)
    }
}

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

const fillItemData = (category, item) => {
    const catchPhrasesFish = mapCatchAndMuseumPhrases(require('./files/fish_phrases.json'));
    const catchPhrasesInsect = mapCatchAndMuseumPhrases(require('./files/bugs_phrases.json'));
    item.gameCategory = category;

    if (item.gameCategory == "bugs" || item.gameCategory == "fish") {
        const arr = item.gameCategory == "bugs" ? catchPhrasesInsect : catchPhrasesFish;
        try {
            const { catchPhrase, museumPhrase } = arr.filter(el => camelCase(el.name) == camelCase(item.name) || camelCase(el.fileName) == camelCase(item.name))[0];
            item.catchPhrase = catchPhrase;
            item.museumPhrase = museumPhrase;
        } catch (e) {
            console.log(e, item.name);
        }
    }

    if (item.startTime) {
        item.startTime = item.startTime * 24;
    }

    if (item.endTime) {
        item.endTime = item.endTime * 24;
    }

    Object.keys(item).forEach(key => {
        let value = item[key];
        try {
            if (value.includes && value.includes("=IMAGE")) {
                item[key] = value.split("\"")[1];
            }
        } catch (e) {
            console.log(value, item);
        }
    });

    return item
}

const parseRawData = rawData => {
    const parsed = rawData.map(({ type, values }) => {
        return {
            type,
            values: values.map(item => {
                fillItemData(type, item)
                return {
                    ...item
                }
            })
        }
    })

    return parsed;
}

exports.init = async () => {

    const files = fs.readdirSync(path.join(__dirname, `./sheet/`))
    if (files.length == 0) {
        const doc = new GoogleSpreadsheet(sourceSheetId);
        await doc.useApiKey(googleApiKey);
        await doc.loadInfo();
    
        const sheets = doc.sheetsByIndex.slice(1);
        const mapped = [];
    
        for (sheet of sheets) {
            const { title, lastColumnLetter, rowCount } = sheet;
            const range = `A1:${lastColumnLetter}${rowCount}`;
    
            const { data } = await axios.get(getUrl(title, range));
            if (!data || data.values.length == 0) {
                return;
            }
    
            const keys = data.values.shift().map(key => camelCase(key == "" ? "number" : key));
            const values = data.values;
    
            fs.writeFileSync(path.join(__dirname, `./sheet/${camelCase(title)}.json`), JSON.stringify({
                type: camelCase(title),
                values: values.map(row => zipObject(keys, row))
            }))
    
            mapped.push({
                type: camelCase(title),
                values: values.map(row => zipObject(keys, row))
            });
        }
    } else {
        files
        .filter(file => file.split("_").length == 1)
        .map(file => JSON.parse(fs.readFileSync(path.join(__dirname, `./sheet/${file}`), 'utf8')))
        .map(category => {
            return {
                ...category,
                values: category.values.map(item => fillItemData(category.type, item))
            }
        }).forEach(category => fs.writeFileSync(path.join(__dirname, `./parsed/${camelCase(category.type)}.json`), JSON.stringify(category.values)))
    }
}