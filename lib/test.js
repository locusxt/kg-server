/*
 * @Author: locusxt
 * @Date: 2017-12-17 00:26:16
 * @Last Modified by: locusxt
 * @Last Modified time: 2017-12-18 19:57:38
 */

var db = require("./db");

var info = require("./info");

var manager = require("./manager");

var utils = require("./utils");

var interface = require("./interface");

var init = async function() {
	console.log("init...");
	await utils.clear();
};

var testManager = async function(needInit = true) {
	if (needInit == true)
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

//仅测试
var entValRel = async function(user, proj, ent, val, rel, needRefer, isModel) {
	var newrel = {
		tag : rel, //
		tagid : -1,
		roles : [
			{name : rel, tid : val.id}, // rid是对应的Role的id
			{name : '', tid : ent.id}
		]
	};
	var res = await db.createRelInst(user, proj, newrel, needRefer, isModel);
	return res;
};

var testModel = async function(needInit = true) {
	if (needInit == true)
		await init();
	var u1 = await manager.createUser("u1");
	var p1 = await manager.createProject('p1');

	//测试概念、值、关系实例的添加
	var a = await db.createEntity(u1, p1, false, true);
	var v =
		await db.createValue(u1, p1, "string", "人", false); //【规定值类型】
	await entValRel(u1, p1, a, v, "name", false, true);

	var b = await db.createEntity(u1, p1, false, true);
	var v2 = await db.createValue(u1, p1, "string", "住宅", false);
	await entValRel(u1, p1, b, v2, "name", false, true);

	//测试关系的添加
	var rel2 = {
		name : '夫妻', //
		diversity : 2,
		roles : [
			{name : '丈夫', multiplicity : '0..1', tid : a.id},
			{name : '妻子', multiplicity : '0..1', tid : a.id}
		]
	};
	var newrel2 = await db.createRelation(u1, p1, rel2);

	var rel3 = {
		name : '居住', //
		diversity : 2,
		roles : [
			{name : '居住地', multiplicity : '0..*', tid : b.id},
			{name : '', multiplicity : '0..*', tid : a.id}
		]
	};
	var newrel3 = await db.createRelation(u1, p1, rel3);

	//测试Relation的删除
	var newrel4 = await db.createRelation(u1, p1, rel3);
	await db.deleteRelation(u1, p1, newrel4.id);

	//测试RelInst的删除
	var relinst = await entValRel(u1, p1, b, v2, "xxx", false, true);
	await db.dereferRelInst(u1, p1, relinst.id, true);
};

//不应该依赖其他test，需要重写
var testInterface =
	async function(needInit = true) {
	if (needInit == true)
		await init();
	var u1 = await manager.createUser("u1");
	var p1 = await manager.createProject('p1');

	// await interface.addATag(u1, p1, 125, "test");
	// await interface.addTags(u1, p1, 125, ["a", "b", "c"]);
	// var res = await utils.getTags(u1, p1, 125);
	// console.log(res);
}

var testInst =
	async function(needInit = true) {
	if (needInit)
		await init();
	var u1 = await manager.createUser("u1");
	var p1 = await manager.createProject('p1');

	var lindaiyu = await db.createEntity(u1, p1, true, false);
	var v_lin = await db.createValue(u1, p1, "string", "林黛玉", false);
	var newrel_inst = {
		tag : "名称", //
		tagid : -1,
		roles : [
			{name : "", tid : lindaiyu.id, rid : -1}, // rid是对应的Role的id
			{name : '名称', tid : v_lin.id, rid : -1}
		]
	};
	var rel = await db.createRelInst(u1, p1, newrel_inst, true, false);

	//测试引用Entity
	var u2 = await manager.createUser("u2");
	await db.referEntity(u2, p1, lindaiyu.id);

	//测试取消对Entity的引用
	var u3 = await manager.createUser("u3");
	await db.referEntity(u3, p1, lindaiyu.id);
	await db.dereferEntity(u3, p1, lindaiyu.id);

	//测试取消对某个关系的实例的引用
	var u4 = await manager.createUser("u4");
	await db.referEntity(u4, p1, lindaiyu.id);
	await db.dereferRelInst(u4, p1, rel.id, false);
}

var testInfo =
	async function() {
	var u1 = await manager.createUser("u1");
	var p1 = await manager.createProject('p1');

	var instInfo = await info.getAllInstInfo(u1, p1);
	var modelInfo = await info.getAllModelInfo(p1);

	console.log(instInfo);
	console.log("===S P L I T====");
	console.log(modelInfo);
}

var test =
	async function() {
	try
	{
		// await testManager();
		// await testModel();
		// await testInst(false);
		// await testInfo();
		await testInterface(false);
	}
	catch (error)
	{
		console.log(error);
	}
};

test();