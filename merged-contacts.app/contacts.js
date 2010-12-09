var fs = require('fs');
var path = require('path');
var url = require('url');
var sys = require('sys');

function compareContacts(a, b) {
    if(a.name == null & b.name == null)
        return 0;
    if(a.name == null)
        return 1;
    if(b.name == null)
        return -1;
    var an = a.name.toLowerCase();
    var bn = b.name.toLowerCase();
//    console.log(an);
//    console.log(bn);
//    return a.name.toLowerCase().compareTo(b.name.toLowerCase()); 
    if(an < bn)
        return -1;
    if(an > bn)
        return 1;
    return 0;
}

function readContacts() {
    var contactsString = fs.readFileSync("cb/my/contacts.json", "utf-8");
    var contacts = contactsString.split('\n');
    var contactsArray = [];
    for (var i in contacts) {
        if (contacts[i])
        contactsArray.push(JSON.parse(contacts[i]));
    }
    contactsArray.sort(compareContacts);
    return contactsArray;
}

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

var http = require('http');
http.createServer(function(req, res) {
    
    var uri = url.parse(req.url).pathname;  
    console.log("uri = " + uri);
    if(uri != '/') {
        var filename = path.join(process.cwd(), uri);  
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
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write('<html><head><title>Contacts!</title>\n' +
                  '<link rel="stylesheet" href="contacts.css">\n</head>\n\n<body>');
//        var groups = readGroups();
        console.log('reading contacts...');
        var contacts = readContacts();
        console.log('read contacts');
        for (var i in contacts) {
            var filename = null;
            if(contacts[i].pic && contacts[i].pic.length > 0)
                filename = path.join('cb/my/photos/', contacts[i].pic[0]);
//            console.log("filename = " + filename);
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
                    for(var i in contact.phone)
                        res.write(contact.phone[i].value + (i+1 < contact.phone.length ?', ' : '<br>'));
//                    res.write('<br>');
                }
                if (contact.email) {
                    for(var i = 0; i < contact.email.length; i++) {
                        res.write(contact.email[i].value + (i+1 < contact.email.length ?', ' : '<br>'));
                    }
                    res.write('<br>');
                }
                res.write('</div></div>\n\n');
            }
        }
        res.end("</body></html>");
    }
}).listen(8124, "127.0.0.1");
console.log('Server running at http://127.0.0.1:8124/');