require('dotenv-safe').config();

module.exports = {
    mongo: {
        uri: process.env.NODE_ENV === 'test' ? process.env.MONGO_URI_TESTS : process.env.MONGO_URI,
    },
    googleApiKey: process.env.GOOGLE_API_KEY,
    sourceSheetId: process.env.SOURCE_SHEET_ID,
    port: process.env.port
}