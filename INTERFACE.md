# 接口说明

所有接口都用`operation`字段表示请求的操作类型，用`reqId`字段作为请求的唯一标识

## 1. 用户管理接口

### 1.1. 创建用户 

用户提供用户名，返回对应用户名的`userId`

如果该用户名对应的用户不存在，则会创建一个新的用户；否则，直接返回已有用户的`userId`

```js
req:
{
	operation: "createUser",
	reqId:"xxx", //请求的唯一标识
	userName: "xxx"
}

response:
{
	reqId: "xxx",
	msg:"success",
	userId: "7"
}
```

### 1.2. 获取用户id 

用户提供用户名，返回该用户名对应的`userId`

如果该用户名对应的用户不存在，会返回`undefined`

```javascript
req:
{
	operation: "getUserId",
	reqId:"xxx", 
	userName: "xxx", 
}

response:
{
	reqId: "xxx",
	msg:"success",
	userId: "7"
}
```

### 1.3. 创建项目

用户提供项目名，返回对应项目名的`projectId`

如果该项目名对应的项目不存在，则会创建一个新的项目；否则，直接返回已有项目的`projectId`

```javascript
{
	operation: "createUser",
	reqId:"xxx", 
	projectName: "xxx"
}

response:
{
	reqId: "xxx",
	msg:"success",
	projectId: "7"
}
```

### 1.4. 获取项目id

用户提供项目名，返回该项目名对应的`projectId`

如果该项目名对应的项目不存在，会返回`undefined`

```javascript
req:
{
	operation: "getProjectId",
	reqId:"xxx", 
	projectName: "xxx",
}

response:
{
	reqId: "xxx",
	msg:"success",
	projectId: "7"
}
```



## 2. 实例层接口

### 2.1. 创建一个实体

用户提供`userId`和`projectId`，以及该实体的类型列表

返回创建的实体的`entityId`

```javascript
req:
{
	operation:"createEntity",
	reqId:"xxx", //请求的唯一标识
	userId:"7",
	projectId:"17",
	entity:{
		tags:["a", "b", "c"]
	}
}

response:
{
	reqId:"xxx",
	msg:"success",
	entityId:"7"
}
```

### 2.2. 添加类型

用户提供`userId`和`projectId`，以及要添加的类型列表

返回创建的实体的`entityId`

```js
req:
{
	operation:"addTags",
	reqId:"xxx", 
	userId:"7",
	projectId:"17",
	entity:{
        id:'27',
		tags:["a", "b", "c"]
	}
}

response:
{
	reqId:"xxx",
	msg:"success",
	entityId:"7"
}
```



### 2.3. 创建一个实例层的关系

用户提供`userId`和`projectId`，以及该关系的类型、在模型层中对应关系的id

关系的角色以列表的形式提供，需要提供名称、承担者的id

其中对于承担者是一个值的情况，直接以`val:{type:"string", value:"vvvv"}`形式表示这个值即可，后台会自动创建这个值

返回创建的实例层关系的id

```javascript
req:
{
	operation:"createRelation",
	reqId:"xxx",
	userId:"7",
	projectId:"17",
	relation:{
		tag:"居住",
		tagId:"7", //模型层中对应的关系的id
		roles:[
			{name:"角色名1", tid:"17"},
			{name:"角色名2", val:{type:"string", value:"vvvv"}}
		]

	}
}

response:
{
	reqId:"xxx",
	msg:"success",
	relationId:"7"
}
```

### 2.4. 删除一个实例层的关系

用户提供`userId`和`projectId`，以及该关系的id

```js
req:
{
	operation:"deleteRelation",
	reqId:"xxx",
	userId:"7",
	projectId:"17",
	relation:{
		id:27
	}
}

response:
{
	reqId:"xxx",
	msg:"success"
}
```



### 2.5. 获取实例层信息

用户提供`userId`和`projectId`

返回该用户在该项目中建立的实例层信息，返回两个`entities`和`relations`两个字典，分别包含实体和关系的信息

```javascript
{
	operation:"getInstInfo",
	reqId:"xxx", //请求的唯一标识
	userId:"7",
	projectId:"17"
}

response:
{
	reqId:"xxx",
	msg:"success",
	info:{
		entities:{
			'7':{
				...
			}
		},
		relations:{
         	'17':{
           		... 
         	}
		},
	}
}
```

