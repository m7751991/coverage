const express = require('express');
const app = express();
const im = require('./middleware/index');
const router = require('./router/index.js')
require('./config/db')

app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
  res.header('X-Powered-By', ' 3.2.1');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  next();
});
app.use('/coverage', im.createHandler());
app.use('/front',router.router())
app.use('/api',router.apiRoute())

// Handling static resources
app.use(express.static('public'));
// Handling static resources in coverage-front directory
app.use('/coverage-front', express.static('coverage-front'));




app.listen(3199);
