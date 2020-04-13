const request = require('request-promise');
const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const allItemsJson = require('./files/items.json');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { camelCase, zipObject, groupBy, map } = require('lodash');
const { googleApiKey, sourceSheetId } = require('../config/vars');


const doc = new GoogleSpreadsheet(sourceSheetId);

const getUrl = (sheet, range) => `https://sheets.googleapis.com/v4/spreadsheets/${sourceSheetId}/values/${sheet}!${range}?key=${googleApiKey}&valueRenderOption=FORMULA`;

const scrapeVariants = html => {
    const $ = cheerio.load(html);
    const imgDivs = $('div[class="post-image-container"]')
    return imgDivs.map((i, div) => $(div).attr().id)
}

const fetchVariants = async (collections) => {
    for (collection of collections) {
        const variantItems = collection.values.filter(item => item.hasVariant);

        for (variantItem of variantItems) {
            const content = await request(variantItem.variant);
            const variants = scrapeVariants(content);

            variantItem.variant = variants;
        }
    }
}

const parseRawData = rawData => {
    const parsed = rawData.map(({ type, values }) => {
        return {
            type,
            values: values.map(item => {
                const { image, variant } = item

                if (image && image.includes("=image(\"")) {
                    item.image = image.replace("=image(\"", "").replace("\")", "");
                }

                if (variant && variant.includes("=HYPERLINK(\"")) {
                    let itemVariant = variant.replace("=HYPERLINK(", "").replace("\"", "").replace(")", "").split("\"").join("").split(",");
                    if (itemVariant[1] === "Yes") {
                        item.variant = itemVariant[0]
                        item.hasVariant = true
                    } else {
                        item.hasVariant = false
                        delete item.variant
                    }
                } else {
                    item.hasVariant = false
                }

                return {
                    ...item
                }
            })
        }
    })

    fetchVariants(parsed)
}

const transformCsv = (location, kind = 'array') => {
    const file = fs.readFileSync(path.join(__dirname, location), 'utf8').split('\n');
    const keys = file.shift().split(',').map(key => camelCase(key));
    const rows = file.slice(1).map(row => row.split(','));
    const arr = rows.map(row => zipObject(keys, row));
    if (kind == 'object') {
        return zipObject(map(arr, 'primaryKey'), map(arr, 'ingameName'))
    }

    return arr
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

exports.scrapeGoogleDocs = async () => {
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

    parseRawData(mapped);
}

exports.scrapeLocalFiles = async () => {
    const recipes = transformCsv('files/Recipes.csv');
    const materials = transformCsv('files/Materials.csv', 'object');
    const fullItemDetails = transformCsv('files/ItemParam.csv');
    const catchPhrasesFish = mapCatchAndMuseumPhrases(require('./files/fish_phrases.json'));
    const catchPhrasesInsect = mapCatchAndMuseumPhrases(require('./files/bugs_phrases.json'));
    const items = allItemsJson.results;

    items.forEach(item => {
        const fullDetail = fullItemDetails.filter(i => camelCase(i.ingameName) == camelCase(item.name));
        if (fullDetail.length == 1) {
            item.id = fullDetail[0].primaryKey;
            item.size = fullDetail[0].size;

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

    items.length
}