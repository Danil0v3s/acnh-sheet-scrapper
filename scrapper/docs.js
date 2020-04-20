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

const parseRawData = rawData => {
    const parsed = rawData.map(({ type, values }) => {
        return {
            type,
            values: values.map(item => {

                return {
                    ...item
                }
            })
        }
    })

    // downloadImages(parsed)
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