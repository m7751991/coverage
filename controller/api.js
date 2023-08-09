
const model =require('../model/Coverage')


async function getProjectList(req,res){
    try {
        const data = await model.findProjectList()
        res.json({
            status:true,
            data
        });
    } catch (error) {
        res.json({
            status:false,
            msg:'查询出错',
            error
        });
    }
}


async function getCoverage(req,res){
 try {
    const params =req.body;
    const  data =await model.findData(params)
    res.json({
        status:true,
        data
    })
 } catch (error) {
    res.json({
        status:false,
        msg:'查询出错',
        error
    })
 }

}
async function groupByAppId(req,res){
 try {
    const params =req.body;
    const  data =await model.groupByAppId(params)
    res.json({
        status:true,
        data
    })
 } catch (error) {
    console.log(error,'error');
    res.json({
        status:false,
        msg:'查询出错',
        error
    })
 }

}
async function createNewDemand(req,res){
    try {
        const params =req.body;
        console.log(params);
    const  data =await model.createData(params)
    res.json({
        status:true,
        data
    })
 } catch (error) {
    console.log(error,'error');
    res.json({
        status:false,
        msg:'查询出错',
        error
    })
 }

}





module.exports = {
    getProjectList,
    getCoverage,
    groupByAppId,
    createNewDemand
}