var config = require("./config");

var db = require("seraph")(config.server_config);

var schema = require("./schema");

//根据用户名，获取用户
var getUser = async function(username) {
	return new Promise((resolve, reject) => {
		schema.User.where({name : username}, (err, users) => {
			if (err)
				throw err;
			resolve(users);
		});
	});
};

var readUser = async function(id) {
	return new Promise(
		(resolve, reject) => {schema.User.read(id, (err, res) => {
			if (err)
				throw err;
			resolve(res);
		})})
};

//创建用户，如果已经存在，则直接返回
var createUser = async function(username) {
	var users = await getUser(username);
	var len = users.length;
	if (len != 0)
		return new Promise((resolve, reject) => { resolve(users[0]); });
	else
	{
		return new Promise((resolve, reject) => {
			schema.User.save({name : username}, (err, res) => {
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
		schema.Project.where({name : projectname}, (err, projects) => {
			if (err)
				throw err;
			resolve(projects);
		});
	});
};

var readProject =
	async function(id) {
	return new Promise(
		(resolve, reject) => {schema.Project.read(id, (err, res) => {
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
			schema.Project.save({name : projectname}, (err, res) => {
				if (err)
					throw err;
				resolve(res);
			});
		});
	}
};

//参数直接是编号
var isUserOwnProject = async function(uid, pid) {
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
};

//建立用户和项目之间的own关系，用户对于同一个项目只能有一个own关系
var userOwnProject = async function(uid, pid) {
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
};

module.exports = {
	getUser : getUser,
	readUser : readUser,
	createUser : createUser,
	getProject : getProject,
	readProject : readProject,
	createProject : createProject,
	isUserOwnProject : isUserOwnProject,
	userOwnProject : userOwnProject
}