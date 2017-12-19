# kg-server
基于Neo4j的多用户知识图谱构建工具。

## 1. 文件说明
1. [config.js](config.js)：Neo4j图数据库地址、端口等的配置文件
2. [db.js](db.js)：与Neo4j交互的低层接口
3. [info.js](info.js)：获取模型层和实例层信息的接口
4. [interface.js](interface.js)：提供给用户的高层操作
5. [manager.js](manager.js)：用户和项目管理相关的接口
6. [schema.js](schema.js)：Neo4j的Schema
7. [test.js](test.js)：一些测试用例
8. [utils.js](utils.js)：一些工具函数


## 2. 使用方法

启动Neo4j服务器，修改`configs.js`中服务器的配置

```js
var interface = require('./interface')
var req = ...
var res = await interface.reqHandle(req)
```

允许的`req`格式，请参考[INTERFACE.md](INTERFACE.md)