var AWS = require("aws-sdk");
var waterfall = require('async-waterfall');
var helpers = require("../helpers");
var NoSQL = require("../nosql");
var AWS_CONFIG_FILE = "config.json";
var SIMPLEDB_CONFIG_FILE = "simpledbconfig.json";
AWS.config.loadFromPath(AWS_CONFIG_FILE);
var simpledbconfig = helpers.readJSONFile(SIMPLEDB_CONFIG_FILE);

var task = function(request,response) {
		var s3 = new AWS.S3();
		var params = {
			Bucket: request.body.bucket,
			Key: request.body.key
		};
		waterfall([
			function(call){	
				s3.getObject(params,function(err, data){
		            call(null,data);
		        });
			},
			function(data,call){
				NoSQL.open(new AWS.SimpleDB(), simpledbconfig ,function(nosql){
					call(null, data, nosql);
				},NoSQL.CREATE_IF_NOT_EXISTS);
			},
			function(data,nosql,call){
				nosql.get(params.Key,function(err, attr){
					call(err,data,attr.Attributes);
				});
			}
		],function(err,data,sdb){
			response(err,{
                    data: data,
                    url: s3.getSignedUrl('getObject', params),
                    sdb: sdb
                })
		});
};

exports.action = task;