var stream = {};

var SCAccessControl = Class.create(paella.AccessControl,{
	checkAccess:function(onSuccess) {
		this.permissions.canRead = true;
		this.permissions.canWrite = false;
		this.permissions.canContribute = false;
		this.permissions.loadError = false;
		this.permissions.isAnonymous = false;
		onSuccess(this.permissions);
	}
});

var SCVideoLoader = Class.create(paella.VideoLoader, {
	loadVideo:function(videoId,onSuccess) {
		var url = paella.utils.parameters.get('id');
		if(url) {
			urlxml = ""+url;
			urlservidor = "";
			paella.debug.log("URLXML: "+urlxml);
			paella.debug.log("urlservidor: "+urlservidor);
			jQuery.ajax({
				type:"GET",
				url: urlxml,
				async: false,
				dataType: "xml",
				success: function(data){
					var json = jQuery.xml2json(data);
    				var url = "";
					var baseDir = paella.utils.parameters.get('id').split('/');
					for (var i = 0; i < baseDir.length-1; i++) {
						if(i!=0)
						{
							url = url + "/";
						}
						url = url + baseDir[i];
					}
					//url.join("/");
					stream = {
						sources:{
							mp4:{
								src: urlservidor + url + '/' + getProperty(json.RDF.Description.contentList.Description.files.Seq.li[0], 'xmpDM:value'),
								type:"video/mp4"
							}
						},
						preview: urlservidor + url + '/' + getProperty(json.RDF.Description.contentList.Description.files.Seq.li[2], 'xmpDM:value')
					};
					paella.debug.log(stream);
				},
				error: function(request,status,error){
					paella.debug.log ("Error: "+request.responseText);
					alert("File not found");
				}
			});
			this.streams.push(stream);
			paella.debug.log(this.streams);
		}

		// Callback
		this.loadStatus = true;
		onSuccess();
	}
});

function getProperty(jsonobject,property){
	var ret = undefined;
	$.each(jsonobject, function(index,obj){
		if(index === property)
		{
			ret = obj;
		}
	});
	return ret;
}

function loadPaella(containerId) {
	var initDelegate = new paella.InitDelegate({accessControl:new SCAccessControl(),videoLoader:new SCVideoLoader()});
	
	initPaellaEngage(containerId,initDelegate);
}

function loadPaellaExtended(containerId) {
	var initDelegate = new paella.InitDelegate({accessControl:new SCAccessControl(),videoLoader:new SCVideoLoader()});
	
	initPaellaExtended({containerId:containerId,initDelegate:initDelegate});
}