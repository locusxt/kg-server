"use strict";
var db = require("seraph")({user : 'neo4j', pass : 'passwd'});

var model = require('seraph-model');

var User = model(db, 'User');
User.schema = {
    mytype : {type: String, required : true, default : 'User'},
    name : {type : String, required : true, default : 'Anonymous'}
};

var Project = model(db, 'Project');
Project.schema = {
    mytype : {type: String, required : true, default : 'Project'},
	name : {type : String, required : true, default : 'Unknown'},
	description : {type : String, required : false}
};

var Role = model(db, 'Role');
Role.schema = {
    mytype : {type: String, required : true, default : 'Role'},
	name : {type : String, required : true, default : ''},
	multiplicity : {type : String}
}

var RoleInst = model(db, 'RoleInst');
RoleInst.schema = {
    mytype : {type: String, required : true, default : 'RoleInst'},
	name : {type : String, required : true, default : ''},
	role_id : {type : Number, required : true, default : -1} //具体是哪个角色的实例
}

var Relation = model(db, 'Relation');
Relation.schema = {
    mytype : {type: String, required : true, default : 'Relation'},
	name : {type : String, required : true},
    diversity : {type : Number},
    visible: {type:Boolean}
}

var RelInst = model(db, 'RelInst');
RelInst.schema = {
    mytype : {type: String, required : true, default : 'RelInst'},
	name : {type : String, required : true},
	rel_id : {type : Number, required : true, default : -1} //具体是哪个关系的实例
}

//模型层概念
var Concept = model(db, 'Concept');
Concept.schema = {
    mytype : {type: String, required: true, default : 'Concept'}
}

//概念的实例，既可能在实例层，也可能在概念层
var Entity = model(db, 'Entity');
Entity.schema = {
    mytype :{type:String, required: true, default:'Entity'},
    value : {type:String, required : false}
}

//根据用户名，获取用户，需要保证用户名唯一
var getUser = async function(username) {
	return new Promise((resolve, reject) => {
		User.where({name : username}, (err, users) => {
			if (err)
				throw err;
			resolve(users);
		});
	});
};

//根据User节点id返回节点
var readUser =
	async function(id) {
	return new Promise((resolve, reject) => {User.read(id, (err, res) => {
						   if (err)
							   throw err;
						   resolve(res);
					   })})
}

//根据传入的用户名，创建用户；如果已经存在，则直接返回
//创建或返回一个标签为User的节点 (:User{mytype:'User', name:username})
var createUser = async function(username) {
	var users = await getUser(username);
	var len = users.length;
	if (len != 0)
		return new Promise((resolve, reject) => { resolve(users[0]); });
	else
	{
		return new Promise((resolve, reject) => {
			User.save({name : username}, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		});
	}
};

//根据项目名称获取项目
var getProject = async function(projectname) {
	return new Promise((resolve, reject) => {
		Project.where({name : projectname}, (err, projects) => {
			if (err)
				throw err;
			resolve(projects);
		});
	});
};

var readProject =
	async function(id) {
	return new Promise((resolve, reject) => {Project.read(id, (err, res) => {
						   if (err)
							   throw err;
						   resolve(res);
					   })})
}

var createProject = async function(projectname) {
	var projects = await getProject(projectname);
	var len = projects.length;
	if (len != 0)
		return new Promise((resolve, reject) => { resolve(projects[0]); });
	else
	{
		return new Promise((resolve, reject) => {
			Project.save({name : projectname}, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		});
	}
};

//判断用户与项目之间是否有own关系，
//参数直接是编号
var isUserOwnProject =
async function(uid, pid) {
// var user = await readUser(uid);
// var project = await readProject(pid);
var cypher = "START u=node({uid}), p=node({pid}) " +
             "MATCH (u)-[r:own]->(p) " +
             "RETURN r";
return new Promise((resolve, reject) => {
    db.query(cypher, {uid : uid, pid : pid}, (err, res) => {
        if (err)
            console.log(err);
        resolve(res);
    });
});
}

//建立用户和项目之间的own关系，用户对于同一个项目只能有一个own关系
//对于与用户有own关系的项目，用户可以修改其模型层的内容
var userOwnProject =
async function(uid, pid) {
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

//创建一个Entity
//模型层和实例层的模型通过label中是否含有Model区分
//(:Entity:Model {})
var createEntity =
async function(uid, pid, needRefer, isModel = false) {
var user = await readUser(uid);
var project = await readProject(pid);
return new Promise((resolve, reject) => {
    var txn = db.batch();
    var ent = txn.save({});
    txn.label(ent, 'Entity');
    if (isModel)
        txn.label(ent, 'Model');
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