/*
 * @Author: locusxt
 * @Date: 2017-12-16 23:41:56
 * @Last Modified by: locusxt
 * @Last Modified time: 2017-12-18 10:28:57
 */

var config = require("./config");

var db = require("seraph")(config.server_config);

var manager = require("./manager");

//清空整个数据库
exports.clear = async function() {
	var cypher = "MATCH (n) " +
				 "DETACH DELETE n";

	return new Promise((resolve, reject) => {
		db.query(cypher, {},
				 (err, res) => {
					 if (err)
						 console.log(err);
					 resolve(res);
				 });
	});
};

//获取某个实体的所有tag
exports.getTags = 
    async function(uid, pid, eid){
        var user = await manager.readUser(uid);
        var project = await manager.readProject(pid);

        var cypher = "START u=node({uid}), p=node({pid}), e=node({eid}) " +
                 "MATCH (u)-[:refer]->(e) " +
                 "MATCH (e)-[:in]->(p) " +
                 "MATCH (e)<-[:hasTarget]-(:RoleInst)<-[:hasRole]-(tag:RelInst {tag:'tag', tagid:-2})-[:hasRole]->(:RoleInst)-[:hasTarget]->(v:Value)" +
                 "MATCH (u)-[:refer]->(tag) " +
                 "RETURN v.value";
        return new Promise((resolve, reject) => {
            db.query(cypher, {uid : user.id, pid : project.id, eid:eid}, (err, res) => {
                if (err)
                    console.log(err);
                resolve(res.map ((kv) =>{
					return kv['v.value'];
				}));
            });
        });
    };