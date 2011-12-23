/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request');
var async = require('async');
var lutil = require('lutil');
var url = require('url');
var path = require('path');
var crypto = require('crypto');

var lconfig, index, logger;
exports.init = function(l, i, c){
    lconfig = l;
    index = i;
    logger = c;
}

function reset(type, callback)
{
    if(!type) return index.reset(callback);
    index.deleteType(type, callback);
}
exports.gather = function(type, cbDel, cbDone, delay) {
    if(!cbDone) cbDone = function(){ logger.info("done gathering"); };
    reset(type, function(){
        if(cbDel) cbDel();
        var services = (type) ? [type] : ['contacts', 'photos', 'places', 'links'];
        if(!delay) delay = 0;
        setTimeout(function(){
            async.forEachSeries(services, gatherFromUrl, cbDone);
        }, delay);
    });
};

function gatherFromUrl(svcId, callback) {
    var url = path.join("Me", svcId, "?all=true&stream=true");
    url = lconfig.lockerBase + "/" + url;
    logger.info("updating from "+url);
    var total = 0;
    lutil.streamFromUrl(url, function(js, cb){
        total++;
        exports.add(svcId, js, cb);
    }, function(){
        logger.info("indexed "+total+" items from "+svcId);
        callback();
    });
}

exports.add = function(service, data, callback){
    var idr = {host:service, slashes:true, pathname:'/'};
    switch(service)
    {
        case "places":
            idr.protocol = "place";
            idr.hash = data.id;
            break;
        case "contacts":
            idr.protocol = "contact";
            idr.hash = data._id;
            break;
        case "photos":
            idr.protocol = "photo";
            idr.hash = data.id;
            break;
        case "links":
            idr.protocol = "link";
            idr.hash = data.id;
            break;
        default:
            callback("unknown service");
    }
    index.index(url.format(idr), data, false, callback);
}