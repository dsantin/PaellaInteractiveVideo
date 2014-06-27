paella.AsyncLoaderCallback = Class.create({
	name:"",
	prevCb:null,
	nextCb:null,
	loader:null,

	initialize:function(name) {
		this.name = name;	
	},
	
	load:function(onSuccess,onError) {
		paella.debug.log("loading " + this.name);
		onSuccess();
		// If error: onError()
	}
});

paella.AjaxCallback = Class.create(paella.AsyncLoaderCallback,{
	params:null,
	type:'get',
	
	data:null,
	mimeType:null,
	statusCode:null,
	rawData:null,
	
	getParams:function() {
		return this.params;
	},
	
	willLoad:function(callback) {
		
	},
	
	didLoadSuccess:function(callback) {
		return true;
	},
	
	didLoadFail:function(callback) {
		return false;
	},
	
	initialize:function(params,type) {
		this.name = "ajaxCallback";
		if (type) this.type = type;
		if (typeof(params)=='string') this.params = {url:params}
		else if (typeof(params)=='object') this.params = params;
		else this.params = {}
	},

	load:function(onSuccess,onError) {
		var This = this;
		if (typeof(this.willLoad)=='function') this.willLoad(this);
		paella.ajax.send(this.type,this.getParams(),
			function(data,type,code,rawData) {
				var status = true;
				This.data = data;
				This.mimeType = type;
				This.statusCode = code;
				This.rawData = rawData;
				if (typeof(This.didLoadSuccess)=='function') status = This.didLoadSuccess(This);
				if (status) onSuccess();
				else onError();
			},
			function(data,type,code,rawData) {
				var status = false;
				This.data = data;
				This.mimeType = type;
				This.statusCode = code;
				This.rawData = rawData;
				if (typeof(This.didLoadFail)=='function') status = This.didLoadFail(This);
				if (status) onSuccess();
				else onError();
			});
	}
});

paella.JSONCallback = Class.create(paella.AjaxCallback,{
	initialize:function(params,type) { this.parent(params,type); },
	
	didLoadSuccess:function(callback) {
		if (typeof(callback.data)=='object') return true;
		
		try {
			callback.data = JSON.parse(callback.data);
			return true;
		}
		catch (e) {
			callback.data = {error:"Unexpected data format",data:callback.data}
			return false;
		}
	}
});

paella.DictionaryCallback = Class.create(paella.AjaxCallback,{
	initialize:function(dictionaryUrl) { this.parent({url:dictionaryUrl}); },
	
	getParams:function() {
		var lang = paella.utils.language();
		this.params.url = this.params.url + '_' + lang + '.json';
		return this.params;
	},
	
	didLoadSuccess:function(callback) {
		paella.dictionary.addDictionary(callback.data);
		return true;
	},
	
	didLoadFail:function(callback) {
		return true;
	}
})

paella.AsyncLoader = Class.create({
	firstCb:null,
	lastCb:null,
	callbackArray:null,
	generatedId:0,
	
	currentCb:null,

	initialize:function() {
		this.callbackArray = {};
		this.generatedId = 0;
	},
	
	addCallback:function(cb,name) {
		if (!name) {
			name = "callback_" + this.generatedId++;
		}
		this.callbackArray[name] = cb;
		if (!this.firstCb) {
			this.firstCb = cb;
			this.currentCb = cb;
		}
		cb.prevCb = this.lastCb;
		if (this.lastCb) this.lastCb.nextCb = cb;
		this.lastCb = cb;
		cb.loader = this;
		return cb;
	},
	
	getCallback:function(name) {
		return this.callbackArray[name];
	},

	load:function(onSuccess,onError) {
		var This = this;
		if (this.currentCb) {
			this.currentCb.load(function() {
				This.currentCb = This.currentCb.nextCb;
				This.load(onSuccess);
			},
			function() {
				if (typeof(onError)=='function') onError();
			});
		}
		else if (typeof(onSuccess)=='function') {
			onSuccess();
		}
	}
});

paella.Dictionary = Class.create({
	dictionary:{},

	initialize:function() {
		
	},

	addDictionary:function(dict) {
		for (var key in dict) {
			this.dictionary[key] = dict[key];
		}
	},
	
	translate:function(key) {
		var value = this.dictionary[key];
		if (value) return value;
		else return key;
		
		
	}
});

paella.dictionary = new paella.Dictionary();

paella.ajax = base.ajax;

// Deprecated: use paella.ajax.get/post/delete/put...
paella.Ajax = Class.create({
	callback:null,

	// Params:
	//	url:http://...
	//	data:{param1:'param1',param2:'param2'...}
	// 	onSuccess:function(response)
	initialize:function(url,params,onSuccess,proxyUrl,useJsonp,method) {
		paella.debug.log("WARNING: paella.Ajax() is deprecated, use base.ajax.get/paella.ajax.post/paella.ajax.delete/paella.ajax.put instead.");
		var thisClass = this;
		this.callback = onSuccess;
		var thisClass = this;
		if (!method) method = 'get';
		if (useJsonp) {
            jQuery.ajax({url:url,type:method,dataType:'jsonp', jsonp:'jsonp', jsonpCallback:'callback', data:params,cache:false}).always(function(data) {
				//paella.debug.log('using jsonp');
				thisClass.callCallback(data);
			});
		}
		else if (proxyUrl && proxyUrl!="") {
			params.url = url;
			jQuery.ajax({url:proxyUrl,type:method,data:params,cache:false}).always(function(data) {
				//paella.debug.log('using AJAX');
				thisClass.callCallback(data);
			});
		}
		else {
			jQuery.ajax({url:url,type:method,data:params,cache:false}).always(function(data) {
				//paella.debug.log('using AJAX whithout proxy');
				thisClass.callCallback(data);
			});
		}
	},

	callCallback:function(data) {
		if (this.callback && data!=null) {
			if (typeof(data)=="object" && data.responseText) {
				this.callback(data.responseText);
			}
			else {
				this.callback(data);
			}
		}
		else if (this.callback) {
			this.callback('{"result":"ok"}');
		}
	}
});

paella.Timer = Timer;	// base.js Timer

paella.utils = {
	ajax:paella.ajax,

	cookies:{
		set:function(name,value) {
			document.cookie = name + "=" + value;
		},
	
		get:function(name) {
			var i,x,y,ARRcookies=document.cookie.split(";");
			for (i=0;i<ARRcookies.length;i++) {
				x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
				y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
				x=x.replace(/^\s+|\s+$/g,"");
				if (x==name) {
					return unescape(y);
				}
			}
		}
	},

	parameters:{
		list:null,

		parse:function() {
			if (!this.list) {
				var url = window.location.href;
				if (/https?:\/\/([a-z0-9.\-_\/\~:]*\?)([a-z0-9.\/\-_\%\=\&]*)\#*/i.test(url)) {
					var params = RegExp.$2;
					var paramArray = params.split('&');
					this.list = {}
					for (var i=0; i<paramArray.length;++i) {
						var keyValue = paramArray[i].split('=');
						var key = keyValue[0]
						var value = keyValue.length==2 ? keyValue[1]:'';
						this.list[key] = value;
					}
				}
				else {
					this.list = []
				}
			}
		},

		get:function(parameter) {
			return this.list[parameter];
		}
	},

    require: function(libraryName) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = libraryName;
        document.getElementsByTagName('head')[0].appendChild(script);
    },
    
    importStylesheet:function(stylesheetFile) {
    	var link = document.createElement('link');
    	link.setAttribute("rel","stylesheet");
    	link.setAttribute("href",stylesheetFile);
    	link.setAttribute("type","text/css");
    	link.setAttribute("media","screen");
    	document.getElementsByTagName('head')[0].appendChild(link);
    },

	// Deprecated. Use paella.Timer instead
	Timer: Class.create({
		timerId:0,
		callback:null,
		params:null,
		jsTimerId:0,
		repeat:false,
		timeout:0,

		initialize:function(callback,time,params) {
			this.callback = callback;
			this.params = params;
			timerManager.setupTimer(this,time);
		},

		cancel:function() {
			clearTimeout(this.jsTimerId);
		}
	}),
	
	timeParse:{
		secondsToTime:function(seconds) {
			var hrs = ~~ (seconds / 3600);
			if (hrs<10) hrs = '0' + hrs;
			var mins = ~~ ((seconds % 3600) / 60);
			if (mins<10) mins = '0' + mins;
			var secs = Math.floor(seconds % 60);
			if (secs<10) secs = '0' + secs;
			return hrs + ':' + mins + ':' + secs;
		},
		secondsToText:function(secAgo) {
			// Seconds
			if (secAgo <= 1) {
				return paella.dictionary.translate("1 second ago")
			}
			if (secAgo < 60) {
				return paella.dictionary.translate("{0} seconds ago").replace(/\{0\}/g, secAgo);
			}
			// Minutes
			var minAgo = Math.round(secAgo/60);
			if (minAgo <= 1) {
				return paella.dictionary.translate("1 minute ago");
			}
			if (minAgo < 60) {
				return paella.dictionary.translate("{0} minutes ago").replace(/\{0\}/g, minAgo);
			}
			//Hours
			var hourAgo = Math.round(secAgo/(60*60));
			if (hourAgo <= 1) {
				return paella.dictionary.translate("1 hour ago");
			}
			if (hourAgo < 24) {
				return paella.dictionary.translate("{0} hours ago").replace(/\{0\}/g, hourAgo);
			}
			//Days
			var daysAgo = Math.round(secAgo/(60*60*24));
			if (daysAgo <= 1) {
				return paella.dictionary.translate("1 day ago");
			}
			if (daysAgo < 24) {
				return paella.dictionary.translate("{0} days ago").replace(/\{0\}/g, daysAgo);
			}
			//Months
			var monthsAgo = Math.round(secAgo/(60*60*24*30));
			if (monthsAgo <= 1) {
				return paella.dictionary.translate("1 month ago");
			}
			if (monthsAgo < 12) {
				return paella.dictionary.translate("{0} months ago").replace(/\{0\}/g, monthsAgo);
			}
			//Years
			var yearsAgo = Math.round(secAgo/(60*60*24*365));
			if (yearsAgo <= 1) {
				return paella.dictionary.translate("1 year ago");
			}
			return paella.dictionary.translate("{0} years ago").replace(/\{0\}/g, yearsAgo);			
		},
		matterhornTextDateToDate: function(mhdate) {
			var d = new Date();
			d.setFullYear(parseInt(mhdate.substring(0, 4), 10));
			d.setMonth(parseInt(mhdate.substring(5, 7), 10) - 1);
			d.setDate(parseInt(mhdate.substring(8, 10), 10));
			d.setHours(parseInt(mhdate.substring(11, 13), 10));
			d.setMinutes(parseInt(mhdate.substring(14, 16), 10));
			d.setSeconds(parseInt(mhdate.substring(17, 19), 10));
			
			return d;
		}	
	},
	
	language:function() {
		var lang = navigator.language || window.navigator.userLanguage;
		return lang.substr(0, 2).toLowerCase();
	},
	
	uuid:function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
	},
	
	userAgent:new UserAgent()
}

paella.utils.parameters.parse();

paella.MouseManager = Class.create({
	targetObject:null,

	initialize:function() {
		var thisClass = this;
		paella.events.bind('mouseup',function(event) { thisClass.up(event); });
		paella.events.bind('mousemove',function(event) { thisClass.move(event); });
		paella.events.bind('mouseover',function(event) { thisClass.over(event); });
	},

	down:function(targetObject,event) {
		this.targetObject = targetObject;
		if (this.targetObject && this.targetObject.down) {
			this.targetObject.down(event,event.pageX,event.pageY);
			event.cancelBubble = true;
		}
		return false;
	},

	up:function(event) {
		if (this.targetObject && this.targetObject.up) {
			this.targetObject.up(event,event.pageX,event.pageY);
			event.cancelBubble = true;
		}
		this.targetObject = null;
		return false;
	},
	
	out:function(event) {
		if (this.targetObject && this.targetObject.out) {
			this.targetObject.out(event,event.pageX,event.pageY);
			event.cancelBubble = true;
		}
		return false;
	},

	move:function(event) {
		if (this.targetObject && this.targetObject.move) {
			this.targetObject.move(event,event.pageX,event.pageY);
			event.cancelBubble = true;
		}
		return false;
	},
	
	over:function(event) {
		if (this.targetObject && this.targetObject.over) {
			this.targetObject.over(event,event.pageX,event.pageY);
			event.cancelBubble = true;
		}
		return false;
	}
});

paella.utils.mouseManager = new paella.MouseManager();


paella.ui = {}

paella.ui.Container = function(params) {
	var elem = document.createElement('div');
	if (params.id) elem.id = params.id;
	if (params.className) elem.className = params.className;
	if (params.style) $(elem).css(params.style);
	return elem;
};

paella.DataDelegate = Class.create({
	// onSuccess => function(response,readStatus)
	read:function(context,params,onSuccess) {
		// TODO: read key with context
		if (typeof(onSuccess)=='function') {
			onSuccess({},true);
		}
	},

	// onSuccess => function(response,writeStatus)
	write:function(context,params,value,onSuccess) {
		// TODO: write key with context
		if(typeof(onSuccess)=='function') {
			onSuccess({},true);
		}
	},
	
	remove:function(context,params,onSuccess) {
		// TODO: write key with context
		if(typeof(onSuccess)=='function') {
			onSuccess({},true);
		}
	}
});

paella.dataDelegates = {}

paella.dataDelegates.CookieDataDelegate = Class.create(paella.DataDelegate,{
	initialize:function() {
	},

	serializeKey:function(context,params) {
		if (typeof(params)=='object') params = JSON.stringify(params);
		return context + '|' + params;
	},

	read:function(context,params,onSuccess) {
		var key = this.serializeKey(context,params);
		var value = paella.utils.cookies.get(key);
		try {
			value = unescape(value);
			value = JSON.parse(value);
		}
		catch (e) {}
		if (typeof(onSuccess)=='function') {
			onSuccess(value,true);
		}
	},

	write:function(context,params,value,onSuccess) {
		var key = this.serializeKey(context,params);
		if (typeof(value)=='object') value = JSON.stringify(value);
		value = escape(value);
		paella.utils.cookies.set(key,value);
		if(typeof(onSuccess)=='function') {
			onSuccess({},true);
		}
	},
	
	remove:function(context,params,onSuccess) {
		var key = this.serializeKey(context,params);
		if (typeof(value)=='object') value = JSON.stringify(value);
		paella.utils.cookies.set(key,'');
		if(typeof(onSuccess)=='function') {
			onSuccess({},true);
		}
		
	}
});

paella.dataDelegates.MySQLDataDelegate = Class.create(paella.DataDelegate,{
	initialize:function() {
	},

	serializeKey:function(context,params) {
		if (typeof(params)=='object') params = JSON.stringify(params);
		return context + '|' + params;
	},

	read:function(context,params,onSuccess) {
		return null;
	},
	write:function(context,params,value,onSuccess) {
		/*var key = this.serializeKey(context,params);
		if (typeof(value)=='object') value = JSON.stringify(value);
		value = escape(value);
		paella.utils.cookies.set(key,value);
		if(typeof(onSuccess)=='function') {
			onSuccess({},true);
		}*/
		var server = "http://podcast.uc3m.es/paella/webservices/event.php";
		var url = "?action=insert&resource_id="+params.id+"&usuario="+value.user+"&event="+value.type+"&timestamp="+value.timestamp+"&params="+ encodeURIComponent(JSON.stringify(value))+"&app="+value.origin;
		//paella.debug.log("Voy a llamar a la URL "+server+url);
		//paella.debug.log(params);
		//paella.debug.log(value);
		if(url) {
			var params = null;
			var success = function(data) {
    			console.log("Load success");
    			if(typeof(onSuccess)=='function') {
					onSuccess({},true);
				}
			}
			var useJsonp = false;
			var method = 'get';
			new paella.Ajax(server+url,params,success,null,useJsonp,method);
		}
	},
	
	remove:function(context,params,onSuccess) {
		return null;
	}
});

paella.dataDelegates.DefaultDataDelegate = paella.dataDelegates.CookieDataDelegate;


paella.Data = Class.create({
	enabled:false,
	dataDelegates:{},

	initialize:function(config) {
		this.enabled = config.data.enabled;
		for (var key in config.data.dataDelegates) {
			this.dataDelegates[key] = new paella.dataDelegates[config.data.dataDelegates[key]]();
		}
		if (!this.dataDelegates["default"]) {
			this.dataDelegates["default"] = new paella.dataDelegates.DefaultDataDelegate();
		}
	},
	
	read:function(context,key,onSuccess) {
		var del = this.getDelegate(context);
		del.read(context,key,onSuccess);
	},
	
	write:function(context,key,params,onSuccess) {
		var del = this.getDelegate(context);
		del.write(context,key,params,onSuccess);
	},
	
	remove:function(context,key,onSuccess) {
		var del = this.getDelegate(context);
		del.remove(context,key,onSuccess);
	},
	
	getDelegate:function(context) {
		if (this.dataDelegates[context]) return this.dataDelegates[context];
		else return this.dataDelegates["default"];
	}
});

// Will be initialized inmediately after loading config.json, in PaellaPlayer.onLoadConfig()
paella.data = null;

paella.MessageBox = Class.create({
	modalContainerClassName:'modalMessageContainer',
	frameClassName:'frameContainer',
	messageClassName:'messageContainer',
	errorClassName:'errorContainer',
	currentMessageBox:null,
	messageContainer:null,
	onClose:null,
	
	initialize:function() {
		var thisClass = this;
		$(window).resize(function(event) { thisClass.adjustTop(); });
	},

	showFrame:function(src,params) {
		var closeButton = true;
		var width = "80%";
		var height = "80%";
		var onClose = null;
		if (params) {
			closeButton = params.closeButton;
			width = params.width;
			height = params.height;
			onClose = params.onClose;	
		}

		this.doShowFrame(src,closeButton,width,height,onClose);
	},

	doShowFrame:function(src,closeButton,width,height,onClose) {
		this.onClose = onClose;

		if (this.currentMessageBox) {
			this.close();
		}

		if (!width) { width = '80%'; }
		
		if (!height) { height = '80%'; }
		
		var modalContainer = document.createElement('div');
		modalContainer.className = this.modalContainerClassName;
		modalContainer.style.position = 'fixed';
		modalContainer.style.top = '0px';
		modalContainer.style.left = '0px';
		modalContainer.style.right = '0px';
		modalContainer.style.bottom = '0px';
		modalContainer.style.zIndex = 999999;
		
		var messageContainer = document.createElement('div');
		messageContainer.className = this.frameClassName;
		messageContainer.style.width = width;
		messageContainer.style.height = height;
		messageContainer.style.position = 'relative';
		modalContainer.appendChild(messageContainer);
		
		var iframeContainer = document.createElement('iframe');
		iframeContainer.src = src;
		iframeContainer.setAttribute("frameborder", "0");
		iframeContainer.style.width = "100%";
		iframeContainer.style.height = "100%";
		messageContainer.appendChild(iframeContainer);
		
		$('body')[0].appendChild(modalContainer);
		
		this.currentMessageBox = modalContainer;
		this.messageContainer = messageContainer;
		var thisClass = this;
		this.adjustTop();
		
		if (closeButton) {
			this.createCloseButton();
		}
	},
	
	showElement:function(domElement,params) {
		var closeButton = true;
		var width = "60%";
		var height = "40%";
		var onClose = null;
		var className = this.messageClassName;
		if (params) {
			className = params.className;
			closeButton = params.closeButton;
			width = params.width;
			height = params.height;
			onClose = params.onClose;	
		}
		
		this.doShowElement(domElement,closeButton,width,height,className,onClose);
	},

	showMessage:function(message,params) {
		var closeButton = true;
		var width = "60%";
		var height = "40%";
		var onClose = null;
		var className = this.messageClassName;
		if (params) {
			className = params.className;
			closeButton = params.closeButton;
			width = params.width;
			height = params.height;
			onClose = params.onClose;	
		}
		
		this.doShowMessage(message,closeButton,width,height,className,onClose);
	},
	
	doShowElement:function(domElement,closeButton,width,height,className,onClose) {
		this.onClose = onClose;

		if (this.currentMessageBox) {
			this.close();
		}
		if (!className) className = this.messageClassName;
		
		if (!width) { width = '80%'; }
		
		if (!height) { height = '30%'; }
		
		var modalContainer = document.createElement('div');
		modalContainer.className = this.modalContainerClassName;
		modalContainer.style.position = 'fixed';
		modalContainer.style.top = '0px';
		modalContainer.style.left = '0px';
		modalContainer.style.right = '0px';
		modalContainer.style.bottom = '0px';
		modalContainer.style.zIndex = 999999;
		
		var messageContainer = document.createElement('div');
		messageContainer.className = className;
		messageContainer.style.width = width;
		messageContainer.style.height = height;
		messageContainer.style.position = 'relative';
		messageContainer.appendChild(domElement);
		modalContainer.appendChild(messageContainer);
		
		$('body')[0].appendChild(modalContainer);
		
		this.currentMessageBox = modalContainer;
		this.messageContainer = messageContainer;
		var thisClass = this;
		this.adjustTop();
		
		if (closeButton) {
			this.createCloseButton();
		}
	},

	doShowMessage:function(message,closeButton,width,height,className,onClose) {
		this.onClose = onClose;

		if (this.currentMessageBox) {
			this.close();
		}
		if (!className) className = this.messageClassName;
		
		if (!width) { width = '80%'; }
		
		if (!height) { height = '30%'; }
		
		var modalContainer = document.createElement('div');
		modalContainer.className = this.modalContainerClassName;
		modalContainer.style.position = 'fixed';
		modalContainer.style.top = '0px';
		modalContainer.style.left = '0px';
		modalContainer.style.right = '0px';
		modalContainer.style.bottom = '0px';
		modalContainer.style.zIndex = 999999;
		
		var messageContainer = document.createElement('div');
		messageContainer.className = className;
		messageContainer.style.width = width;
		messageContainer.style.height = height;
		messageContainer.style.position = 'relative';
		messageContainer.innerHTML = message;
		modalContainer.appendChild(messageContainer);
		
		$('body')[0].appendChild(modalContainer);
		
		this.currentMessageBox = modalContainer;
		this.messageContainer = messageContainer;
		var thisClass = this;
		this.adjustTop();
		
		if (closeButton) {
			this.createCloseButton();
		}
	},
	
	showError:function(message,params) {
		var closeButton = false;
		var width = "60%";
		var height = "20%";
		var onClose = null;
		if (params) {
			closeButton = params.closeButton;
			width = params.width;
			height = params.height;
			onClose = params.onClose;	
		}
		
		this.doShowError(message,closeButton,width,height,onClose);
	},

	doShowError:function(message,closeButton,width,height,onClose) {
		this.doShowMessage(message,closeButton,width,height,this.errorClassName,onClose);
	},
	
	createCloseButton:function() {
		if (this.messageContainer) {
			var thisClass = this;
			var closeButton = document.createElement('div');
			this.messageContainer.appendChild(closeButton);
			closeButton.className = 'paella_messageContainer_closeButton';
			$(closeButton).click(function(event) { thisClass.onCloseButtonClick(); });
		}
	},
	
	adjustTop:function() {
		if (this.currentMessageBox) {
		
			var msgHeight = $(this.messageContainer).outerHeight();
			var containerHeight = $(this.currentMessageBox).height();

			var top = containerHeight/2 - msgHeight/2;
			this.messageContainer.style.marginTop = top + 'px';
		}
	},
	
	close:function() {
		if (this.currentMessageBox && this.currentMessageBox.parentNode) {
			var msgBox = this.currentMessageBox;
			var parent = msgBox.parentNode;
			$(msgBox).animate({opacity:0.0},300,function() {
				parent.removeChild(msgBox);
			});
			if (this.onClose) {
				this.onClose();
			}
		}
	},
	
	onCloseButtonClick:function() {
		this.close();
	}
});

paella.messageBox = new paella.MessageBox();

paella.AntiXSS = {
	htmlEscape: function (str) {
		return String(str)
    		.replace(/&/g, '&amp;')
    		.replace(/"/g, '&quot;')
    		.replace(/'/g, '&#39;')
    		.replace(/</g, '&lt;')
    		.replace(/>/g, '&gt;');
    	},

    htmlUnescape: function (value){
		return String(value)
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&');
	}
};
