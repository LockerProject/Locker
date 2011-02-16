// merge contacts from journals
var fs = require('fs'),
    http = require('http'),
    url = require('url'),
    lfs = require('../../Common/node/lfs.js'),
    crypto = require('crypto');


var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port)
{
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}

process.chdir(cwd);

var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyDecoder(), connect.cookieDecoder(), connect.session({secret : "locker"}));

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    lfs.readObjectsFromFile("contacts.json",function(contacts){
        res.write("Found "+contacts.length+" contacts: <ul>");
        for(var i=0;i<contacts.length;i++)
        {
            res.write('<li>'+JSON.stringify(contacts[i]));
        }
        res.end();
    });
});

app.listen(port);
console.log("http://localhost:"+port+"/");

// for right now we are really dumb, just merge on load always, trigger/update plumbing is on order :)
var me = lfs.loadMeData();
for(var conn in me.use)
{
    if(me.use[conn] == "contact/facebook")
    {
        addContactsFromConn(conn,'/getfriends','contact/facebook');
    }
}







var contacts = {};
var debug = false;

function cadd(c, type) {
    if(!c)
        return;
        
    morphContact(c, type);
    var key;
    if(c.name)
        key= c.name.replace(/[A-Z]\./g, '').toLowerCase().replace(/\s/g, '');
    else if(c.email && c.email.length > 0)
        key = c.email[0].value;
    else {
        var m = crypto.createHash('sha1');
        m.update(JSON.stringify(c));
        key = m.digest('base64');
    }
    if (contacts[key]) {
        // merge
        mergeContacts(contacts[key], c);
    } else {
        contacts[key] = c;
    }
}

function morphContact(c, type) {
    if(type == 'contact/foursquare')
    {
        if(c.contact.email) c.email = [{'value':c.contact.email}];
        if(c.contact.phone) c.phone = [{'value':c.contact.phone}];
    }
}


/**
 * name
 * email
 * phone
 * address
 * pic (avatar)
 */
function mergeContacts(one, two) {
    mergeArrays(one,two,"_via",function(a,b){return a==b;});
    mergeArrayInObjects(one, two, "email", function(obj1, obj2) {
        return obj1.value.toLowerCase() == obj2.value.toLowerCase();
    });
    mergeArrayInObjects(one, two, "phone", function(obj1, obj2) {
        return obj1.value.replace(/[^0-9]/g,'').toLowerCase() ==
               obj2.value.replace(/[^0-9]/g,'').toLowerCase();
    });
    mergeArrayInObjects(one, two, "address", function(obj1, obj2) {
        return obj1.value.replace(/[,\s!.#-()@]/g,'').toLowerCase() == 
               obj2.value.replace(/[,\s!.#-()@]/g,'').toLowerCase();
    });
    mergeArrayInObjects(one, two, "pic",  function(obj1, obj2) {return false;});
}

/**
 * Merge two arrays of the name arrayName in two objects
 */
function mergeArrayInObjects(obj1, obj2, arrayName, entriesAreEqual) {
    if(obj1[arrayName]) {
        if(obj2[arrayName]) {
            mergeArrays(obj1[arrayName], obj2[arrayName], entriesAreEqual);
        }
    } else if(obj2[arrayName]) {
        obj1[arrayName] = obj2[arrayName];
    }
}

/**
 * Merge two arrays, removing duplicates that match based on equals function
 */
function mergeArrays(one, two, entriesAreEqual) {
    for(var i = 0; i < two.length; i++) {
        var present = false;
        for(var j = 0; j < one.length; j++) {
            if(entriesAreEqual(one[j], two[i]))
                present = true;
        }
        if(!present)
            one.push(two[i]);
    }
}


/**
 * Reads in a file (at path), splits by line, and parses each line as JSON.
 * return parsed objects in an array
 */
function parseLinesOfJSON(data) {
    var objects = [];
    var cs = data.split("\n");
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != "{") continue;
        if(debug) console.log(cs[i]);
        objects.push(JSON.parse(cs[i]));
    }
    return objects;
}

function addContactsFromConn(conn, path, type) {
    var puri = url.parse(me.uri);
    var httpClient = http.createClient(puri.port);
    var request = httpClient.request('GET', '/Me/'+conn+path);
    request.end();
    request.on('response',
    function(response) {
        var data = '';
        response.on('data',
        function(chunk) {
            data += chunk;
        });
        response.on('end',
        function() {
            var cs = parseLinesOfJSON(data);
            for (var i = 0; i < cs.length; i++) {
                cs[i]["_via"] = [conn];
                cadd(cs[i],type);
            }
            csync();
        });
    });
}

function csync()
{
    var stream = fs.createWriteStream("contacts.json");
    var ccount=0;
    for (var c in contacts) {
        stream.write(JSON.stringify(contacts[c]) + "\n");
        ccount++;
    }
    stream.end();
    console.log("saved " + ccount + " contacts");    
}
