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
        // now that we've deleted them, we need to tell search to whack ours too before we start
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=contact'}, function(){
            cb(); // synchro delete, async/background reindex
            // This should really be timered, triggered, something else
            locker.providers(['contact/facebook', 'contact/twitter', 'contact/flickr',
                              'contact/gcontacts', 'contact/foursquare', 'contact/instagram',
                              'contact/github'], function(err, services) {
                if (!services) return;
                services.forEach(function(svc) {
                    logger.info("svc", svc.id, svc.provides);
                    if(svc.provides.indexOf('contact/facebook') >= 0) {
                        exports.getContacts("facebook", "contact", svc.id, function() {
                            logger.info('facebook done!');
                        });
                    } else if(svc.provides.indexOf('contact/twitter') >= 0) {
                        exports.getContacts("twitter", "contact", svc.id, function() {
                            logger.info('twitter done!');
                        });
                    } else if(svc.provides.indexOf('contact/flickr') >= 0) {
                        exports.getContacts("flickr", "contact", svc.id, function() {
                            logger.info('flickr done!');
                        });
                    } else if(svc.provides.indexOf('contact/gcontacts') >= 0) {
                        exports.getContacts("gcontacts", "contact", svc.id, function() {
                            logger.info('gcontacts done!');
                        });
                    } else if(svc.provides.indexOf('contact/foursquare') >= 0) {
                        exports.getContacts('foursquare', "contact", svc.id, function() {
                            logger.info('foursquare done!');
                        });
                    } else if(svc.provides.indexOf('contact/instagram') >= 0) {
                        exports.getContacts('instagram', "contact", svc.id, function() {
                            logger.info('instagram done!');
                        });
                    } else if(svc.provides.indexOf('contact/github') >= 0) {
                        exports.getContacts('github', 'following', svc.id, function() {
                            logger.info('github done!');
                        })
                    }
                });
            });
        });
    });
}


exports.getContacts = function(type, endpoint, svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + endpoint, json:true}, function(err, resp, body) {
        if(body && Array.isArray(body)) addContacts(type, endpoint, body, callback);
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
                exports.eventEmitter.emit('contact', eventObj);
            }
            addContacts(type, endpoint, contacts, callback);
        })
    }
}
