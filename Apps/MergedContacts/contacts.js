/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    http = require("http"),
    lfs = require("../../Common/node/lfs.js"),
    locker = require("../../Common/node/locker.js"),
    lconfig = require("../../Common/node/lconfig.js"),
    express = require('express'),
    request = require("request"),
    connect = require('connect');
    
var app = express.createServer(
                connect.bodyParser(),
                connect.cookieParser(),
                connect.session({secret : "locker"})
            );

var appDataDir = process.cwd();

// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    lockerInfo = JSON.parse(data);
    if (!lockerInfo || !lockerInfo["workingDirectory"]) {
        process.stderr.write("Was not passed valid startup information."+data+"\n");
        process.exit(1);
    }
    locker.initClient(lockerInfo);
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});


function readContacts(contactsReadCB) {
    var me = lfs.loadMeData();
    var puri = url.parse(lockerInfo.lockerUrl);
    var httpClient = http.createClient(puri.port);
    request.get({url:lconfig.lockerBase + "/query/getContact?offset=0"}, function(err, res, data) {
        contactsReadCB(JSON.parse(data));
    });
}

/* Disabled for now
function readGroups() {
    var groupsString = fs.readFileSync("cb/my/groups.json", "utf-8");
    var groups = groupsString.split('\n');
    var groupsArray = [];
    for (var i in groups) {
        if (groups[i])
        groupsArray.push(JSON.parse(groups[i]));
    }
    return groupsArray;
}
*/

app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head><title>Contacts!</title>\n' +
              '<link rel="stylesheet" href="contacts.css">\n</head>\n\n<body>');
//        var groups = readGroups();
    console.log('reading contacts...');
    readContacts(function(contacts) {
        for (var i = 0; i < contacts.length; i++) {
            var photos = null;
            res.write('<div class="contact">');
            if(contacts[i].photos && contacts[i].photos.length > 0) {
                res.write('<img style="float:left; margin-right:5px" width="56px" height="56px"' + 
                          ' src="' + contacts[i].photos[0] + '">');
            } else {
                res.write('<div style="float:left; margin-right:5px; width:56px; height:56px;"></div>');
            }
            var contact = contacts[i];
            if (contact.name)
                res.write('<div class="info"><b>' + contact.name + '</b><br>');
            if (contact.phone) {
                for(var j = 0; j < contact.phone.length; j++)
                    res.write(contact.phone[j].value + (j+1 < contact.phone.length ?', ' : '<br>'));
            }
            if (contact.email) {
                for(var j = 0; j < contact.email.length; j++) {
                    res.write(contact.email[j].value + (j+1 < contact.email.length ?', ' : '<br>'));
                }
                res.write('<br>');
            }
            res.write('</div></div>\n\n');
        }
        res.end("</body></html>");
    });
});
// app.get('/photos', function (req, res) {    
//     var uri = url.parse(req.url).pathname;
//     var filename = path.join(process.cwd() + '/../contacts.book/my/', uri);  
//     path.exists(filename, function(exists) { 
//         if(!exists) {  
//             res.writeHead(404, {"Content-Type": "text/plain"});  
//             res.write("404 Not Found\n");  
//             res.end();  
//             return;  
//         }  
// 
//         fs.readFile(filename, "binary", function(err, file) {  
//             if(err) {  
//                 res.writeHead(500, {"Content-Type": "text/plain"});  
//                 res.write(err + "\n");  
//                 res.end();  
//                 return;  
//             }  
// 
//             res.writeHead(200);  
//             res.write(file, "binary");  
//             res.end();  
//         });  
//     });
// });
app.get('/*', function (req, res) {
    var uri = url.parse(req.url).pathname;
    var filename = path.join(appDataDir, uri);  
    path.exists(filename, function(exists) { 
        if(!exists) {  
            res.writeHead(404, {"Content-Type": "text/plain"});  
            res.write("404 Not Found\n");  
            res.end();  
            return;  
        }  

        fs.readFile(filename, "binary", function(err, file) {  
            if(err) {  
                res.writeHead(500, {"Content-Type": "text/plain"});  
                res.write(err + "\n");  
                res.end();  
                return;  
            }  

            res.writeHead(200);  
            res.write(file, "binary");  
            res.end();  
        });  
    });
});

