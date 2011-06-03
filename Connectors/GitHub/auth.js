var fs = require('fs'),
    request = require('request');

var auth, uri, callback;

exports.init = function(myUri, passedAuth, app, onCompleteCallback) {
    uri = myUri;
    auth = passedAuth;
    callback = onCompleteCallback;
    app.get('/auth', initAuth);
    app.get('/authComplete', backFromGithub);
    app.post('/saveAuth', saveAuth);
}

function initAuth(req, res) {
    if(!(auth.clientID && auth.secret && auth.username)) {
        noApp(req, res);
    } else if(!auth.token) {
        noToken(req, res);
    } else {
        callback(auth, req, res);
    }
}

exports.handleIncompleteAuth = initAuth;

function saveAuth(req, res) {
    if(!req.body.clientID || !req.body.secret || !req.body.username) {
        noApp(req, res);
    } else {
        auth.clientID = req.body.clientID;
        auth.secret = req.body.secret;
        auth.username = req.body.username;
        noToken(req, res);
    }
}

function noApp(req, res) {
    res.writeHead(200, {'content-type':'text/html'});
    res.write('<html>');
    //if(!(auth.clientID && auth.secret))
        res.write('create an app at <a href="https://github.com/account/applications/new" target="_blank">github</a>' +
                ' with a callback url of ' + uri + 'authComplete');
    res.write('<form method="POST" action="saveAuth">');
    //if(!(auth.clientID && auth.secret)) 
        res.write('Client ID: <input name="clientID"><br>Secret: <input name="secret">');
    //if(!auth.username)
        res.write('<br>Username: <input name="username">');
    res.end('<input type="submit"></form></html>');
}

function noToken(req, res) {
    if(auth.access_token) {
        if(callback) callback(auth, req, res);
    } else {
        res.writeHead(200, {'content-type':'text/html'});
        res.write('<html>cool. now <a href="https://github.com/login/oauth/authorize?client_id=' + 
                                            auth.clientID + '&redirect_uri=' + uri +'authComplete">auth it up.</a>');
        res.end('</html>');
    }
}

function backFromGithub(req, res) {
    var code = req.query.code;
    request.post({uri:'https://github.com/login/oauth/access_token', 
                  json: { client_id:auth.clientID,  
                            redirect_uri:uri + 'authComplete',
                            client_secret: auth.secret,
                            code:code}}, function(err, resp, body) {
        auth.access_token = JSON.parse(body).access_token;
        if(callback) callback(auth, req, res);
    });
}