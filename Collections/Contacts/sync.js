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
    locker.providers(['contact/facebook', 'contact/twitter', 'contact/google', 'contact/foursquare'], function(services) {
        if (!services) return;
        services.forEach(function(svc) {
            if(svc.provides.indexOf('contact/facebook') >= 0) {
                // getContactsFromFacebook(svc.id, function() {
                //     console.error('facebook done!');
                // });
            } else if(svc.provides.indexOf('contact/twitter') >= 0) {
                getContactsFromTwitter(svc.id, 'friend', function() {
                    getContactsFromTwitter(svc.id, 'follower', function() {
                        console.error('twitter done!');
                    });
                });
            } else if(svc.provides.indexOf('contact/google') >= 0) {
                getContactsFromGoogle(svc.id, function() {
                    console.error('gcontacts done!');
                });
                // addContactsFromConn(svc.id, '/allContacts', 'contact/google');
            } else if(svc.provides.indexOf('contact/foursquare') >= 0) {
                getContactsFromFoursquare(svc.id, function() {
                    console.error('foursquare done!');
                });
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

function getContactsFromFoursquare(svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/friends'}, function(err, resp, body) {
        var people = JSON.parse(body);
        addFoursquareContacts(people, callback);
    })
}

function addFoursquareContacts(contacts, callback) {
    if (!(contacts && contacts.length)) {
        callback();
    } else {
        var contact = contacts.shift();
        dataStore.addFoursquareData({data:contact}, function(err, doc) {
            addFoursquareContacts(contacts, callback);
        })
    }
}

// get friends from a given Facebook Connector instance
function getContactsFromFacebook(svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/friends'}, function(err, resp, body) {
        var friends = JSON.parse(body);
        addFacebookContacts(friends, callback);
    });
}

// Add the friends from the Facebook Connector to the data store, one by one
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


// get friends from a given Google Contacts Connector instance
function getContactsFromGoogle(svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/contacts'}, function(err, resp, body) {
        var contacts = JSON.parse(body);
        console.error('from gc:', contacts);
        addGoogleContacts(contacts, callback);
    });
}

// Add the friends from the Google Contacts Connector to the data store, one by one
function addGoogleContacts(contacts, callback) {
    if(!(contacts && contacts.length)) {
        callback();
    } else {
        var contact = contacts.shift();
        dataStore.addGoogleContactsData({data:contact}, function(err, doc) {
            addGoogleContacts(contacts, callback);
        });
    }
}