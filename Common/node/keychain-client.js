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

var lockerBase;

exports.init = function(theLockerBase) {
    lockerBase = theLockerBase;
}

exports.putObject = function(serviceType, object, meta, callback) {
    post('put', {serviceType:serviceType, object:object, meta:meta}, (callback? callback : function(){}));
}

exports.grantPermission = function(serviceID, serviceType, index, callback) {
    post('permission', {serviceID:serviceID, serviceType:serviceType, index:index}, (callback? callback : function(){}));
}

exports.getMetaForServiceType = function(serviceType, callback) {
    get('meta', {serviceType:serviceType}, callback);
}

exports.getObject = function(serviceID, serviceType, index, callback) {
    get('get', {serviceID:serviceID, serviceType:serviceType, index:index}, callback);
    
}



function get(endpoint, params, callback) {
    if(!lockerBase)
        throw new Error('must call init(lockerBase) prior to using keychain client!');
    request.get({
        uri: lockerBase + '/keychain/' + endpoint + '?' + querystring.stringify(params),
    }, function(err, resp, body) {
        if(body)
            body = JSON.parse(body);
        if(resp.statusCode < 400)
            callback(err, body);
        else
            callback(body);
    });
}

function post(endpoint, params, callback) {
    if(!lockerBase)
        throw new Error('must call init(lockerBase) prior to using keychain client!');
    request.post({
        uri: lockerBase + '/keychain/' + endpoint,
        json: params
    }, function(err, resp, body) {
        if(body)
            body = JSON.parse(body);
        callback(err, body);
    });
}
