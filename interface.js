/*
 * @Author: locusxt 
 * @Date: 2017-12-17 15:14:02 
 * @Last Modified by: locusxt
 * @Last Modified time: 2017-12-17 21:50:21
 */

var db = require("./db");

var info = require("./info");

var manager = require("./manager");

var utils = require("./utils");

//为Entity添加Tag
var addTags = 
    async function(uid, pid, eid, taglist){
        var user = await manager.readUser(uid);
        var project = await manager.readProject(pid);


    }