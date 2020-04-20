const { GoogleSpreadsheet } = require('google-spreadsheet');
const { camelCase, zipObject } = require('lodash');
const axios = require('axios');
const { googleApiKey, sourceSheetId } = require('../config/vars');
const fs = require("fs");
const path = require('path');


const doc = new GoogleSpreadsheet(sourceSheetId);

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
    // const fiDetailsArray = fullItemDetails.map(({ primaryKey, size, ingameName, category }) => ({ primaryKey, size, ingameName: camelCase(ingameName), category }));
    // const fiDetails = mapValues(keyBy(fiDetailsArray, 'ingameName'));
    item.gameCategory = category
    let gCategory;
    if (category == "fishSouth" || category == "fishNorth") {
        gCategory = "fish"
    } else if (category == "bugsNorth" || category == "bugsSouth") {
        gCategory = "bugs"
    }
    if (gCategory == "bugs" || gCategory == "fish") {
        item.gameCategory = gCategory;
        const arr = gCategory == "bugs" ? catchPhrasesInsect : catchPhrasesFish
        try {
            const { catchPhrase, museumPhrase } = arr.filter(el => camelCase(el.name) == camelCase(item.name) || camelCase(el.fileName) == camelCase(item.name))[0]
            item.catchPhrase = catchPhrase
            item.museumPhrase = museumPhrase
        } catch (e) {
            console.log(e, item.name)
        }
    }

    if (item.startTime) {
        item.startTime = item.startTime * 24
    }

    if (item.endTime) {
        item.endTime = item.endTime * 24
    }

    if (item.house && item.house.includes('=IMAGE')) {
        const fileName = item.house.split('/').pop().split('.').shift()
        item.house = `images/${item.gameCategory}/${fileName}.png`
    }

    if (item.image && item.image.includes('=IMAGE')) {
        const fileName = item.image.split('/').pop().split('.').shift()
        item.image = `images/${item.gameCategory}/${fileName}.png`
    }

    if (item.image && item.image.includes('imgur')) {
        const fileName = item.image.split('/').pop().split('.').shift()
        const imagePath = `images/${item.gameCategory}`
        item.image = `${imagePath}/${fileName}.png`
        // const filePath = path.join(__dirname, `/../public/${item.image}`)
        // const url = `https://i.imgur.com/${fileName}.png`

        // if (!fs.existsSync(path.join(__dirname, `/../public/${imagePath}`))){
        //     fs.mkdirSync(path.join(__dirname, `/../public/${imagePath}`));
        // }

        // downloadImage(url, filePath);
    }
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

        const keys = data.values.shift().map(key => camelCase(key));
        const values = data.values;

        mapped.push({
            type: camelCase(title),
            values: values.map(row => zipObject(keys, row))
        });
    }

    return parseRawData(mapped);
}