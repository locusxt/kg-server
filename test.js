/*
 * @Author: locusxt 
 * @Date: 2017-12-17 00:26:16 
 * @Last Modified by: locusxt
 * @Last Modified time: 2017-12-17 00:34:56
 */

var db = require("./db");
 
var info = require("./info");

var manager = require("./manager");

var utils = require("./utils");

var init = async function(){
    await utils.clear();
};

var testManager = async function (){
    await init();
    var u1 = await manager.createUser("u1");
    var u2 = await manager.createUser("u2");
    var u3 = await manager.createUser("u3");

    var u10 = await manager.createUser("u1");

    var p1 = await manager.createProject('p1');
    var p2 = await manager.createProject('p2');
    var p10 = await manager.createProject('p1');

    await manager.userOwnProject(u1, p1);
    await manager.userOwnProject(u1, p1);
    await manager.userOwnProject(u2, p1);
    await manager.userOwnProject(u3, p2);
    await manager.userOwnProject(u1, p2);
};

var test = async function(){
    try{
        await testManager();
    }
    catch (error)
	{
		console.log(error);
	}
};

test();