require('dotenv-safe').config();

module.exports = {
    googleApiKey: process.env.GOOGLE_API_KEY,
    sourceSheetId: process.env.SOURCE_SHEET_ID
}