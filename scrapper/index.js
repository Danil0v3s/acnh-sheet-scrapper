const request = require('request-promise');
const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { camelCase, zipObject, groupBy } = require('lodash');
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
    const ItemParam = fs.readFileSync(path.join(__dirname, 'files/ItemParam.csv'), 'utf8').split('\n');
    const keys = ItemParam.shift().split(',').map(key => camelCase(key));
    const rows = ItemParam.slice(1).map(row => row.split(','));

    const json = rows.map(row => zipObject(keys, row));
    const categories = groupBy(json, 'category3');

    json.length
}