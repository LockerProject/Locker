/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request');
var querystring = require('querystring');

var lockerBase, myServiceID;

exports.init = function(theLockerBase, theServiceID) {
    lockerBase = theLockerBase;
    myServiceID = theServiceID;
}

exports.putAuthToken = function(authToken, serviceType, descriptor, callback) {
    post('putAuthToken', {authToken:authToken, serviceType:serviceType, descriptor:descriptor}, (callback? callback : function(){}));
}

exports.grantPermission = function(authTokenID, serviceID, callback) {
    post('grantPermission', {authTokenID:authTokenID, serviceID:serviceID}, (callback? callback : function(){}));
}

exports.getTokenDescriptors = function(serviceType, callback) {
    get('getTokenDescriptors', {serviceType:serviceType}, callback);
}

exports.getAuthToken = function(authTokenID, callback) {
    get('getAuthToken', {authTokenID:authTokenID}, callback);
    
}


function get(endpoint, params, callback) {
    if(!lockerBase)
        throw new Error('must call init(lockerBase) prior to using keychain client!');
    request.get({
        uri: lockerBase + '/core/' + myServiceID + '/keychain/' + endpoint + '?' + querystring.stringify(params),
    }, function(err, resp, body) {
        if(body)
            body = JSON.parse(body);
        if(resp && resp.statusCode < 400)
            callback(err, body);
        else
            callback(body);
    });
}

function post(endpoint, params, callback) {
    if(!lockerBase)
        throw new Error('must call init(lockerBase) prior to using keychain client!');
    request.post({
        uri: lockerBase + '/core/' + myServiceID + '/keychain/' + endpoint,
        json: params
    }, function(err, resp, body) {
        if(body)
            body = JSON.parse(body);
        callback(err, body);
    });
}