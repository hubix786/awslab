var AWS_CONFIG_FILE = "config.json";
var SQS_CONFIG_FILE = "sqsconfig.json";
var SIMPLEDB_CONFIG_FILE = "simpledbconfig.json";
var AWS = require("aws-sdk");
var NoSQL = require("../nosql");
var sqsUtils = require('../sqscommand');
var helpers = require("../helpers");
var waterfall = require('async-waterfall');
AWS.config.loadFromPath(AWS_CONFIG_FILE);

var task = function(request, response) {
	var params = request.body;
	var queue = new sqsUtils.SQSQueue(new AWS.SQS(), helpers.readJSONFile(SQS_CONFIG_FILE).QueueURL);
	waterfall([
		function(call){
			NoSQL.open(new AWS.SimpleDB(), helpers.readJSONFile(SIMPLEDB_CONFIG_FILE),function(nosql){
				call(null, nosql);
			},NoSQL.CREATE_IF_NOT_EXISTS);
		},
		function(nosql,call){
			queue.send(JSON.stringify(params),function(err,queueResult){
				call(null, nosql, queueResult);
			});
		},
		function(nosql,queueResult,call){
			var attr = [
				{Name:'LastOrder',
				Value: JSON.stringify([Date.now(),params.brightness,params.negative]),
				Replace:true}
			];
			nosql.put(params.key,attr,function(err,data){
				call(err,data);
			});
		}
	],function _result(err,data){
		if(err) console.log("ERR:",err,data);
		response(err,{"msg":"OK"});	
	});
	
};

exports.action = task;