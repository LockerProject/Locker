/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request');
var locker = require('../../Common/node/locker.js');
var lconfig = require('../../Common/node/lconfig.js');
var dataStore = require('./dataStore');
var lockerUrl;

exports.init = function(theLockerUrl, mongoCollection) {
    lockerUrl = theLockerUrl;
    dataStore.init(mongoCollection);
}

exports.gatherContacts = function() {
    // This should really be timered, triggered, something else
    locker.providers(['contact/facebook', 'contact/twitter', 'contact/google'], function(services) {
        if (!services) return;
        services.forEach(function(svc) {
            if(svc.provides.indexOf('contact/facebook') >= 0) {
                // addContactsFromConn(svc.id,'/allContacts','contact/facebook');
            } else if(svc.provides.indexOf('contact/twitter') >= 0) {
                getContactsFromTwitter(svc.id, 'friend', function() {
                    getContactsFromTwitter(svc.id, 'follower', function() {
                        console.error('done!');
                    });
                });
            } else if(svc.provides.indexOf('contact/google') >= 0) {
                // addContactsFromConn(svc.id, '/allContacts', 'contact/google');
            }
        });
    });
}


// get contacts of the given type (friend or follower) from a given Twitter Connector instance
function getContactsFromTwitter(svcID, type, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + type + 's'}, function(err, resp, body) {
        var people = JSON.parse(body);
        addTwitterContacts(people, type, callback);
    });
}

// Add the contacts from the Twitter Connector to the data store, one by one
function addTwitterContacts(contacts, type, callback) {
    if(!(contacts && contacts.length)) {
        callback();
    } else {
        var contact = contacts.shift();
        dataStore.addTwitterData(type, {data:contact}, function(err, doc) {
            addTwitterContacts(contacts, type, callback);
        });
    }
}


// get contacts of the given type (friend or follower) from a given Facebook Connector instance
function getContactsFromFacebook(svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/friends'}, function(err, resp, body) {
        var friends = JSON.parse(body);
        addFacebookContacts(friends, callback);
    });
}

// Add the contacts from the Facebook Connector to the data store, one by one
function addFacebookContacts(contacts, callback) {
    if(!(contacts && contacts.length)) {
        callback();
    } else {
        var contact = contacts.shift();
        dataStore.addFacebookData({data:contact}, function(err, doc) {
            addFacebookContacts(contacts, callback);
        });
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
    if(type == 'contact/foursquare') {
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
    mergeArrays(one,two,'_via',function(a,b){return a==b;});
    mergeArrayInObjects(one, two, 'email', function(obj1, obj2) {
        return obj1.value.toLowerCase() == obj2.value.toLowerCase();
    });
    mergeArrayInObjects(one, two, 'phone', function(obj1, obj2) {
        return obj1.value.replace(/[^0-9]/g,'').toLowerCase() ==
               obj2.value.replace(/[^0-9]/g,'').toLowerCase();
    });
    mergeArrayInObjects(one, two, 'address', function(obj1, obj2) {
        return obj1.value.replace(/[,\s!.#-()@]/g,'').toLowerCase() == 
               obj2.value.replace(/[,\s!.#-()@]/g,'').toLowerCase();
    });
    mergeArrayInObjects(one, two, 'pic',  function(obj1, obj2) {return false;});
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
    var cs = data.split('\n');
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != '{') continue;
        if(debug) console.log(cs[i]);
        objects.push(JSON.parse(cs[i]));
    }
    return objects;
}

function addContactsFromConn(conn, path, type) {
    var puri = url.parse(lockerInfo.lockerUrl);
    var httpClient = http.createClient(puri.port);
    request.get({url:lconfig.lockerBase + '/Me/'+conn+path}, function(err, res, data) {
        var cs = data[0] == '[' ? JSON.parse(data) : parseLinesOfJSON(data);
        for (var i = 0; i < cs.length; i++) {
            cs[i]['_via'] = [conn];
            cadd(cs[i],type);
        }
        csync(type);
    });
}

function csync(conn, type) {
    var stream = fs.createWriteStream('contacts.json');
    var ccount=0;
    for (var c in contacts) {
        stream.write(JSON.stringify(contacts[c]) + '\n');
        ccount++;
    }
    stream.end();
    locker.diary('collected ' + ccount + ' contacts from '+conn+' of type '+type);
}