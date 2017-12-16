"use strict";

var config = require("./config")
// console.log(config)

var db = require("seraph")(config.server_config);

var schema = require("./schema");

//根据用户名，获取用户
var getUser = async function (username) {
	return new Promise((resolve, reject) => {
		schema.User.where({
			name: username
		}, (err, users) => {
			if (err)
				throw err;
			resolve(users);
		});
	});
};

var readUser =
	async function (id) {
		return new Promise((resolve, reject) => {
			schema.User.read(id, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			})
		})
	}

//创建用户，如果已经存在，则直接返回
var createUser = async function (username) {
	var users = await getUser(username);
	var len = users.length;
	if (len != 0)
		return new Promise((resolve, reject) => {
			resolve(users[0]);
		});
	else {
		return new Promise((resolve, reject) => {
			schema.User.save({
				name: username
			}, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		});
	}
};

//根据项目名称获取项目
var getProject = async function (projectname) {
	return new Promise((resolve, reject) => {
		schema.Project.where({
			name: projectname
		}, (err, projects) => {
			if (err)
				throw err;
			resolve(projects);
		});
	});
};

var readProject =
	async function (id) {
		return new Promise((resolve, reject) => {
			schema.Project.read(id, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			})
		})
	}

var createProject = async function (projectname) {
	var projects = await getProject(projectname);
	var len = projects.length;
	if (len != 0)
		return new Promise((resolve, reject) => {
			resolve(projects[0]);
		});
	else {
		return new Promise((resolve, reject) => {
			schema.Project.save({
				name: projectname
			}, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		});
	}
};

//参数直接是编号
var isUserOwnProject =
	async function (uid, pid) {
		// var user = await readUser(uid);
		// var project = await readProject(pid);
		var cypher = "START u=node({uid}), p=node({pid}) " +
			"MATCH (u)-[r:own]->(p) " +
			"RETURN r";
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				uid: uid,
				pid: pid
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

//建立用户和项目之间的own关系，用户对于同一个项目只能有一个own关系
var userOwnProject =
	async function (uid, pid) {
		var owns = await isUserOwnProject(uid, pid);
		if (owns.length != 0)
			return owns[0];
		var user = await readUser(uid);
		var project = await readProject(pid);
		return new Promise((resolve, reject) => {
			db.relate(user, 'own', project, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		})
	}

//模型层和实例层的模型通过label中是否含有Model区分
var createEntity =
	async function (uid, pid, needRefer, isModel = false) {
		var user = await readUser(uid);
		var project = await readProject(pid);
		return new Promise((resolve, reject) => {
			var txn = db.batch();
			var ent = txn.save({
				mtype: 'Entity'
			});
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
			})
		})
	}

//根据value的类型和具体的值，获取value节点
var getValue =
	async function (type, value) {
		return new Promise((resolve, reject) => {
			schema.Value.where({
				type: type,
				value: value
			}, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		});
	}


//不允许出现完全一样的两个Value节点
var createValue =
	async function (uid, pid, type, value, needRefer) {
		var user = await readUser(uid);
		var project = await readProject(pid);

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
				var val = txn.save({
					mtype: 'Value',
					type: type,
					value: value
				});
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
	}

var readNode =
	async function (nid) {
		return new Promise((resolve, reject) => {
			db.read(nid, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			})
		})
	}

//判断User与节点直接是否有refer关系
var isReferNode =
	async function (uid, nid) {
		var cypher = "START u=node({uid}), n=node({nid}) " +
			"MATCH (u)-[r:refer]->(n) " +
			"RETURN r";
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				uid: uid,
				nid: nid
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

//一个用户只允许refer一个节点一次，不能多次refer同一个节点
// refer之前就可以保证，节点都是同一个project内的，不能refer不在同一个项目内的节点
var referNode =
	async function (uid, pid, nid) {
		var user = await readUser(uid);
		// var project = await readProject(pid);
		var node = await readNode(nid); //保证node存在
		var refers = await isReferNode(user.id, node.id);
		var len = refers.length;
		if (len != 0)
			return refers[0];
		else
			return new Promise(
				(resolve, reject) => {
					db.relate(user, "refer", node, (err, res) => {
						if (err)
							throw err;
						resolve(res);
					})
				})
	}

var readRelInst =
	async function (id) {
		return new Promise((resolve, reject) => {
			schema.RelInst.read(id, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			})
		})
	}

var getRelInstRoles =
	async function (rid) {
		var relInst = await readRelInst(rid);
		var cypher =
			"START r=node({rid}) " +
			"MATCH (r)-[:hasRole]->(role:RoleInst)-[:hasTarget]->(target) " +
			"RETURN role, target";
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				rid: rid
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

// refer一个关系时，会refer关系关联的所有角色以及角色的承担者
var referRelInst =
	async function (uid, pid, rid) {
		var user = await readUser(uid);
		// var project = await readProject(pid);
		var relInst = await readRelInst(rid); //保证relInst存在
		var refers = await isReferNode(user.id, relInst.id);
		var len = refers.length;
		if (len != 0)
			return refers[0];
		else {
			var rolesInfo = await getRelInstRoles(relInst.id);
			//引用所有承担者，这里的操作不在一个batch里面，可能导致操作完成一半【WARN】
			for (var i in rolesInfo) {
				var tgt = rolesInfo[i].target;
				await referNode(uid, pid, tgt.id);
			}
			return new Promise((resolve, reject) => {
				var txn = db.batch();
				txn.relate(user.id, "refer", relInst.id);
				for (var i in rolesInfo) {
					var role = rolesInfo[i];
					txn.relate(user.id, "refer", role.role.id);
				}
				txn.commit((err, res) => {
					if (err)
						throw err;
					resolve(res);
				})
			})
		}
	}

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
var createRelInst =
	async function (uid, pid, rel, needRefer, isModel) {
		var user = await readUser(uid);
		var project = await readProject(pid);
		return new Promise((resolve, reject) => {
			var txn = db.batch();
			var relInst = txn.save({
				mtype: 'RelInst',
				tag: rel.tag,
				tagid: rel.tagid
			});
			txn.label(relInst, 'RelInst');
			if (isModel)
				txn.label(relInst, 'Model');
			txn.relate(relInst, 'in', project.id);
			if (needRefer)
				txn.relate(user.id, 'refer', relInst);
			for (var i in rel.roles) {
				// var tmpRole =
				// 	txn.save({mtype:'RoleInst', name : rel.roles[i].name, rid : rel.roles[i].rid});
				var tmpRole =
					txn.save({
						mtype: 'RoleInst',
						name: rel.roles[i].name
					});
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
			})
		});
	}

// work!
var getAllInstRelInsts =
	async function (uid, pid) {
		var user = await readUser(uid);
		var project = await readProject(pid);
		var cypher = "START u=node({uid}), p=node({pid}) " +
			"MATCH (u)-[:refer]->(relInst:RelInst)-[:in]->(p)" +
			"MATCH (relInst)-[:hasRole]->(roleInst)-[:hasTarget]->(target)" +
			"RETURN relInst, roleInst, target";
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				uid: user.id,
				pid: project.id
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

// work!
var getAllInstEntities =
	async function (uid, pid) {
		var user = await readUser(uid);
		var project = await readProject(pid);
		var cypher = "START u=node({uid}), p=node({pid}) " +
			"MATCH (u)-[:refer]->(entity:Entity)-[:in]->(p) " +
			"RETURN entity";
		// console.log(cypher);
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				uid: user.id,
				pid: project.id
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

//获取实例层的数据，实例层只会有实体和关系的实例
var getAllInstInfo =
	async function (uid, pid) {
		var user = await readUser(uid);
		var project = await readProject(pid);

		var ents = await getAllInstEntities(uid, pid);
		var ents_map = {};
		for (var i in ents) {
			var e = ents[i];
			var e_id = e.id;
			ents_map[e_id]= e;
		}
		// console.log(ents);
		// console.log(ents_map);

		var rels = await getAllInstRelInsts(uid, pid);
		var rels_map = {}
		for (var i in rels){
			var r = rels[i];
			var rid = rels[i].relInst.id;
			if(rels_map[rid] == undefined){
				rels_map[rid] = {};
				rels_map[rid].info = r.relInst;
				rels_map[rid].roles = [];
			}
			rels_map[rid].roles.push({
				info: r.roleInst,
				target: r.target
			})

			if(r.target.mtype == 'Entity'){
				var tid = r.target.id;
				if (ents_map[tid]["related_rels"] == undefined){
					ents_map[tid]["related_rels"] = [];
				}
				if (ents_map[tid]['related_rels'].indexOf(rid) == -1) {
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
	}

//以下是模型层的部分

//一定是Model，一定不需要refer
/*
{
	name:'', //
	diversity:2,
	roles:[
		{name:'', multiplicity:'1..*', tid:xx, visible:false} //rid是对应的Role的id
	]
}
*/
var createRelation = async function (uid, pid, rel) {
	var user = await readUser(uid);
	var project = await readProject(pid);
	return new Promise((resolve, reject) => {
		var txn = db.batch();
		var relation = txn.save({
			mtype: 'Relation',
			name: rel.name,
			diversity: rel.diversity
		});
		txn.label(relation, 'Relation');
		txn.label(relation, 'Model');
		txn.relate(relation, 'in', project.id);
		for (var i in rel.roles) {
			var tmpRole =
				txn.save({
					mtype: 'Role',
					name: rel.roles[i].name,
					multiplicity: rel.roles[i].multiplicity,
					visible: rel.roles[i].visible
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
		})
	});
}


var getAllModelRelations =
	async function (pid) {
		var project = await readProject(pid);
		var cypher = "START p=node({pid}) " +
			"MATCH (rel:Relation:Model)-[:in]->(p)" +
			"MATCH (rel)-[:hasRole]->(role)-[:hasTarget]->(target)" +
			"RETURN rel, role, target";
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				pid: project.id
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

//目前模型层不允许新建关系的实例
//目前能获取的模型层关系的实例，只有概念的名称这一关系
var getAllModelRelInsts =
	async function (pid) {
		var project = await readProject(pid);
		var cypher = "START p=node({pid}) " +
			"MATCH (relInst:RelInst:Model)-[:in]->(p)" +
			"MATCH (relInst)-[:hasRole]->(roleInst)-[:hasTarget]->(target)" +
			"RETURN relInst, roleInst, target";
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				pid: project.id
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

// work!
var getAllModelEntities =
	async function (pid) {
		var project = await readProject(pid);
		var cypher = "START p=node({pid}) " +
			"MATCH (entity:Entity:Model)-[:in]->(p) " +
			"RETURN entity";
		// console.log(cypher);
		return new Promise((resolve, reject) => {
			db.query(cypher, {
				pid: project.id
			}, (err, res) => {
				if (err)
					console.log(err);
				resolve(res);
			});
		});
	}

/*
预定义的关系:
name: 概念或者实体<--name-[角色名:name]-> <<string>>
type: 概念或者实体<--type-[角色名:type]-> <<string>>

*/



var getAllModelInfo =
	async function (pid) {
		var project = await readProject(pid);
		var ents = await getAllModelEntities(pid);
		// console.log(ents);
		var ents_map = {}
		for (var i in ents) {
			var e = ents[i];
			ents_map[e.id] = e;
		}
		// console.log(ents_map);

		//整理模型层的关系实例的信息，目前主要只有name关系的实例
		var rinsts = await getAllModelRelInsts(pid);
		var rinsts_map = {};
		for (var i in rinsts) {
			var r = rinsts[i];
			var rinst_id = r.relInst.id;
			if (rinsts_map[rinst_id] == undefined) {
				rinsts_map[rinst_id] = {};
				rinsts_map[rinst_id].info = r.relInst;
				rinsts_map[rinst_id].roleInsts = [];
			}
			rinsts_map[rinst_id].roleInsts.push({
				roleInst: r.roleInst,
				target: r.target
			})
		}
		// console.log(rinsts_map);
		//以上部分对所有关系实例都是通用的

		//从关系事例中提取出和概念的名字相关内容
		var name_list = [];
		for (var k in rinsts_map) {
			var name_map = {};
			var r = rinsts_map[k];
			var r_name = r.info.tag;
			if (r_name == 'name') {
				for (i in r.roleInsts) {
					var ri = r.roleInsts[i];
					var roleInst = ri.roleInst;
					var tgt = ri.target;
					if (roleInst.name == 'name' && tgt.mtype == 'Value') {
						name_map['name'] = tgt.value;
					} else if (tgt.mtype == 'Entity') {
						name_map['entity'] = tgt;
					}
				}
			}
			name_list.push(name_map);
			// console.log(name_map);
		}
		// console.log(name_list);

		//利用name_list，更新ents_map
		for (i in name_list) {
			var name_map = name_list[i];
			var name = name_map['name'];
			var ent_id = name_map['entity'].id;

			if (ents_map[ent_id] != undefined) {
				ents_map[ent_id]['name'] = name;
			}
		}
		// console.log(ents_map);

		var rels = await getAllModelRelations(pid);
		var rels_map = {};
		for (var i in rels) {
			var rel = rels[i];
			var rid = rel.rel.id;
			if (rels_map[rid] == undefined) {
				rels_map[rid] = {};
				rels_map[rid].roles = [];
				rels_map[rid].info = rel.rel;
			}
			rels_map[rid].roles.push({
				info: rel.role,
				target: rel.target
			})
			// console.log("push: ");
			// console.log(rel.role);
			// console.log(rel.target);

		}
		// console.log(rels);
		// console.log(rels_map);

		// console.log("=======")
		//用rels_map更新概念或者实体关联的关系
		for (var k in rels_map) {
			var rel = rels_map[k];
			var roles = rel.roles;
			var rid = rel.info.id;
			for (var i in roles) {
				var role = roles[i];
				if (role.target.mtype == 'Entity') {
					var tid = role.target.id;
					// console.log(rid + " " + tid);
					if (ents_map[tid]['related_rels'] == undefined) {
						ents_map[tid]['related_rels'] = [];
					}
					if (ents_map[tid]['related_rels'].indexOf(rid) == -1) {
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
	}

//以下是为了方便前端读取的解析部分
//【需要重新实现一遍】
// var parseRelations = function (rels) {

// 	var res = {}; //{id:{info:{}, roles:[]}}
// 	for (var i in rels) {
// 		var rel = rels[i];
// 		var rid = rel.r.id;
// 		if (res[rid] == undefined) {
// 			res[rid] = {};
// 			res[rid].roles = [];
// 			res[rid].info = rel.r;
// 		}
// 		res[rid].roles.push({
// 			role: rel.ri,
// 			target: rel.t
// 		})
// 	}
// 	return res;
// }

//以下是测试部分

//仅测试
var entValRel = async function (user, proj, ent, val, rel, needRefer, isModel) {
	var newrel = {
		tag: rel, //
		tagid: -1,
		roles: [{
				name: rel,
				tid: val.id
			}, // rid是对应的Role的id
			{
				name: '',
				tid: ent.id
			}
		]
	};
	var res = await createRelInst(user, proj, newrel, needRefer, isModel);
	return res;
}

var test =
	async function () {
		try {
			var tmp1 = await createUser("lalala");
			var tmp0 = await createUser("lalal");
			var tmp2 = await createProject('pro1');
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

			var res = await getAllModelInfo(tmp2);
			console.log(res);
			console.log("=======");
			res = await getAllInstInfo(tmp1, tmp2);
			console.log(res);

		} catch (error) {
			console.log(error);
		}

	};

test();

module.exports = {
	createUser: createUser
}