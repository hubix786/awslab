(function(){
	var elem = null;

	function progressbarLoading(progress){
		progress.parent().show();
		var load = 0;
		progress.width(load);
		var interval = setInterval(function(){
			load = (load+10)%101;
			progress.width(load+"%");
		},400);
		return {
			stop: function(){
				clearInterval(interval);
				progress.parent().hide();
			}
		};
	}
	$('#bucket-objects').children().click(function(){
		var interval = progressbarLoading($('#progress-bar'));
		if(elem)
			elem.removeClass('active');
		elem = $(this).addClass('active');
		$('.tab-pane.active:not(#operations) div').fadeOut(function(){
			$(this).empty().fadeIn();
		});
		var bucket = elem.data('bucket');
		var key = elem.data('key');
		$.post('/s3get',{bucket:bucket,key:key},function(data){
			interval.stop();
			var sdb = data.sdb;
			FileReader.readFromArrayToDataUrl(data.data.Body.data || data.data.Body,"image/jpeg",function(result){
				$('<img>',{src:result}).appendTo($('#preview div').empty());
			});
			var metadataElem = null;
			var nosqlElem = null;
			data = data.data;
			var info = $('<dl>',{class:'dl-horizontal'}).appendTo($('#info  div').empty());
			info.append($('<dt>',{text:'Last modified:'}))
			.append($('<dd>',{text:data.LastModified}))
			.append($('<dt>',{text:'ETag:'}))
			.append($('<dd>',{text:data.ETag}))
			.append($('<dt>',{text:'Size:'}))
			.append($('<dd>',{text:data.ContentLength+' '+data.AcceptRanges}))
			.append($('<dt>',{text:'Metadata:'}))
			.append((metadataElem = $('<dd>',{html:'&nbsp;'})))
			.append($('<dt>',{text:'NoSQL:'}))
			.append((nosqlElem = $('<dd>',{html:'&nbsp;'})));
			var list = $('<dl>',{class:'dl-horizontal'});
			var list2 = $('<dl>',{class:'dl-horizontal'});
			data.Metadata ? Object.keys(data.Metadata).forEach(function(key){
				list.append($('<dt>',{text:key})).append($('<dd>',{text:data.Metadata[key]}));
			}) : null;
			sdb ? Object.keys(sdb).forEach(function(key){
				list2.append($('<dt>',{text:sdb[key].Name})).append($('<dd>',{text:sdb[key].Value}));
			}) : null;
			list.appendTo(metadataElem);
			list2.appendTo(nosqlElem);
		})
	});
	function serializeForm(formElem){
		var obj = {};
		for(var i=0, l= formElem.length; i < l; i++){
			if(formElem[i].type !== "submit") {
				console.log(formElem[i].type);
				if(formElem[i].type === "checkbox") 
					obj[formElem[i].name] = formElem[i].checked;
				else
					obj[formElem[i].name] = formElem[i].value;
			}
		}
		return obj;
	}
	$('#do-form').on('submit',function(e){
		e.preventDefault();
		if(!elem)
			return;
		var formData = serializeForm(this);
		formData['bucket'] = elem.data('bucket');
		formData['key'] = elem.data('key');
		console.log(formData);
		$.post(this.action, formData ,function(result){
			console.log(result);
			$('#komunikat').html('<strong>'+formData['key']+'</strong> Process in progress').parent().fadeIn();
		});
	});
	$('#del-form').on('submit',function(e){
		e.preventDefault();
		if(!elem)
			return;
		if(confirm('Do you want to delete file?')) {
			var formData = serializeForm(this);
			formData['bucket'] = elem.data('bucket');
			formData['key'] = elem.data('key');
			console.log(formData);
			$.post(this.action, formData ,function(result){
				console.log(result);
				location.reload();
			});
		}
		
	});
	$('#brightness').on('mousemove',function(){
		$('#brightness-count').text(this.value);
	});
	$('.dissmiss').click(function(e){
		e.preventDefault();
		$(this).parent().fadeOut();
	});
})();

Element.prototype.load = function(callback){
	this.addEventListener("load",function(e){
		return callback(e.target,e);
	});
	return this;
};

FileReader.prototype.load = Element.prototype.load;

FileReader.readToDataUrl = function(f, callback){
	var reader = new FileReader();
	reader.load(function(target,e){
		return callback(target.result,target,e,f);
	});
	reader.readAsDataURL(f);
	return reader;
};

FileReader.read = function(f, callback){
	var reader = new FileReader();
	reader.load(function(target,e){
		return callback(target.result,target,e,f);
	});
	reader.readAsBinaryString(f);
	return reader;
};

FileReader.readFromArrayToDataUrl = function(buffer,type,callback) {
	var blob = new Blob([new Uint8Array(buffer)],{type: type});
	FileReader.readToDataUrl(blob,function(result){
		callback(result);
	});
};
