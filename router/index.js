const express = require('express');
const bodyParser = require('body-parser');
const front = require('../controller/front')
const api = require('../controller/api')

function router(opt = {}) {
    const app = express()
    app.get('/', front.Index)
    return app
}


function apiRoute(){
    const app = express()
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());


    app.post('/getDemandList',api.getProjectList)
    app.post('/getCoverage',api.getCoverage)
    app.post('/createNewDemand',api.createNewDemand)


    app.get('/getProjectList',api.groupByAppId)
    return app
}



module.exports = {
    router,
    apiRoute
}