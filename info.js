var config = require("./config");

var db = require("seraph")(config.server_config);
var manager = require("./manager");
// work!
var getAllInstRelInsts = async function(uid, pid) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	var cypher =
		"START u=node({uid}), p=node({pid}) " +
		"MATCH (u)-[:refer]->(relInst:RelInst)-[:in]->(p)" +
		"MATCH (relInst)-[:hasRole]->(roleInst)-[:hasTarget]->(target)" +
		"RETURN relInst, roleInst, target";
	return new Promise((resolve, reject) => {
		db.query(cypher, {uid : user.id, pid : project.id}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
};

// work!
var getAllInstEntities = async function(uid, pid) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);
	var cypher = "START u=node({uid}), p=node({pid}) " +
				 "MATCH (u)-[:refer]->(entity:Entity)-[:in]->(p) " +
				 "RETURN entity";
	// console.log(cypher);
	return new Promise((resolve, reject) => {
		db.query(cypher, {uid : user.id, pid : project.id}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
};

//获取实例层的数据，实例层只会有实体和关系的实例
var getAllInstInfo = async function(uid, pid) {
	var user = await manager.readUser(uid);
	var project = await manager.readProject(pid);

	var ents = await getAllInstEntities(uid, pid);
	var ents_map = {};
	for (var i in ents)
	{
		var e = ents[i];
		var e_id = e.id;
		ents_map[e_id] = e;
	}
	// console.log(ents);
	// console.log(ents_map);

	var rels = await getAllInstRelInsts(uid, pid);
	var rels_map = {};
	for (var i in rels)
	{
		var r = rels[i];
		var rid = rels[i].relInst.id;
		if (rels_map[rid] == undefined)
		{
			rels_map[rid] = {};
			rels_map[rid].info = r.relInst;
			rels_map[rid].roles = [];
		}
		rels_map[rid].roles.push({info : r.roleInst, target : r.target})

			if (r.target.mtype == 'Entity')
		{
			var tid = r.target.id;
			if (ents_map[tid] == undefined)
				continue;
			if (ents_map[tid]["related_rels"] == undefined)
			{
				ents_map[tid]["related_rels"] = [];
			}
			if (ents_map[tid]['related_rels'].indexOf(rid) == -1)
			{
				ents_map[tid]['related_rels'].push(rid);
			}
		}
	}
	// console.log(rels);
	// console.log(ents_map);
	// console.log(rels_map);

	var res = {};
	res['entities'] = ents_map;
	res['relations'] = rels_map;
	return res;
};

var getAllModelRelations = async function(pid) {
	var project = await manager.readProject(pid);
	var cypher = "START p=node({pid}) " +
				 "MATCH (rel:Relation:Model)-[:in]->(p)" +
				 "MATCH (rel)-[:hasRole]->(role)-[:hasTarget]->(target)" +
				 "RETURN rel, role, target";
	return new Promise((resolve, reject) => {
		db.query(cypher, {pid : project.id}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
};

//目前模型层不允许新建关系的实例
//目前能获取的模型层关系的实例，只有概念的名称这一关系
var getAllModelRelInsts = async function(pid) {
	var project = await manager.readProject(pid);
	var cypher =
		"START p=node({pid}) " +
		"MATCH (relInst:RelInst:Model)-[:in]->(p)" +
		"MATCH (relInst)-[:hasRole]->(roleInst)-[:hasTarget]->(target)" +
		"RETURN relInst, roleInst, target";
	return new Promise((resolve, reject) => {
		db.query(cypher, {pid : project.id}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
};

// work!
var getAllModelEntities = async function(pid) {
	var project = await manager.readProject(pid);
	var cypher = "START p=node({pid}) " +
				 "MATCH (entity:Entity:Model)-[:in]->(p) " +
				 "RETURN entity";
	// console.log(cypher);
	return new Promise((resolve, reject) => {
		db.query(cypher, {pid : project.id}, (err, res) => {
			if (err)
				console.log(err);
			resolve(res);
		});
	});
};

/*
预定义的关系:
name: 概念或者实体<--name-[角色名:name]-> <<string>>
type: 概念或者实体<--type-[角色名:type]-> <<string>>

*/

var getAllModelInfo = async function(pid) {
	var project = await manager.readProject(pid);
	var ents = await getAllModelEntities(pid);
	// console.log(ents);
	var ents_map = {};
	for (var i in ents)
	{
		var e = ents[i];
		ents_map[e.id] = e;
	}
	// console.log(ents_map);

	//整理模型层的关系实例的信息，目前主要只有name关系的实例
	var rinsts = await getAllModelRelInsts(pid);
	var rinsts_map = {};
	for (var i in rinsts)
	{
		var r = rinsts[i];
		var rinst_id = r.relInst.id;
		if (rinsts_map[rinst_id] == undefined)
		{
			rinsts_map[rinst_id] = {};
			rinsts_map[rinst_id].info = r.relInst;
			rinsts_map[rinst_id].roleInsts = [];
		}
		rinsts_map[rinst_id].roleInsts.push(
			{roleInst : r.roleInst, target : r.target})
	}
	// console.log(rinsts_map);
	//以上部分对所有关系实例都是通用的

	//从关系事例中提取出和概念的名字相关内容
	var name_list = [];
	for (var k in rinsts_map)
	{
		var name_map = {};
		var r = rinsts_map[k];
		var r_name = r.info.tag;
		if (r_name == 'name')
		{
			for (i in r.roleInsts)
			{
				var ri = r.roleInsts[i];
				var roleInst = ri.roleInst;
				var tgt = ri.target;
				if (roleInst.name == 'name' && tgt.mtype == 'Value')
				{
					name_map['name'] = tgt.value;
				}
				else if (tgt.mtype == 'Entity')
				{
					name_map['entity'] = tgt;
				}
			}
		}
		name_list.push(name_map);
		// console.log(name_map);
	}
	// console.log(name_list);

	//利用name_list，更新ents_map
	for (i in name_list)
	{
		var name_map = name_list[i];
		var name = name_map['name'];
		var ent_id = name_map['entity'].id;

		if (ents_map[ent_id] != undefined)
		{
			ents_map[ent_id]['name'] = name;
		}
	}
	// console.log(ents_map);

	var rels = await getAllModelRelations(pid);
	var rels_map = {};
	for (var i in rels)
	{
		var rel = rels[i];
		var rid = rel.rel.id;
		if (rels_map[rid] == undefined)
		{
			rels_map[rid] = {};
			rels_map[rid].roles = [];
			rels_map[rid].info = rel.rel;
		}
		rels_map[rid].roles.push({info : rel.role, target : rel.target});
		// console.log("push: ");
		// console.log(rel.role);
		// console.log(rel.target);
	}
	// console.log(rels);
	// console.log(rels_map);

	// console.log("=======")
	//用rels_map更新概念或者实体关联的关系
	for (var k in rels_map)
	{
		var rel = rels_map[k];
		var roles = rel.roles;
		var rid = rel.info.id;
		for (var i in roles)
		{
			var role = roles[i];
			if (role.target.mtype == 'Entity')
			{
				var tid = role.target.id;
				// console.log(rid + " " + tid);
				if (ents_map[tid]['related_rels'] == undefined)
				{
					ents_map[tid]['related_rels'] = [];
				}
				if (ents_map[tid]['related_rels'].indexOf(rid) == -1)
				{
					ents_map[tid]['related_rels'].push(rid);
				}
			}
			// console.log(role);
		}
		// console.log(rel);
		// console.log(ents_map);
	}

	var res = {};
	// console.log(ents_map);
	// console.log(rels_map);
	res['entities'] = ents_map;
	res['relations'] = rels_map;
	// console.log(res);
	return res;
};

module.exports = {
	getAllInstRelInsts : getAllInstRelInsts,
	getAllInstEntities : getAllInstEntities,
	getAllInstInfo : getAllInstInfo,
	getAllModelInfo : getAllModelInfo,
	getAllModelEntities : getAllModelEntities,
	getAllModelRelations : getAllModelRelations,
	getAllModelRelInsts : getAllModelRelInsts
}