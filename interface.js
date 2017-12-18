/*
 * @Author: locusxt 
 * @Date: 2017-12-17 15:14:02 
 * @Last Modified by: locusxt
 * @Last Modified time: 2017-12-18 12:28:17
 */

var db = require("./db");

var info = require("./info");

var manager = require("./manager");

var utils = require("./utils");

//work!
//调用之前需要保证该tag还不存在
var addATag = 
    async function (uid, pid, eid, tag){
        var user = await manager.readUser(uid);
        var project = await manager.readProject(pid);

        var val = await db.createValue(user, project, "string", tag, false);
        var taginst = {
            tag : "tag", //
            tagid : -2, //用-2标识预定义的关系
            roles : [
                {name : "tag", tid : val.id}, // rid是对应的Role的id
                {name : '', tid : eid}
            ]
        }
        var res = await db.createRelInst(user, project, taginst, true, false);
        
    }

//为Entity添加Tag
var addTags = 
    async function(uid, pid, eid, taglist){
        var user = await manager.readUser(uid);
        var project = await manager.readProject(pid);
        var curTagList = await utils.getTags(uid, pid, eid);

        for (var i in taglist){
            var t = taglist[i];
            if (curTagList.indexOf(t) == -1){
                // newList.push(t);
                await addATag(user, project, eid, t);
            }
        }
    };

var reqHandle = 
    async function(req){
        
    };

module.exports = {
    addATag:addATag,
    addTags:addTags
}