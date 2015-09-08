var AWS = require("aws-sdk");
var AWS_CONFIG_FILE = "config.json";
AWS.config.loadFromPath(AWS_CONFIG_FILE);

var task = function(request,response){
	var s3 = new AWS.S3();
	var params = {
		Bucket: request.body.bucket,
		Key: request.body.key
	};
	s3.deleteObject(params,function(err,data){
		if(err) console.error(err);
		console.info("S3 OBJ REMOVED",data);
		response(err,data);
	});
};

exports.action = task;