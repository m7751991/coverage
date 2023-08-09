
// 引入 mongoose 
const mongoose = require('mongoose')
const url = "mongodb://121.37.98.46:27017/test";
// 连接数据库，自动新建 ExpressApi 库
mongoose.connect(url).then(res=>{
console.log('连接成功');
}).catch(e=>{console.log(e,'连接失败');})

module.exports = mongoose
