//Plugin de la Universidad Carlos III de Madrid.
// Versión 1.1
paella.plugins.QuestionsPlayerPlugin = Class.create(paella.EventDrivenPlugin,{
	tests:null,
	lastEvent:null,
	visibleTest:null,
	numberquestion:null,
	lastTime:null,
	isStarted:null,

	getName:function() { return "es.uc3m.paella.QuestionsPlayerPlugin"; },
	checkEnabled:function(onSuccess) {
		var This = this;
		this.visibleTest = [];
		this.numberquestion = 0;
		this.lastEvent = 0;
		this.isStarted = false;
		//Inicialización
		var url = paella.utils.parameters.get('id');
		if(url) {
			urlxml = ""+url;
			urlservidor = "";
			jQuery.ajax({
				context: This,
				type:"GET",
				url: urlxml,
				async: false,
				dataType: "xml",
				success: function(data){
					this.parsedata(data);
				},
				error: function(request,status,error){
					alert("File not found");
				}
			});
		}

		onSuccess(true);
	},
		
	getEvents:function() { return [paella.events.timeUpdate,paella.events.play,paella.events.seekTo,paella.events.pause,paella.events.endVideo]; },

	onEvent:function(eventType,params) {
		if(eventType=="paella:timeupdate")
		{
			this.isStarted = true;
			lastTime = params.currentTime;
			this.checkTests(params);
		}
		else if(eventType=="paella:play")
		{
			if(this.isStarted)
			{
        		var evento = {
        			timestamp: lastTime,
        			user: this.config.user,
	     			origin: this.config.origin,
	     			time: new Date(),
	     			type: "playvideo",
	     			params: {
	     				user: this.config.user,
	     				origin: this.config.origin,
	     				timestamp: lastTime
	     			}
	     		};
	     		paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     		
				});
	     	}
		}
		else if(eventType=="paella:setseek")
		{
			this.clearAllTests(params);
		}
		else if(eventType=="paella:pause")
		{
			if(this.isStarted)
			{
				var evento = {
					timestamp: lastTime,
					user: this.config.user,
	     			origin: this.config.origin,
	     			time: new Date(),
	     			type: "pausevideo",
	     			params: {
	     				user: this.config.user,
	     				origin: this.config.origin,
	     				timestamp: lastTime
	     			}
	     		};
	     	}
	     	paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     	
			});
		}
		else if(eventType=="paella:endvideo")
		{
			var evento = {
				timestamp: lastTime,
				user: this.config.user,
	     		origin: this.config.origin,
	     		time: new Date(),
	     		type: "endvideo",
	     		params: {
	     			timestamp: lastTime
	     		}
	     	};
	     	paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     	
			});
		}
	},

	checkTests:function(params) {
		for (var i=0; i<this.tests.items.length; ++i) {
			var a = this.tests.items[i];
			var b = false;
			if ((a.starttime/1000)<params.currentTime && ((a.starttime/1000)+0.5)>params.currentTime) {
				if(!a.showed)
				{
					paella.events.trigger(paella.events.pause);
					if(i!=0)
					{
						b = this.tests.items[i-1];
						b.showed = false;
					}
					this.showTest(a,b);
				}
			}
		}
		
		for (var key in this.visibleTest) {
			if (typeof(a)=='object') {
				var a = this.visibleTest[key];
				if (a && ((a.starttime/1000)>=params.currentTime || ((a.starttime/1000)+0.5)<=params.currentTime)) {
					this.removeTest(a);
				}
			}
		}
	},

	showTest:function(test,previous) {
		var This = this;
		var Test = test;
		var question = test.questionsarray[this.numberquestion];
		var responsevalue = -1;
		var domElement = jQuery('<div class="questions"></div>');
		$("#questionsContainer").append(domElement);
		strhtml = '<h1 style="font-size:140%;">'+test.title+'</h1><p style="color:#000000;font-size:100%;">'+question.text+'<p><table border=0 style="width:80%;margin-left: auto; margin-right: auto;">';
		for(var i = 0;i < question.responsesarray.length;i++)
		{
			strhtml += '<tr style="vertical-align:middle;">'
			strhtml += '<td style="text-align:center;vertical-align:middle;"><input class = "response" type = "radio" name = "r"'+i+' id = "'+question.responsesarray[i].order+'" value = "'+question.responsesarray[i].order+'" style="margin:0px 0px 8px 0px;" /></td><td style="text-align:left;vertical-align:middle;"><label for = "r'+i+'" style="color:#000000;text-shadow:0px 0px 0;rgba(0,0,0,0);">'+question.responsesarray[i].text+'</label></td>';
			strhtml += '</tr>'
		}
		strhtml += '<tr><td></td><td></td></tr><tr><td></td><td><button class="button" id="validate">Contestar</button></td></tr>';
		strhtml += '</table>';
		domElement.html(strhtml);
		var params = {};
		params.closeButton=false;
		params.width = '75%';
		params.height = '50%';
		var element = paella.messageBox.showElement(domElement.get(0),params);
		$(document).on("click", ".button", function(e) {
        	if($(this).prop('id')=='validate')
        	{
        		if(responsevalue<0)
        		{
        			alert("Debe seleccionar una respuesta");
        		}
        		else
        		{
        			$(document).off("click", ".button");
        			This.checkAnswer(question,responsevalue,test,previous);
        		}
        	}
        	if($(this).prop('id')=='back')
        	{
        		This.numberquestion = 0;
        		var evento = {
        			timestamp: paella.player.videoContainer.currentTime(),
        			user: This.config.user,
	     			origin: This.config.origin,
	     			time: new Date(),
	     			type: "repeatsection",
	     			params: {
	     				test:This.Test
	     			}
	     		};
	     		paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	    
				});
        		if(previous)
        		{
        			test.showed = false;
        			previous.showed = true;
        			var params = {};
        			
					params.time = previous.starttime/1000;
					paella.events.trigger(paella.events.seekToTime,params);
					$(document).off("click", ".button");
					paella.messageBox.close();
					paella.events.trigger(paella.events.play);
				}
				else
				{
					test.showed = false;
        			var params = {};
        			
					params.time = 0;
					paella.events.trigger(paella.events.seekToTime,params);
					$(document).off("click", ".button");
					paella.messageBox.close();
					paella.events.trigger(paella.events.play);
				}
        	}
   		});
   		$(document).on("click", ".response", function(e) {
        	responsevalue = $(this).prop('value');
        	
        	var evento = {
        		timestamp: paella.player.videoContainer.currentTime(),
        		user: This.config.user,
	     		origin: This.config.origin,
	     		time: new Date(),
	     		type: "answerchosen",
	     		params: {
	     			test: This.Test,
	     			question: This.numberquestion,
	     			answerChosen: This.responsevalue
	     		}
	     	};
	     	paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     	
			});
   		});
	},
	checkAnswer:function(question,responsevalue,test,previous)
	{
		var This = this;
		var Test = test;
		var strhtml = "";
		
		strhtml += '<h1>'+test.title+'</h1><p style="color:#000000;">'+question.text+'<p>';
		//Comprobamos si la respuesta es correcta
		if(question.canswer==Math.pow(2,responsevalue))
		{
			strhtml += '<center><font color="#00FF00">Respuesta correcta</font></center><p>';
			var evento = {
				timestamp: lastTime,
				user: this.config.user,
	     		origin: this.config.origin,
	       		idTest: test.id,
	     		time: new Date(),
	     		type: "validateanswer",
	     		params: {
	     			test: test,
	     			question: this.numberquestion,
	     			correct: true
	     		}
	     	};
	     	paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     	
			});
		}
		else
		{
			strhtml += '<center><font color="#FF0000">Respuesta incorrecta</font></center><p>';
			var evento = {
				timestamp: lastTime,
				user: this.config.user,
	     		origin: this.config.origin,
	       		idTest: test.id,
	     		time: new Date(),
	     		type: "validateanswer",
	     		params: {
	     			test: test,
	     			question: this.numberquestion,
	     			correct: false
	     		}
	     	};
	     	paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     	
			});
		}
		strhtml += '<p><button class="button" id="back">Volver a visualizar</button><button class="button" id="Continue">Continuar</button>';

		$("div.questions").html(strhtml);

		$(document).on("click", ".button", function(e) {
        	if($(this).prop('id')=='Continue')
        	{
        		
        		if(test.questionsarray.length-1==This.numberquestion)
        		{
        			//Ya no hay más preguntas
        			
        			$(document).off("click", ".button");
        			This.removeTest(test);
        		}
        		else
        		{
        			
        			$(document).off("click", ".button");
        			This.nextQuestion(test,previous);
        		}
        	}
        	if($(this).prop('id')=='back')
        	{
        		
        		This.numberquestion = 0;
        		var evento = {
        			timestamp: paella.player.videoContainer.currentTime(),
        			user: This.config.user,
	     			origin: This.config.origin,
	     			time: new Date(),
	     			type: "repeatsection",
	     			params: {
	     				test:This.Test
	     			}
	     		};
	     		paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     		
				});
        		if(previous)
        		{
        			test.showed = false;
        			previous.showed = true;
        			var params = {};
        			
					params.time = previous.starttime/1000;
					paella.events.trigger(paella.events.seekToTime,params);
					$(document).off("click", ".button");
					paella.messageBox.close();
					paella.events.trigger(paella.events.play);
				}
				else
				{
					test.showed = false;
        			var params = {};
        			
					params.time = 0;
					paella.events.trigger(paella.events.seekToTime,params);
					$(document).off("click", ".button");
					paella.messageBox.close();
					paella.events.trigger(paella.events.play);
				}
        	}
   		});
	},

	nextQuestion:function(test,previous){
		
		this.numberquestion++;
		
		$(document).off("click", ".response");
		paella.messageBox.close();
		this.showTest(test,previous);
	},

	removeTest:function(test) {
		this.numberquestion=0;
		test.showed = true;
		$(document).off("click", ".response");
		paella.messageBox.close();
		paella.events.trigger(paella.events.play);
	},

	clearAllTests:function(params) {
		$(document).off("click", ".response");
		
		var atime = this.lastTime;
		var btime = (params.newPositionPercent*paella.player.videoContainer.duration()/100);
		var evento = {
				timestamp: lastTime,
				user: this.config.user,
	     		origin: this.config.origin,
	     		time: new Date(),
	     		type: "seekbar",
	     		params: {
	     			start: atime,
	     			finish: btime
	     		}
	     	};
	     	paella.data.write('events',{id:paella.initDelegate.getId()},evento,function(response,status) {
	     	
			});
		for (var i=0; i<this.tests.items.length; ++i) {
			var a = this.tests.items[i];
			a.showed=false;
		}
		//Hay que guardar el dato en la cookie
	},

	parsedata:function(jsondata) {
		var This = this;
		this.tests = {items:[]};
		var json = jQuery.xml2json(jsondata);
    	var testarray = json.RDF.Description.Tracks.Bag.li.Description.markers.Seq.li;
    	if (testarray instanceof Array) { //Si hay varios conjuntos de preguntas (test)
			$.each(testarray, function (index1, value1){
				This.tests.items.push({
					id: This.getTrackUniqueId(),
					starttime: getProperty(value1.Description,'xmpDM:startTime'),
					title: getProperty(value1.Description,'tscIQ:questionSetName'),
					questionsarray:[]
				});
				var testquestions = value1.Description.questions.Seq.li;
				if (testquestions instanceof Array) { // Si hay varias preguntas
					$.each(testquestions, function (index2, value2){
						This.tests.items[index1].questionsarray.push({
							text: value2.Description.question,
							canswer: value2.Description.correctAnswer,
							responsesarray:[]
						});
						var questionresponses = value2.Description.answerArray.Seq.li;
						$.each(questionresponses, function (index3, value3){
							This.tests.items[index1].questionsarray[index2].responsesarray.push({
								text: value3.Description.answer,
								order: getProperty(value3.Description,'tscIQ:orderId')
							});
						});
					});
				} else // Si hay solo una pregunta en el test
				{
					
					This.tests.items[index1].questionsarray.push({
							text: testquestions.Description.question,
							canswer: testquestions.Description.correctAnswer,
							responsesarray:[]
					});
					var questionresponses = testquestions.Description.answerArray.Seq.li;
					$.each(questionresponses, function (index3, value3){
						This.tests.items[index1].questionsarray[0].responsesarray.push({
							text: value3.Description.answer,
							order: getProperty(value3.Description,'tscIQ:orderId')
						});
					});
				}
			});
		} else // Si hay solo un test
		{
			
			this.tests.items.push({
				id: This.getTrackUniqueId(),
				starttime: getProperty(testarray.Description,'xmpDM:startTime'),
				title: getProperty(testarray.Description,'tscIQ:questionSetName'),
				questionsarray:[]
			});
			var testquestions = testarray.Description.questions.Seq.li;
			if (testquestions instanceof Array) { // Si hay varias preguntas
				$.each(testquestions, function (index2, value2){
					This.tests.items[0].questionsarray.push({
						text: value2.Description.question,
						canswer: value2.Description.correctAnswer,
						responsesarray:[]
					});
					var questionresponses = value2.Description.answerArray.Seq.li;
					$.each(questionresponses, function (index3, value3){
						This.tests.items[0].questionsarray[index2].responsesarray.push({
							text: value3.Description.answer,
							order: getProperty(value3.Description,'tscIQ:orderId')
						});
					});
				});
			} else // Si hay solo una pregunta en el test
			{
				
				This.tests.items[0].questionsarray.push({
						text: testquestions.Description.question,
						canswer: testquestions.Description.correctAnswer,
						responsesarray:[]
				});
				var questionresponses = testquestions.Description.answerArray.Seq.li;
				$.each(questionresponses, function (index3, value3){
					This.tests.items[0].questionsarray[0].responsesarray.push({
						text: value3.Description.answer,
						order: getProperty(value3.Description,'tscIQ:orderId')
					});
				});
			}
		}
		paella.data.write('questions','tests',This.tests,function(response,status) {
			
		});
	},

	getTrackUniqueId:function() {
		var newId = -1;
		if (this.tests.items.length==0) return 1;
		for (var i=0;i<this.tests.items.length;i++) {
			if (newId<=this.tests.items[i].id) {
				newId = this.tests.items[i].id + 1;
			}
		}
		return newId;
	}
});

paella.plugins.QuestionsPlayerPlugin = new paella.plugins.QuestionsPlayerPlugin();
