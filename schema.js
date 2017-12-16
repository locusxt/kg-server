var config = require("./config")

var db = require("seraph")(config.server_config);


var model = require('seraph-model');

var User = model(db, 'User');
User.schema = {
    mtype: {
        type: String,
        required: false,
        default: 'User'
    },
    name: {
        type: String,
        required: true,
        default: 'Anonymous'
    }
};

var Project = model(db, 'Project');
Project.schema = {
    mtype: {
        type: String,
        required: false,
        default: 'Project'
    },
    name: {
        type: String,
        required: true,
        default: 'Unknown'
    },
    description: {
        type: String,
        required: false
    }
};

var Value = model(db, 'Value');
Value.schema = {
    mtype: {
        type: String,
        required: false,
        default: 'Value'
    },
    type: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    }
}

var Role = model(db, 'Role');
Role.schema = {
    mtype: {
        type: String,
        required: false,
        default: 'Role'
    },
    name: {
        type: String,
        required: true,
        default: ''
    },
    multiplicity: {
        type: String
    }
}

var RoleInst = model(db, 'RoleInst');
RoleInst.schema = {
    mtype: {
        type: String,
        required: false,
        default: 'RoleInst'
    },
    name: {
        type: String,
        required: true,
        default: ''
    },
    //rid : {type : Number, required : true, default : -1} //对应的role的id，-1表示不存在
}

var Relation = model(db, 'Relation');
Relation.schema = {
    mtype: {
        type: String,
        required: false,
        default: 'Relation'
    },
    name: {
        type: String,
        required: true
    },
    diversity: {
        type: Number
    },
    visible: {
        type: Boolean
    } //应该是没用的了。。
}

// relation instance
var RelInst = model(db, 'RelInst');
RelInst.schema = {
    mtype: {
        type: String,
        required: false,
        default: 'RelInst'
    },
    tag: {
        type: String,
        required: true
    },
    tagid: {
        type: Number,
        required: true,
        default: -1
    } //对应的Relation的id
}

//认为概念和实体除了层次不一样之外，没有明显区别
var Entity = model(db, 'Entity');

var Model = model(db, 'Model');

var Inst = model(db, 'Inst');

module.exports = {
    User: User,
    Project: Project,
    Value: Value,
    Role: Role,
    RoleInst: RoleInst,
    Relation: Relation,
    RelInst: RelInst,
    Entity: Entity,
    Model: Model,
    Inst: Inst
}