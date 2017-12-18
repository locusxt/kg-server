/*
 * @Author: locusxt
 * @Date: 2017-12-17 15:14:02
 * @Last Modified by: locusxt
 * @Last Modified time: 2017-12-18 20:37:46
 */

var db = require("./db");

var info = require("./info");

var manager = require("./manager");

var utils = require("./utils");

// work!
//调用之前需要保证该tag还不存在
var addATag =
	async function(uid, pid, eid, tag) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);

	var val = await db.createValue(user, project, "string", tag, false);
	var taginst = {
		tag : "tag", //
		tagid : -2,  //用-2标识预定义的关系
		roles : [
			{name : "tag", tid : val.id}, // rid是对应的Role的id
			{name : '', tid : eid}
		]
    }; 
    var res = await db.createRelInst(user, project, taginst, true, false);

}

//为Entity添加Tag
var addTags = async function(uid, pid, eid, taglist) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	var curTagList = await utils.getTags(uid, pid, eid);

	for (var i in taglist)
	{
		var t = taglist[i];
		if (curTagList.indexOf(t) == -1)
		{
			// newList.push(t);
			await addATag(user, project, eid, t);
		}
	}
};

/*
创建用户
req:
{
	operation: "createUser",
	reqId:"xxx", //请求的唯一标识
	userName: "xxx"
}

response:
{
    reqId: "xxx",
    msg:"success",
	userId: "7"
}
*/
var reqCreateUser = async function(req) {
	var user = await manager.createUser(req.userName);
	return {reqId : req.reqId, userId : user.id, msg:"success"};
};

/*
获取对应用户名的id
req:
{
	operation: "getUserId",
	reqId:"xxx", //请求的唯一标识
	userName: "xxx", //需要查询的用户名，如果不存在则会创建一个新的用户
}

response:
{
	reqId: "xxx",
    msg:"success",
	userId: "7"
}
*/
var reqGetUserId = async function(req) {
	var users = await manager.getUser(req.userName);
	return {reqId : req.reqId, userId : users[0].id, msg:"success"};
};

/*
获取对应项目名的项目id
req:
{
	operation: "getProjectId",
	reqId:"xxx", //请求的唯一标识
	projectName: "xxx",
}

response:
{
	reqId: "xxx",
    msg:"success",
	projectId: "7"
}
*/
var reqGetProjectId = async function(req) {
	var projs = await manager.getProject(req.projectName);
	return {reqId : req.reqId, projectId : projs[0].id, msg:"success"};
};

/*
创建项目
req:
{
	operation: "createUser",
	reqId:"xxx", //请求的唯一标识
	projectName: "xxx"
}

response:
{
	reqId: "xxx",
    msg:"success",
	projectId: "7"
}
*/
var reqCreateProject = async function(req) {
	var proj = await manager.createProject(req.projectName);
	return {reqId : req.reqId, projectId : proj.id, msg:"success"};
};

//以下是实例层的接口

/*
创建一个实体

req:
{
	operation:"createEntity",
	reqId:"xxx", //请求的唯一标识
    userId:"7",
    projectId:"17",
    entity:{
        tags:["a", "b", "c"]
    }
}

response:
{
    reqId:"xxx",
    msg:"success",
    entityId:"7"
}
*/
var reqCreateEntity =
    async function (req){
        var ent = await db.createEntity(req.userId, req.projectId, true, false);
        await addTags(req.userId, req.projectId, ent.id, req.entity.tags);
        return {reqId : req.reqId, entityId : ent.id, msg:"success"};
    };

/*
创建一个实例层的关系

req:
{
	operation:"createRelation",
	reqId:"xxx", //请求的唯一标识
    userId:"7",
    projectId:"17",
    relation:{
        tag:"居住",
        tagId:"7",
        roles:[
            {name:"角色名1", tid:"17"},
            {name:"角色名2", val:{type:"string", value:"vvvv"}}
        ]

    }
}

response:
{
    reqId:"xxx",
    msg:"success",
    relationId:"7"
}
*/
var reqCreateRelation = 
    async function(req){
        var roles = req.relation.roles;
        for (var i in roles){
            var r = roles[i];
            if (r["tid"] == undefined){
                if(r["val"] == undefined)
                    throw "unknown role";
                var newVal = r["val"];
                var v = await db.createValue(req.userId, req.projectId, newVal.type, newVal.value, false);
                roles[i].tid = v.id;
            }
        }
        console.log(req.relation);
        var rel = await db.createRelInst(req.userId, req.projectId, req.relation, true, false);
        return {reqId : req.reqId, relationId : rel.id, msg:"success"};
    }

var reqHandle = async function(req) {
	switch (req.operation)
	{
	case "getUserId":
		return await reqGetUserId(req);
	case "getProjectId":
		return await reqGetProjectId(req);
	case "createUser":
		return await reqCreateUser(req);
	case "createProject":
        return await reqCreateProject(req);
    case "createEntity":
        return await reqCreateEntity(req);
    case "createRelation":
        return await reqCreateRelation(req);
	}
};

var test = async function() {
	// var res = await reqHandle({
	// 	operation : "createProject",
	// 	reqId : "xxx",
	// 	projectName : "p7"
    // });
    
    // var res = await reqHandle({
    //     operation:"createEntity",
    //     reqId:"xxx", //请求的唯一标识
    //     userId:"25",
    //     projectId:"26",
    //     entity:{
    //         tags:["a", "b", "c"]
    //     }
    // });
    
    var res = await reqHandle({
        operation:"createRelation",
        reqId:"xxx", //请求的唯一标识
        userId:"25",
        projectId:"26",
        relation:{
            tag:"居住",
            tagId:"7",
            roles:[
                {name:"角色名1", tid:"28"},
                {name:"角色名2", val:{type:"string", value:"vvvv"}}
            ]

        }
    });
	console.log(res);
};

test();

module.exports = {
	addATag : addATag,
	addTags : addTags
}