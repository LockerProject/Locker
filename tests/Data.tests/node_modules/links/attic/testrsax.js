var sax =  require("sax"),
	readability = require("readabilitySAX");

function rsax(data, skipLevel, type){
	skipLevel = skipLevel || 0;
	readabilitySettings = {};
	
	var contentLength = 0,
		parser, readable, ret;
	
	while(contentLength < 250 && skipLevel < 4){
	    parser = sax.parser(false, {
		    lowercasetags : true
		});
	    
	    readabilitySettings.skipLevel = skipLevel;
	    
	    readable = new readability.process(parser, readabilitySettings);
	    
	    parser.write(data).close();
	    
	    ret = readable.getArticle(type);
	    contentLength = ret.textLength;
	    skipLevel += 1;
	}
	return ret;
};
var processContent = function(data){
	
	var ret = rsax(data, 0, "text");
	
/*	ret.duration = Date.now() - conTime;
	ret.txt = ret.html.replace(/<.*?>/g, ' ');
	ret.txt = ret.txt.replace(/\s+/g, ' ');
	ret.txt = ret.txt.replace(/\&\S+\;/g, ' ');
	delete ret.html;*/
	ret.text = ret.text.replace(/\s+/g, ' ');
	console.log(ret);
}


var request = require("request");
if(process.argv.length > 2){
	console.log("connecting to:", process.argv[2]);
	request.get({uri:process.argv[2]},function(err,resp,body){
	   if(err) return console.log(err);
	    console.log("body: "+body.length);
	    processContent(body);
	});
}else{
	console.log("need url");    
}
