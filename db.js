"use strict";
var db = require("seraph")({
    user: 'neo4j',
    pass: 'passwd'
});

var model = require('seraph-model');

var User = model(db, 'User');
User.schema = {
    name:{type:String, required: true,  default: 'Anonymous'}
};

var Project = model(db, 'Project');
Project.schema = {
    name:{type:String, required: true, default:'Unknown'},
    description:{type:String, required:false}
};

var Value = model(db, 'Value');
Value.schema = {
    type: {type:String, required:true},
    value: {type:String, required:true}
}

var Role = model(db, 'Value');
Role.schema = {
    name: {type:String, required:true, default:''},
    multiplicity: {type:String}
}

var RoleInst = model(db, 'RoleInst');
RoleInst.schema = {
    name:  {type:String, required:true, default:''},
    rid: {type:Number, required:true, default:-1}
}

var Relation = model(db, 'Relation');
Relation.schema = {
    name:{type:String, required:true},
    diversity:{type:Number}
}

//relation instance
var RelInst = model(db, 'RelInst');
RelInst.schema = {
    tag: {type:String, required:true},
    tagid: {type:Number, required:true, default:-1}
}

var Entity = model(db, 'Entity');

//根据用户名，获取用户
var getUser = async function (username) {
    return new Promise((resolve, reject)=>{
        User.where({name:username}, (err, users)=>{
            if(err) throw err;
            resolve(users);
        });
    });
};

var readUser = async function(id) {
    return new Promise((resolve, reject)=>{
        User.read(id, (err, res)=>{
            if (err) throw err;
            resolve(res);
        })
    })
}

//创建用户，如果已经存在，则直接返回
var createUser = async function (username) {
    var users = await getUser(username);
    var len = users.length;
    if (len != 0)
        return new Promise((resolve, reject)=>{
            resolve(users[0]);
        });
    else{
        return new Promise((resolve, reject)=>{
            User.save({name:username}, (err, res)=>{
                if (err) throw err;
                resolve(res);
            });
        });
    }
};

//根据项目名称获取项目
var getProject = async function (projectname) {
    return new Promise((resolve, reject)=>{
        Project.where({name:projectname}, (err, projects)=>{
            if(err) throw err;
            resolve(projects);
        });
    });
};

var readProject = async function(id) {
    return new Promise((resolve, reject)=>{
        Project.read(id, (err, res)=>{
            if (err) throw err;
            resolve(res);
        })
    })
}

var createProject = async function (projectname) {
    var projects = await getProject(projectname);
    var len = projects.length;
    if (len != 0)
        return new Promise((resolve, reject)=>{
            resolve(projects[0]);
        });
    else{
        return new Promise((resolve, reject)=>{
            Project.save({name:projectname}, (err, res)=>{
                if (err) throw err;
                resolve(res);
            });
        });
    }
};


//参数直接是编号
var isUserOwnProject = async function (uid, pid){
    // var user = await readUser(uid);
    // var project = await readProject(pid);
    var cypher = "START u=node({uid}), p=node({pid}) "
                        +"MATCH (u)-[r:own]->(p) "
                        +"RETURN r";
    return new Promise((resolve, reject) => {
        db.query(cypher, {uid: uid, pid:pid}, (err, res)=>{
            if(err) console.log(err);
            resolve(res);
        });
    });
}

//建立用户和项目之间的own关系，用户对于同一个项目只能有一个own关系
var userOwnProject = async function (uid, pid){
    var owns = await isUserOwnProject(uid, pid);
    if(owns.length != 0) return owns[0];
    var user = await readUser(uid);
    var project = await readProject(pid);
    return new Promise((resolve, reject)=>{
        db.relate(user, 'own', project, (err, res)=>{
            if (err) throw err;
            resolve(res);
        });
    })
}

var createEntity = async function (uid, pid, needRefer){
    var user = await readUser(uid);
    var project = await readProject(pid);
    return new Promise((resolve, reject)=>{
        var txn = db.batch();
        var ent = txn.save({});
        txn.label(ent, 'Entity'); 
        txn.relate(ent, "in", project.id);
        if (needRefer) txn.relate(user.id, "refer", ent);
        txn.commit((err, res)=>{
            if(err) throw err;
            resolve(res[ent]);
        })
    })
}

//根据value的类型和具体的值，获取value节点
var getValue = async function (type, value){
    return new Promise((resolve, reject)=>{
        Value.where({type:type, value:value}, (err, res)=>{
            if(err) throw err;
            resolve(res);
        });
    });
}

//value是共用的，不需要有引用关系
//不允许出现完全一样的两个Value节点
var createValue = async function (type, value, uid, pid, needRefer){
    var user = await readUser(uid);
    var project = await readProject(pid);

    var values = await getValue(type, value);
    var len = values.length;
    if (len != 0) 
        return values[0];
    else
        return new Promise((resolve, reject)=>{
            Value.save({type:type, value:value}, (err, res)=>{
                if (err) throw err;
                resolve(res);
            });
        });
}

var readNode = async function(nid){
    return new Promise((resolve, reject)=>{
        db.read(nid, (err, res)=>{
            if(err) throw err;
            resolve(res);
        })
    })
}

var isReferNode = async function (nid, uid){
    var cypher = "START u=node({uid}), n=node({nid}) "
    +"MATCH (u)-[r:refer]->(n) "
    +"RETURN r";
    return new Promise((resolve, reject) => {
    db.query(cypher, {uid: uid, nid:nid}, (err, res)=>{
            if(err) console.log(err);
            resolve(res);
        });
    });
}

//一个用户只允许refer一个节点一次，不能多次refer同一个节点
var userReferNode = async function (nid, uid){
    var user = await readUser(uid);
    // var project = await readProject(pid);
    var node = await readNode(nid);//保证node存在
    var refers = await isReferNode(node.id, user.id);
    var len = refers.length;
    if (len != 0)
        return refers[0];
    else
        return new Promise((resolve, reject) =>{
            db.relate(user, "refer", node, (err, res)=>{
                if (err) throw err;
                resolve(res);
            })
        })
}

/* rel
{
    tag:'', //
    tagid:12,
    roles:[
        {name:'', tid:'', rid} //rid是对应的Role的id
    ]
}
一个roleInst只能指向一个实体或者对象，否则无法区分具体用户引用的是哪个实体或者对象
*/
var createRelInst = async function (uid, pid, rel, needRefer){
    var user = await readUser(uid);
    var project = await readProject(pid);
    return new Promise((resolve, reject)=>{
        var txn = db.batch();
        var relInst = txn.save({tag:rel.tag, tagid:rel.tagid});
        txn.label(relInst, 'RelInst');
        txn.relate(relInst, 'in', project.id);
        if(needRefer) txn.relate(user.id, 'refer', relInst);
        for (var i in rel.roles){
            var tmpRole = txn.save({name:rel.roles[i].name, rid:rel.roles[i].rid});
            txn.label(tmpRole, 'RoleInst');
            txn.relate(tmpRole, 'in', project.id);
            if(needRefer) txn.relate(user.id, 'refer', tmpRole);
            txn.relate(relInst, 'hasRole', tmpRole);
            txn.relate(tmpRole, 'hasTarget', rel.roles[i].tid);
        }
        txn.commit((err, res)=>{
            if(err) throw err;
            resolve(res[relInst]);
        })
    });
}

var test = async function(){
    var tmp1 = await createUser("lalala");
    // console.log(tmp1);
    var tmp2 = await createProject('pro1');
    // console.log(tmp2);
    var rel = await userOwnProject(tmp1.id, tmp2.id);
    // console.log(rel);
    var ent1 = await createEntity(tmp1, tmp2, true);//jiabaoyu 
    var ent2 = await createEntity(tmp1, tmp2, true);//lindaiyu
    var v1 = await createValue("string", "贾宝玉", tmp1, tmp2, false);
    var v2 = await createValue("string", "林黛玉", tmp1, tmp2, false);
    console.log(ent1);
    console.log(ent2);
    var rel_info = {
        tag:'名称',
        tagid:-1,
        roles:[
            {name:'', tid:ent1.id, rid:-1},
            {name:'名称', tid:v1.id, rid:-1}
        ]
    }
    await createRelInst(tmp1, tmp2, rel_info, true);
    rel_info = {
        tag:'名称',
        tagid:-1,
        roles:[
            {name:'', tid:ent2.id, rid:-1},
            {name:'名称', tid:v2.id, rid:-1}
        ]
    }
    await createRelInst(tmp1, tmp2, rel_info, true);
    // var vv = await createValue("string", "test1", tmp1, tmp2, false);
    // var rel2 = {
    //     tag:'what',
    //     tagid:'-1',
    //     roles:[
    //         {name:'r1', tid:ent1.id, rid:-1},
    //         {name:'r2', tid:vv.id, rid:-1}
    //     ]
    // }
    // var relr = await createRelInst(tmp1, tmp2, rel2, true);

    // console.log(vv);

    // var n = await readNode(8);
    // console.log(n);

    // var tmp3 = await createUser("zhuting");
    // var rr = await userReferNode(ent2, tmp3);

};

test();