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

var DOMAIN_NAME = "HubertSochackiDomain1";

var task = function(request, callback){
    
        function prepareSendForm(success){
            //1. load configuration
            var awsConfig = helpers.readJSONFile(AWS_CONFIG_FILE);
            var policyData = helpers.readJSONFile(POLICY_FILE);

            //2. prepare policy
            var policy = new Policy(policyData);

            //3. generate form fields for S3 POST
            var s3Form = new S3Form(policy);
            //4. get bucket name
            var bucket = policy.getConditionValueByKey("bucket");
            //5. get hidden fields and credentials and metadata
            var fields = s3Form.addS3CredientalsFields(s3Form.generateS3FormFields({
                    "Name": "Hubert",
                    "Surname": "Sochacki",
                    "Address": request.connection.remoteAddress
                }), awsConfig);
            callback(null, {template: INDEX_TEMPLATE, params:{fields:fields, bucket:bucket, success: success}});
        }
        
	var success;
	if(request.query.key) {
            // load SimpleDB service
            var sDB = new AWS.SimpleDB();
            // load S3 service
            var s3 = new AWS.S3();
            // load SQS service
            var sqs = new AWS.SQS();
            // load sqs config url
            var sqsURL = helpers.readJSONFile(SQS_CONFIG_FILE).QueueURL;
            //load sqs interface
            var sqsCmd = require('../sqscommand');
            
                waterfall([
                    function(call){
                        // Bucket config
                        var objParams = {Bucket: request.query.bucket, Key: request.query.key};
                        console.log("1 step");
                        s3.getObject(objParams,function(err, data){
                            call(null,{
                                    filename: request.query.key,
                                    etag: request.query.etag,
                                    bucket: request.query.bucket,
                                    url: s3.getSignedUrl('getObject', objParams),
                                    metadata: data.Metadata
                                });
                        });
                    },
                    function(success,call){
                        sqsCmd.send(sqs,sqsURL,success.filename,function(err,data){
                            console.log(err,data);
                            call(null,success); 
                        },{
                            Bucket: {
                                DataType: 'String',
                                StringValue: success.bucket
                            },
                            Key: {
                                DataType: 'String',
                                StringValue: success.filename
                            }
                        });
                    },
                    function(success,call){
                        var domainParam = {
                            DomainName: DOMAIN_NAME
                        };
                        sDB.domainMetadata(domainParam,
                        function(err,domainMeta){
                            if(err) {
                             //domain doesnt exist
                             sDB.createDomain(domainParam,function(err,domain){
                                 console.log("DOMENA:",domain);
                                 call(null,success,domain);
                             });
                            }
                            else
                                call(null,success,domainMeta);
                        });
                    },
                    function(success,domain,call){
                        sDB.putAttributes({
                            DomainName: DOMAIN_NAME,
                            ItemName: success.filename,
                            Attributes:[{
                                    Name: 'Filename',
                                    Value: success.filename,
                                    Replace: true
                            },{
                                Name: 'Bucket',
                                Value: success.bucket,
                                Replace: true
                            }]
                        },function(err,data){
                            if(err) console.log(err);
                            console.log("ITEM:",data);
                            call(null,success,domain,data);
                        });
                    }
                ],function(err,success,domain,item){
                    return prepareSendForm(success,domain,item);
                });
	}
        else {
            return prepareSendForm();
        }
        
	
	
	
};

exports.action = task;
