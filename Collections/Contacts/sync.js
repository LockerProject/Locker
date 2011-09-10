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
var EventEmitter = require('events').EventEmitter;

exports.init = function(theLockerUrl, mongoCollection, mongo) {
    lockerUrl = theLockerUrl;
    dataStore.init(mongoCollection, mongo);
    exports.eventEmitter = new EventEmitter();
}

exports.gatherContacts = function(cb) {
    lconfig.load('../../Config/config.json');
    dataStore.clear(function(err) {
        cb(); // synchro delete, async/background reindex
        // This should really be timered, triggered, something else
        locker.providers(['contact/facebook', 'contact/twitter', 
                          'contact/google', 'contact/foursquare', 
                          'contact/github'], function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                console.log("svc", svc.id, svc.provides);
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
                } else if(svc.provides.indexOf('contact/github') >= 0) {
                    exports.getContacts('github', 'following', svc.id, function() {
                        exports.getContacts('github', 'followers', svc.id, function() {
                            console.error('github done!');
                        });
                    })
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
            // what event should this be?
            // also, should the source be what initiated the change, or just contacts?  putting contacts for now.
            //
            // var eventObj = {source: req.body.obj.via, type:req.body.obj.type, data:doc};
            if (doc._id) {
                var eventObj = {source: "contacts", type:endpoint, data:doc};
                exports.eventEmitter.emit('contact/full', eventObj);
            }
            addContacts(type, endpoint, contacts, callback);
        })
    }
}
