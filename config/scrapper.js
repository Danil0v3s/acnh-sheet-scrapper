const { GoogleSpreadsheet } = require('google-spreadsheet');
const { camelCase, zipObject } = require('lodash');
const axios = require('axios');
const { googleApiKey, sourceSheetId } = require('./vars');


const doc = new GoogleSpreadsheet(sourceSheetId);

const getUrl = (sheet, range) => `https://sheets.googleapis.com/v4/spreadsheets/${sourceSheetId}/values/${sheet}!${range}?key=${googleApiKey}&valueRenderOption=FORMULA`

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
                    } else {
                        delete item.variant
                    }
                }

                return {
                    ...item
                }
            })
        }
    })

    parsed.length
}

exports.init = async () => {
    await doc.useApiKey(googleApiKey);
    await doc.loadInfo();

    const sheets = doc.sheetsByIndex.slice(1);
    const mapped = [];

    for (index in sheets) {
        const { title, lastColumnLetter, rowCount } = sheets[index];
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