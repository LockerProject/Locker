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
    dataStore.clear(function(err) {
        // This should really be timered, triggered, something else
        locker.providers(['contact/facebook', 'contact/twitter', 'contact/google', 'contact/foursquare'], function(services) {
            if (!services) return;
            services.forEach(function(svc) {
                if(svc.provides.indexOf('contact/facebook') >= 0) {
                    exports.getContacts("facebook", "friends", svc.id, function() {
                        console.error('facebook done!');
                    });
                } else if(svc.provides.indexOf('contact/twitter') >= 0) {
                    exports.getContacts("twitter", "friends", svc.id, function() {
                        exports.getContacts("twitter", "followers", svc.id, function() {
                            console.error('twitter done!');
                        });
                    });
                } else if(svc.provides.indexOf('contact/google') >= 0) {
                    exports.getContacts("google", "contacts", svc.id, function() {
                        console.error('gcontacts done!');
                    });
                    // addContactsFromConn(svc.id, '/allContacts', 'contact/google');
                } else if(svc.provides.indexOf('contact/foursquare') >= 0) {
                    exports.getContacts('foursquare', "friends", svc.id, function() {
                        console.error('foursquare done!');
                    });
                }
            });
        });
    });
}


exports.getContacts = function(type, endpoint, svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + endpoint}, function(err, resp, body) {
        var contacts = JSON.parse(body);
        addContacts(type, endpoint, contacts, callback);
    });
}

function addContacts(type, endpoint, contacts, callback) {
    if (!(contacts && contacts.length)) {
        callback();
    } else {
        var contact = contacts.shift();
        dataStore.addData(type, endpoint, {data:contact}, function(err, doc) {
            addContacts(type, endpoint, contacts, callback);
        })
    }
}