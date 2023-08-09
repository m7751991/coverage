
const path = require('path');
const model =require('../model/Coverage')
function Index(req, res) {
    console.log("front");
    res.sendFile(path.resolve(__dirname, '../coverage-front/dist/index.html'));
}

module.exports = {
    Index,
}