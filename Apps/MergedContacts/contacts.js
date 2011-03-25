var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    http = require("http"),
    lfs = require("../../Common/node/lfs.js"),
    express = require('express'),
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
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});

/**
 * Reads in a file (at path), splits by line, and parses each line as JSON.
 * return parsed objects in an arrayo
 *
 * XXX Duplicated code, needs to be made common
 */
function parseLinesOfJSON(data) {
    var objects = [];
    var cs = data.split("\n");
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != "{") continue;
        try {
            objects.push(JSON.parse(cs[i]));
        } catch(E) {
            console.log("Error parsing a line(" + E + "): " + cs[i]);
        }
    }
    return objects;
}

function readContacts(contactsReadCB) {
    var me = lfs.loadMeData();
    var puri = url.parse(lockerInfo.lockerUrl);
    var httpClient = http.createClient(puri.port);
    console.log(me.use);
    var collectionId = undefined;
    for (var key in me.use) {
        if (me.use.hasOwnProperty(key) && me.use[key] == "contact") {
            collectionId = key;
            break;
        }
    }
    if (!collectionId) return;
    var request = httpClient.request('GET', '/Me/'+collectionId+"/allContacts");
    request.end();
    request.on('response', function(response) {
        response.setEncoding("utf8");
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            console.log("Read data " + data);
            contactsReadCB(parseLinesOfJSON(data));
        });
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
            var filename = null;
            if(contacts[i].pic && contacts[i].pic.length > 0)
                filename = path.join('cb/my/photos/', contacts[i].pic[0]);
            res.write('<div class="contact">');
            try {
                var stats = fs.statSync(filename);
                res.write('<img style="float:left; margin-right:5px" width="50px" height="50px"' + 
                          ' src="' + filename + '">');
            } catch(err) {
                res.write('<div style="float:left; margin-right:5px; width:50px; height:50px;"></div>');
            }
            if (contacts[i]) {
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
        }
        res.end("</body></html>");
    });
});
app.get('/photos', function (req, res) {    
    var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd() + '/../contacts.book/my/', uri);  
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

