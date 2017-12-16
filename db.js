/*
 * @Author: locusxt 
 * @Date: 2017-12-16 23:42:02 
 * @Last Modified by:   locusxt 
 * @Last Modified time: 2017-12-16 23:42:02 
 */
"use strict";

var config = require("./config");
// console.log(config)

var db = require("seraph")(config.server_config);

var schema = require("./schema");

var info = require("./info");

var manager = require("./manager");

//模型层和实例层的模型通过label中是否含有Model区分
var createEntity = async function(uid, pid, needRefer, isModel = false) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	return new Promise((resolve, reject) => {
		var txn = db.batch();
		var ent = txn.save({mtype : 'Entity'});
		txn.label(ent, 'Entity');
		if (isModel)
			txn.label(ent, 'Model');
		else
			txn.label(ent, 'Inst')
			txn.relate(ent, "in", project.id);
		if (needRefer)
			txn.relate(user.id, "refer", ent);
		txn.commit((err, res) => {
			if (err)
				throw err;
			resolve(res[ent]);
		});
	});
};

//根据value的类型和具体的值，获取value节点
var getValue = async function(type, value) {
	return new Promise((resolve, reject) => {
		schema.Value.where({type : type, value : value}, (err, res) => {
			if (err)
				throw err;
			resolve(res);
		});
	});
};

//不允许出现完全一样的两个Value节点
var createValue = async function(uid, pid, type, value, needRefer) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);

	var values = await getValue(type, value);
	var len = values.length;
	if (len != 0)
		// return values[0];
		return new Promise((resolve, reject) => {
			db.relate(user.id, "refer", values[0].id, (err, res) => {
				if (err)
					throw err;
				resolve(values[0]);
			});
		});
	else
		return new Promise((resolve, reject) => {
			var txn = db.batch();
			var val = txn.save({mtype : 'Value', type : type, value : value});
			txn.label(val, 'Value');
			txn.relate(val, "in", project.id);
			if (needRefer)
				txn.relate(user.id, "refer", val.id);
			txn.commit((err, res) => {
				if (err)
					throw err;
				resolve(res[val]);
			});
		});
};

var readNode = async function(nid) {
	return new Promise((resolve, reject) => {db.read(nid, (err, res) => {
						   if (err)
							   throw err;
						   resolve(res);
					   })});
};

//判断User与节点直接是否有refer关系
var isReferNode = async function(uid, nid) {
	var cypher = "START u=node({uid}), n=node({nid}) " +
				 "MATCH (u)-[r:refer]->(n) " +
				 "RETURN r";
	return new Promise((resolve, reject) => {
		db.query(cypher, {uid : uid, nid : nid}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
};

//一个用户只允许refer一个节点一次，不能多次refer同一个节点
// refer之前就可以保证，节点都是同一个project内的，不能refer不在同一个项目内的节点
var referNode = async function(uid, pid, nid) {
	var user = await manager.readUser(uid);
	// var project = await readProject(pid);
	var node = await readNode(nid); //保证node存在
	var refers = await isReferNode(user.id, node.id);
	var len = refers.length;
	if (len != 0)
		return refers[0];
	else
		return new Promise(
			(resolve, reject) => {db.relate(user, "refer", node, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			})});
};

//引用Entity，同时会引用Entity上所有连接的关系的实例，以及 角色、角色的承担者
var referEntity = async function(uid, pid, eid) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	var ent = await readNode(eid); //保证node存在

	var cypher =
		"START p=node({pid}), e=node({eid}), u=node({uid}) " +
		"MATCH (rel:RelInst)-[:hasRole]->(role:RoleInst)-[:hasTarget]->(e) " + //确保关系的实例与Entity相关
		"MATCH (rel)-[:hasRole]->(allRole:RoleInst) " + //关系的实例的所有角色
		"MATCH (rel)-[:hasRole]->(:RoleInst)-[:hasTarget]->(t:Entity) " + //关系所关联的其他实体

		"MATCH (rel)-[:in]->(p) " + //关系的实例在project中，可以保证角色和承担者也在projject中

		"MERGE (u)-[:refer]->(rel) " +
		// "MERGE (u)-[:refer]->(role) "+
		"MERGE (u)-[:refer]->(allRole) " +
		"MERGE (u)-[ref:refer]->(e) " +
		"MERGE (u)-[:refer]->(t) " +

		"RETURN ref";

	// console.log(cypher);
	return new Promise((resolve, reject) => {
		db.query(cypher, {pid : project.id, eid : ent.id, uid : user.id},
				 (err, res) => {
					 if (err)
						 console.log(err);
					 resolve(res[0]);
				 });
	});
};

//取消实体引用时，同时取消对实体所关联的关系的实例的引用；但是不会对关系的实例的其他承担着产生影响
//【这里的cypher 可能有问题】
var dereferEntity = async function(uid, pid, eid) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	var ent = await readNode(eid); //保证node存在

	var cypher =
		"START p=node({pid}), e=node({eid}), u=node({uid}) " +
		"MATCH (rel:RelInst)-[:hasRole]->(role:RoleInst)-[:hasTarget]->(e) " + //确保关系的实例与Entity相关
		"MATCH (rel)-[:hasRole]->(allRole:RoleInst) " + //关系的实例的所有角色

		"MATCH (rel)-[:in]->(p) " + //关系的实例在project中，可以保证角色和承担者也在project中

		"MATCH (u)-[r1:refer]->(rel) " +
		"MATCH (u)-[r2:refer]->(allRole) " +
		"MATCH (u)-[r3:refer]->(e) " +

		"DELETE r1, r2, r3";

	// console.log(cypher);
	return new Promise((resolve, reject) => {
		db.query(cypher, {pid : project.id, eid : ent.id, uid : user.id},
				 (err, res) => {
					 if (err)
						 console.log(err);
					 resolve(res);
				 });
	});
};

// work!
var dereferNode = async function(uid, pid, nid) {
	var user = await manager.readUser(uid);
	// var project = await readProject(pid);
	var node = await readNode(nid); //保证node存在
	var refers = await isReferNode(user.id, node.id);
	console.log(refers);
	var len = refers.length;
	if (len != 1)
	{
		return -1;
	}
	else
	{
		var refer_rel = refers[0];
		var rid = refer_rel.id;
		return new Promise((resolve, reject) => {db.rel.delete(rid, (err) => {
							   if (err)
								   throw err;
							   resolve(rid);
						   })});
	}
};

var readRelInst = async function(id) {
	return new Promise(
		(resolve, reject) => {schema.RelInst.read(id, (err, res) => {
			if (err)
				throw err;
			resolve(res);
		})});
};

var getRelInstRoles = async function(rid) {
	var relInst = await readRelInst(rid);
	var cypher =
		"START r=node({rid}) " +
		"MATCH (r)-[:hasRole]->(role:RoleInst)-[:hasTarget]->(target) " +
		"RETURN role, target";
	return new Promise((resolve, reject) => {
		db.query(cypher, {rid : rid}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
};

// refer一个关系时，会refer关系关联的所有角色以及角色的承担者
var referRelInst = async function(uid, pid, rid) {
	var user = await manager.readUser(uid);
	// var project = await readProject(pid);
	var relInst = await readRelInst(rid); //保证relInst存在
	var refers = await isReferNode(user.id, relInst.id);
	var len = refers.length;
	if (len != 0)
		return refers[0];
	else
	{
		var rolesInfo = await getRelInstRoles(relInst.id);
		//引用所有承担者，这里的操作不在一个batch里面，可能导致操作完成一半【WARN】
		for (var i in rolesInfo)
		{
			var tgt = rolesInfo[i].target;
			await referNode(uid, pid, tgt.id);
		}
		return new Promise((resolve, reject) => {
			var txn = db.batch();
			txn.relate(user.id, "refer", relInst.id);
			for (var i in rolesInfo)
			{
				var role = rolesInfo[i];
				txn.relate(user.id, "refer", role.role.id);
			}
			txn.commit((err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		});
	}
};

/* rel
{
	tag:'', //
	tagid:12,
	roles:[
		{name:'', tid:''}
	]
}
一个roleInst只能指向一个实体或者对象，否则无法区分具体用户引用的是哪个实体或者对象
*/
var createRelInst = async function(uid, pid, rel, needRefer, isModel) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	return new Promise((resolve, reject) => {
		var txn = db.batch();
		var relInst =
			txn.save({mtype : 'RelInst', tag : rel.tag, tagid : rel.tagid});
		txn.label(relInst, 'RelInst');
		if (isModel)
			txn.label(relInst, 'Model');
		txn.relate(relInst, 'in', project.id);
		if (needRefer)
			txn.relate(user.id, 'refer', relInst);
		for (var i in rel.roles)
		{
			// var tmpRole =
			// 	txn.save({mtype:'RoleInst', name : rel.roles[i].name, rid :
			// rel.roles[i].rid});
			var tmpRole =
				txn.save({mtype : 'RoleInst', name : rel.roles[i].name});
			txn.label(tmpRole, 'RoleInst');
			txn.relate(tmpRole, 'in', project.id);
			if (needRefer)
				txn.relate(user.id, 'refer', tmpRole);
			txn.relate(relInst, 'hasRole', tmpRole);
			txn.relate(tmpRole, 'hasTarget', rel.roles[i].tid);
		}
		txn.commit((err, res) => {
			if (err)
				throw err;
			resolve(res[relInst]);
		});
	});
};

// work!
/* 取消对某个关系的实例的引用，会影响角色，但不会影响承担者
如果是在实例层，去掉关系的实例以及角色的refer边
如果是在模型层，直接delete关系的实例和角色，以及与项目之间的in关系
*/
var dereferRelInst = async function(uid, pid, rid, isModel) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	var rel = await readNode(rid);
	if (rel.mtype != "RelInst")
		throw "not a RelInst";

	var cypher = "";
	if (isModel == false)
	{
		cypher =
			"START r=node({rid}), u=node({uid}) " +
			"MATCH (r)-[hr:hasRole]->(ri:RoleInst)-[ht:hasTarget]->(tgt) " +
			"MATCH (u)-[r1:refer]->(r) " +
			"MATCH (u)-[r2:refer]->(ri) " +
			"DELETE r1, r2";
	}
	else
	{
		cypher =
			"START r=node({rid}), u=node({uid}), p=node({pid}) " +
			"MATCH (r)-[hr:hasRole]->(ri:RoleInst)-[ht:hasTarget]->(tgt) " +
			"MATCH (r)-[i1:in]->(p) " +
			"MATCH (ri)-[i2:in]->(p) " +
			"DELETE r, ht, hr, ri, i1, i2 ";
	}
	// var cypher =
	// 	"START r=node({rid}) " +
	// 	"MATCH (r)-[:hasRole]->(role:RoleInst)-[:hasTarget]->(target) " +
	// 	"RETURN role, target";
	return new Promise((resolve, reject) => {
		db.query(cypher, {rid : rid, uid : user.id, pid : project.id},
				 (err, res) => {
					 if (err)
						 console.log(err);
					 resolve(res);
				 });
	});

};

//以下是模型层的部分

//一定是Model，一定不需要refer
/*
{
	name:'', //
	diversity:2,
	roles:[
		{name:'', multiplicity:'1..*', tid:xx, visible:false}
//rid是对应的Role的id
	]
}
*/
var createRelation = async function(uid, pid, rel) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	return new Promise((resolve, reject) => {
		var txn = db.batch();
		var relation = txn.save(
			{mtype : 'Relation', name : rel.name, diversity : rel.diversity});
		txn.label(relation, 'Relation');
		txn.label(relation, 'Model');
		txn.relate(relation, 'in', project.id);
		for (var i in rel.roles)
		{
			var tmpRole = txn.save({
				mtype : 'Role',
				name : rel.roles[i].name,
				multiplicity : rel.roles[i].multiplicity,
				visible : rel.roles[i].visible
			});
			txn.label(tmpRole, 'Role');
			txn.relate(tmpRole, 'in', project.id);
			txn.relate(relation, 'hasRole', tmpRole);
			txn.relate(tmpRole, 'hasTarget', rel.roles[i].tid);
		}
		txn.commit((err, res) => {
			if (err)
				throw err;
			resolve(res[relation]);
		});
	});
};

// work!
//删除关系，需要删掉关联的角色，但不会删掉承担者；还需要删掉与项目之间的in关系
var deleteRelation =
	async function(uid, pid, rid) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	var rel = await readNode(rid);
	if (rel.mtype != "Relation")
		throw "not a Relation";

	var cypher =
		"START r=node({rid}), p=node({pid}) " +
		"MATCH (r)-[hr:hasRole]->(role:Role)-[ht:hasTarget]->(target) " +
		"MATCH (r)-[i1:in]->(p) " +
		"MATCH (role)-[i2:in]->(p)" +
		"DELETE r, hr, role, ht, i1, i2";

	return new Promise((resolve, reject) => {
		db.query(cypher, {rid : rid, pid : project.id}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
}

//以下是测试部分

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
	var res = await createRelInst(user, proj, newrel, needRefer, isModel);
	return res;
};

var test = async function() {
	try
	{
		var tmp1 = await manager.createUser("lalala");
		var tmp0 = await manager.createUser("lalal");
		var tmp2 = await manager.createProject('pro1');
		//以下是模型层的建立
		// var a = await createEntity(tmp1, tmp2, false, true);
		// var v = await createValue(tmp1, tmp2, "string", "人", false);
		// await entValRel(tmp1, tmp2, a, v, "name", false, true);
		// var b = await createEntity(tmp1, tmp2, false, true);
		// var v2 = await createValue(tmp1, tmp2, "string", "住宅", false);
		// await entValRel(tmp1, tmp2, b, v2, "name", false, true);
		// var rel2 = {
		//     name:'夫妻', //
		//     diversity:2,
		//     roles:[
		//         {name:'丈夫', multiplicity:'0..1', tid:a.id},
		//         {name:'妻子', multiplicity:'0..1', tid:a.id}
		//     ]
		// }
		// var newrel2 = await createRelation(tmp1, tmp2, rel2);

		// var rel3 = {
		//     name:'居住', //
		//     diversity:2,
		//     roles:[
		//         {name:'居住地', multiplicity:'0..*', tid:b.id},
		//         {name:'', multiplicity:'0..*', tid:a.id}
		//     ]
		// }
		// var newrel3 = await createRelation(tmp1, tmp2, rel3);

		// // var ents = await getAllModelRelInsts(tmp2);
		// // var ents = await getAllModelRelations(tmp2);
		// // var res = parseRelations(ents);
		// // console.log(res);
		// var lindaiyu = await createEntity(tmp1, tmp2, true, false);
		// var v_lin = await createValue(tmp1, tmp2, "string", "林黛玉", false);
		// var newrel_inst = {
		// 	tag : "名称", //
		// 	tagid : rel3.id,
		// 	roles : [
		// 		{name : "", tid : lindaiyu.id, rid : -1}, // rid是对应的Role的id
		// 		{name : '名称', tid : v_lin.id, rid : -1}
		// 	]
		// };
		// var res = await createRelInst(tmp1, tmp2, newrel_inst, true, false);

		// var res = await getAllRelInsts(tmp1, tmp2);
		// var res = await getAllEntities(tmp1, tmp2);
		// var res = await getAllModelRelInsts(tmp2);
		// var res = await getAllModelEntities(tmp2);
		// var res = await getAllModelRelations(tmp2);
		// var res = await getAllModelRelInsts(tmp2);
		// console.log(res);

		// var res = await getAllModelInfo(tmp2);
		// console.log(res);
		// console.log("=======");
		// res = await getAllInstInfo(tmp1, tmp2);
		// console.log(res);

		// var der = await dereferNode(tmp1, tmp2, 35);
		// console.log(der);

		// var res = "";
		// var u3 = await manager.createUser("u44");
		// var res = await referEntity(tmp1, tmp2, 85);
		// console.log(res);
		// var res = await info.getAllInstInfo(tmp1, tmp2);
		// console.log(res);

		// res = await dereferEntity(u3, tmp2, 35);
		// console.log(res);

		// var res = await dereferRelInst(tmp1, tmp2, 40, true);
		// console.log(res);

		var res = await deleteRelation(tmp1, tmp2, 41);
	}
	catch (error)
	{
		console.log(error);
	}

};

test();
