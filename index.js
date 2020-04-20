const scrapper = require('./scrapper');
const docsScrapper = require('./scrapper/docs');
const express = require('express');
const app = express();
const { port } = require('./config/vars');

app.use(express.static('public'))

// app.get('/', async (req, res) => {
//     const data = await docsScrapper.init();
//     res.send(data);
// })

// app.listen(port, () => console.log(`Started on ${port}`))

docsScrapper.init();