/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * web server/service to wrap interactions w/ GitHub API
 */

var fs = require('fs'),
    url = require('url'),
    express = require('express'),
    connect = require('connect'),
    request = require('request'),
    sys = require('sys'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser()),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var me;

app.set('views', __dirname);
app.get('/', handleIndex);

function handleIndex(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    lfs.readObjectFromFile('auth.json', function(newAuth) {
        if(newAuth.handle)
        {
            res.end(fs.readFileSync(__dirname + '/ui/index.html'));
        }else{
            res.end(fs.readFileSync(__dirname + '/ui/init.html'));
        }
    });
}

app.get('/init', function(req, res) {
    var handle = req.param('handle');
    if(!handle || handle.length == 0) {
        res.writeHead(400);
        res.end('whats the handle yo?');
        return;
    }
    console.log("initializing to "+handle);
    fs.writeFileSync('auth.json', JSON.stringify({handle:handle}));
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end("saved "+handle+", <a href='./'>continue</a>");
});

app.get('/sync', function(req, res) {
    lfs.readObjectFromFile('auth.json', function(auth) {
        tpage(auth.handle,1);
    });
    res.writeHead(200);
    res.end("kthxbye");
});

/*
    <ul id="user-photos"> 
    				    	    	<li> 
    		<div class="user-photo"> 
    			<a href="/3slai"><img alt="Here I am planting the millionth tree. What action are you creating today?
" src="http://s3.amazonaws.com/twitpic/photos/thumb/6372810.jpg?AWSAccessKeyId=AKIAJF3XCCKACR3QDMOA&Expires=1306906024&Signature=zoWvIfL1IsD8Ppbj6xSszWcrXwo%3D" style="width: 150px; height: 150px;" /></a> 
    			
    			    		</div> 
    		<div class="user-tweet"> 
    			<p>Here I am planting the millionth tree. What action are you creating today?<br />
</p> 
    			<p class="tweet-meta"> 
    				769 days ago from site &bull; viewed 7125 times
    			</p> 
    			
    			    		</div> 
    	</li> 
    				    	    	<li> 
    		<div class="user-photo">
*/

var fullQ = [];
var idCache = {};
function tpage(handle,num)
{
    var url = "http://twitpic.com/photos/"+handle+"?page="+num;
    console.log("fetching page "+url);
    request.get({uri:url}, function(err, resp, body) {
        if(err)
        {
            console.log("booooo "+err);
            return;
        }
        var outer = body.split('<ul id="user-photos">');
        if(outer.length <= 1)
        {
            console.log("couldn't find user-photos");
            return;
        }
        var inner = outer[1].split('<div class="user-photo">');
        if(inner.length <= 1)
        {
            console.log("couldn't find user-photo");
            return;
        }
        for(var i = 1; i < inner.length; i++)
        {
//            ["",">\n    \t\t\t<a href=","/3e58mc","><img alt=","This is what programming books do me, especially ones that mention tdd. Yeh I need a shave."," src=","http://s3.amazonaws.com/twitpic/photos/thumb/205157604.jpg?AWSAccessKeyId=AKIAJF3XCCKACR3QDMOA&Expires=1306907764&Signature=4aYz74qZFfrKZvsf5rpxiKUIBJs%3D"," style=","width: 150px; height: 150px;"," /></a>\n    \t\t\t\n    \t\t\t    \t\t</div>\n    \t\t<div class=","user-tweet",">\n    \t\t\t<p>This is what programming books do me, especially ones that mention tdd. Yeh I need a shave.</p>\n    \t\t\t<p class=","tweet-meta",">\n    \t\t\t\t174 days ago from <a class=","nav-link"," target=","_blank"," href=","http://www.blackberry.com",">BlackBerry®</a> &bull; viewed 45 times\n    \t\t\t</p>\n    \t\t\t\n    \t\t\t    \t\t</div>\n    \t</li>\n    \t\t\t\t    \t    \t<li>\n    \t\t<div class=",""]

            var parts = inner[i].split('"');
            console.log("PARTS\t\t"+JSON.stringify(parts));
            if(parts.length < 6) continue;
            var metas = inner[i].split('<p class="tweet-meta">');
            if(metas.length <= 1) continue;
            var metas2 = metas[1].split('</p>');
            var meta = metas2[0].replace(/^\s+|\s+$/g,"");
            var id = parts[1].replace(/^\//g,"");
            if(idCache[id])
            {
                console.log("dup detected, probably at last page, bail");
                return;
            }
            var pic = {id:id, txt:parts[3], thumb:parts[5], meta:meta};
            fullQ.push(id);
            idCache[id]=pic;
            console.log(JSON.stringify(pic));
            lfs.appendObjectsToFile("pics-"+handle+".json",[pic]);
        }
        num++;
        setTimeout(function(){tpage(handle,num);},2000); // next page in 2sec
    });
}

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    app.listen(processInfo.port,function() {
        var returnedInfo = {port: processInfo.port};
        console.log(JSON.stringify(returnedInfo));
    });
});
