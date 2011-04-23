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
var lconfig = require('./lconfig.js');

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
    request.get({
        uri: lconfig.lockerBase + '/keychain/' + endpoint + '?' + querystring.stringify(params),
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
    request.post({
        uri: lconfig.lockerBase + '/keychain/' + endpoint,
        json: params
    }, function(err, resp, body) {
        if(body)
            body = JSON.parse(body);
        callback(err, body);
    });
}

function req(method, endpoint, params, callback) {
    request({
        uri: lconfig.lockerBase + '/keychain/' + endpoint + '?' + querystring.stringify(params),
        method: method
    }, function(err, body, resp) {
        if(body)
            body = JSON.parse(body);
        callback(err, body);
    });
}
