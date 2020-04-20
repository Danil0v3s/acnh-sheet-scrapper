const { GoogleSpreadsheet } = require('google-spreadsheet');
const { camelCase, zipObject } = require('lodash');
const axios = require('axios');
const { googleApiKey, sourceSheetId } = require('../config/vars');


const doc = new GoogleSpreadsheet(sourceSheetId);

const getUrl = (sheet, range) => `https://sheets.googleapis.com/v4/spreadsheets/${sourceSheetId}/values/${sheet}!${range}?key=${googleApiKey}&valueRenderOption=FORMULA`;

const parseRawData = rawData => {
    const parsed = rawData.map(({ type, values }) => {
        return {
            type,
            values: values.map(item => {
                const { filename } = item

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