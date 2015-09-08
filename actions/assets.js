var path = require('path');
var task = function(req,callback){
	callback(null,null,path.resolve(__dirname+'/../'+req.path));
}
exports.action = task;