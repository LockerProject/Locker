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
 
// http://twitpic.com/show/full/:id

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

var handle=false;
function handleIndex(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    lfs.readObjectFromFile('auth.json', function(newAuth) {
        if(newAuth.handle)
        {
            res.end(fs.readFileSync(__dirname + '/ui/index.html'));
            handle=newAuth.handle;
        }else{
            res.end(fs.readFileSync(__dirname + '/ui/init.html'));
        }
    });
}

app.get('/init', function(req, res) {
    handle = req.param('handle');
    if(!handle || handle.length == 0) {
        res.writeHead(400);
        res.end('whats the handle yo?');
        return;
    }
    console.log("initializing to "+handle);
    fs.writeFileSync('auth.json', JSON.stringify({handle:handle}));
    fs.mkdir("thumbs-"+handle,0755,function(err){
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("saved "+handle+", <a href='./'>continue</a>");        
    });
});

app.get('/sync', function(req, res) {
    if(!handle)
    {
        res.writeHead(404);
        res.end("missing handle");
    }
    tpage(1);
    res.writeHead(200);
    res.end("kthxbye");
});

app.get("/allPhotos", function(req, res) {
    if (!handle) {
        try {
            handle = JSON.parse(fs.readFileSync("auth.json"))["handle"];
        } catch (E) {
            // pass, we'll handle it down below
        }
    }
    if (!handle) {
        res.writeHead(500);
        res.end("No handle has been set yet.");
        return;
    }
    lfs.readObjectsFromFile("pics-" + handle + ".json", function(objects) {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify(objects));
    });
});

app.get('/full/:pic', function(req, res) {
    if(!req.params.pic)
    {
        res.writeHead(404);
        res.end("missing id");
    }
    var url = "http://twitpic.com/"+req.params.pic+"/full";
    request.get({uri:url}, function(err, resp, body) {
        if(err)
        {
            res.writeHead(404);
            res.end("twitpic failed: "+err);
            return;
        }
        var parts = body.split('http://s3.amazonaws.com/twitpic/photos/full/');
        if(parts.length != 2)
        {
            res.writeHead(404);
            res.end("couldn't find image file");
            return;
        }
        var tails = parts[1].split('"');
        res.redirect('http://s3.amazonaws.com/twitpic/photos/full/'+tails[0]);
    });    
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
function tpage(num)
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
            var thumb = 'thumbs-'+handle+'/' + id + '.jpg';
            var pic = {id:id, txt:parts[3], thumb:thumb, meta:meta};
            fullQ.push({id:id, url:parts[5], file:thumb});
            idCache[id]=pic;
            console.log(JSON.stringify(pic));
            lfs.appendObjectsToFile("pics-"+handle+".json",[pic]);
            locker.event("photo/twitpic", pic, "new");
        }
        thumbQ(); // kick off in case not running
        num++;
        setTimeout(function(){tpage(num);},2000); // next page in 2sec
    });
}

var tqBG=false; // is tq fetcher running
function thumbQ(go)
{
    if(!go && tqBG) return;
    tqBG=true;
    var thumb = fullQ.pop();
    if(!thumb)
    {
        tqBG=false;
        return;
    }
    request.get({uri:thumb.url, encoding: 'binary'}, function(err, resp, body) {
        if(err)
            console.error(err + " for " + JSON.stringify(thumb));
        else
        {
            fs.writeFileSync(thumb.file, body, 'binary');
            setTimeout(function(){thumbQ(true);},2000);
        }
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
