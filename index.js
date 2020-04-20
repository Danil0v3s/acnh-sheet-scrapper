const scrapper = require('./scrapper');
const docsScrapper = require('./scrapper/docs');
const express = require('express');
const app = express();
const { port } = require('./config/vars');

// app.get('/', async (req, res) => {
//     // const data = await docsScrapper.init();
//     res.send('hello');
// })

app.listen(port, () => `Started on ${port}`)