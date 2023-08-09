const mongoose = require('../config/db')
const data = new mongoose.Schema({
    appId: "string",
    projectName:'string',
    env: 'string',
    createTime:'string',
    coverage: {
        type:'string'
    },

})
const dataModel = mongoose.model('coverage', data)


const createData = async (data) =>{
    return await dataModel.create(data)}

const findData = async (data) => await dataModel.findOne(data)

const findProjectList = async () => await dataModel.find({},{coverage:0})

const updataData = async (condition, data) =>{
    return await dataModel.updateOne(condition, data)
} 

const groupByAppId = async () => {
    return await dataModel.aggregate([
        {
            $group: {
                _id: "$appId",
                projectName: { $first: "$projectName" },
                env: { $first: "$env" },
            }
        },
        {
            $project: {
                _id: 0,
                appId: "$_id",
                projectName: 1,
                env: 1,
                createTime:1
            }
        }
    ])
}





module.exports = {
    createData,
    findData,
    updataData,
    findProjectList,
    groupByAppId,
    
}


