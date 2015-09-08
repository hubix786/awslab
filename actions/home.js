var util = require("util");
var helpers = require("../helpers");
var Policy = require("../s3post").Policy;
var S3Form = require("../s3post").S3Form;
var waterfall = require('async-waterfall');
var AWS_CONFIG_FILE = "config.json";
var SQS_CONFIG_FILE = "sqsconfig.json";
var POLICY_FILE = "policy.json";
var INDEX_TEMPLATE = "index.ejs";
var AWS = require("aws-sdk");
AWS.config.loadFromPath(AWS_CONFIG_FILE);


function prepareUploadFormFields(awsConfig,policy,request){
    var s3Form = new S3Form(policy);
    policy.setConditionByKey('success_action_redirect',request.protocol+"://"+request.headers.host);
    return s3Form.addS3CredientalsFields(s3Form.generateS3FormFields({
            "Name": "Hubert",
            "Surname": "Sochacki",
            "Address": request.connection.remoteAddress
        }), awsConfig);
}

var task = function(request,response){
	var config = helpers.readJSONFile(AWS_CONFIG_FILE);
	//s3 upload form creation process
    var policy = new Policy(helpers.readJSONFile(POLICY_FILE)); 
    var bucket = policy.getConditionValueByKey("bucket");
    var prefix = policy.getConditions()[0][2];
	var fields = prepareUploadFormFields(config,policy,request);
	//s3 get bucket file list
	var s3 = new AWS.S3();
	s3.listObjects({
		Bucket: bucket,
		Prefix: prefix
	},function(err,bucketObjects){
		var objects = bucketObjects.Contents.filter(function(item){
			return item.Key.match(/(png|gif|jpeg|jpg|bmp)/);
		}).map(function(item){
			item.Name = item.Key.replace(prefix,'');
			return item;
		});
		response(null, {template: INDEX_TEMPLATE, params:{fields:fields, bucket:bucket, prefix: prefix, objects: objects}});
	});

	
};
exports.action = task;