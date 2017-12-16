/*
 * @Author: locusxt
 * @Date: 2017-12-16 23:41:56
 * @Last Modified by: locusxt
 * @Last Modified time: 2017-12-17 00:09:32
 */

var config = require("./config");

var db = require("seraph")(config.server_config);

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
