var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port) {
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}
process.chdir(cwd);

var express = require('express'),
    connect = require('connect'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    sys = require('sys'),
    lfs = require('../../Common/node/lfs.js');

var me = lfs.loadMeData();

var twitterClient;// = require('twitter-js')();

var app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"})
    );
    
var me = lfs.loadMeData();
//var me = JSON.parse(fs.readFileSync("context.json"));


app.get('/', function(req, res) {
//    console.log('serving /');

    sys.debug('req.cookies to twitter client.js:' + sys.inspect(req.cookies));
//    sys.debug('req.headers to twitter client.js:' + sys.inspect(req.headers));
    sys.debug('req.session.simon = ' + req.session.simon);
    req.session.simon = 'Helooo!';
    if(!(me.consumerKey && me.consumerSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
//        console.log('no keys!!!');
        res.end("Enter your personal Twitter app info that will be used to sync your data" + 
                " (create a new one <a href='http://dev.twitter.com/apps/new'>" + 
                "here</a> using the callback url of " +
                "http://"+url.parse(me.uri).host+"/) " +
                "<form method='get' action='save'>" +
                    "Consumer Key: <input name='consumerKey'><br>" +
                    "Consumer Secret: <input name='consumerSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form>");
        return;
    } else if(!me.token) {
       // sys.debug('!me.token')
        if(!twitterClient) {
            sys.debug('!twitterClient');
            twitterClient = require('twitter-js')(me.consumerKey, me.consumerSecret, me.uri);   
        }
     //   sys.debug('req.param(\'oauth_token\') = ' + req.param('oauth_token'));
      //  sys.debug('req.param(\'oauth_verifier\') = ' + req.param('oauth_verifier'));

        sys.debug('twitter req.session: ' + sys.inspect(req.session));
        twitterClient.getAccessToken(req, res,
            function(error, newToken) {
                if (error)
                    console.log(JSON.stringify(error));
                if (newToken != null) {  
                    sys.debug('writing 200!');
                    res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                    sys.debug(JSON.stringify(newToken));
                    me.token = newToken;
                    lfs.syncMeData(me);
                    res.end();
                }
            });    
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end();
    }
});


app.get('/save',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!req.param('consumerKey') || !req.param('consumerSecret')) {
        res.end("missing field(s)?");
        return;
    }
    me.consumerKey = req.param('consumerKey');
    me.consumerSecret = req.param('consumerSecret');

    lfs.syncMeData(me);
    res.end("thanks, now we need to <a href='./'>auth that app to your account</a>.");
});

app.get('/get_home_timeline', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    lfs.readObjectsFromFile('feed.json', function(data) {
        data.reverse();
        res.write(JSON.stringify(data));
        res.end();
    });
});

app.get('/home_timeline', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    pullTimeline(function() {
        res.end();
    });
    /*twitterClient.apiCall('GET','/statuses/home_timeline.json', 
        { token: { oauth_token: token.oauth_token, oauth_token_secret: token.oauth_token_secret} }, 
        function(error, result) {
            console.log('\n\n\n\nERROR:\n\n' + JSON.stringify(error));
            console.log('\n\n\n\nRESULT:\n\n' + JSON.stringify(result));
            res.end();
        });*/
});


function pullTimeline(callback) {
    if(!meta.home_timeline)
        meta.home_timeline = {};
    var items = [];
    pullTimelinePage(null, meta.home_timeline.latest, null, items, function() {
        items.reverse();
        lfs.appendObjectsToFile('feed.json', items);
        callback();
    });
}

function pullTimelinePage(max_id, since_id, page, items, callback) {
//    console.log(page);
    if(!page)
        page = 1;
    var params = {token: me.token, count: 200, page: page};
    if(max_id)
        params.max_id = max_id;
    if(since_id)
        params.since_id = since_id;
//    console.log('calling api with params: ' + JSON.stringify(params));
    twitterClient.apiCall('GET', '/statuses/home_timeline.json', params, 
        function(error, result) {
            if(error) {
                console.log(JSON.stringify(error));
                return;
            }
            if(result.length > 0) {
                var id = result[0].id;
                if(!meta.home_timeline.latest || id > meta.home_timeline.latest)
                    meta.home_timeline.latest = id;
                console.log(JSON.stringify(meta));
                for(var i = 0; i < result.length; i++)
                    items.push(result[i]);

                if(!max_id)
                    max_id = result[0].id;
                page++;
                pullTimelinePage(max_id, since_id, page, items, callback);
            } else if(callback) {
                lfs.writeMetadata(meta);
                callback();
            }
        });
}

    
/*
app.post('/message',
function(req, res) {
    twitterClient.apiCall('POST', '/statuses/update.json',
    {
        token: {
            oauth_token_secret: req.param('oauth_token_secret'),
            oauth_token: req.param('oauth_token'),
            status: req.param('message')
        }
    },
    function(error, result) {
        console.log(JSON.stringify(error));
        console.log(JSON.stringify(result));
    }
    );
});*/

console.log('http://localhost:' + port + '/');
app.listen(port);