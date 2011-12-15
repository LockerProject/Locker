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
exports.gather = function(type, cbDel, cbDone, delayMax) {
    if(!cbDone) cbDone = function(){ logger.info("done gathering"); };
    reset(type, function(){
        if(cbDel) cbDel();
        var services = (type) ? [type] : ['contacts', 'photos', 'places', 'links'];
        var delay = 0;
        if(delayMax) delay = Math.floor(Math.random()*delayMax);
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
    var req = request.get({uri:url}, function(err){
        if(err) logger.error(err);
        logger.info("indexed "+total+" items from "+svcId);
        callback();
    });
    var buff = "";
    req.on("data",function(data){
        buff += data.toString();
        var chunks = buff.split('\n');
        buff = chunks.pop(); // if was end \n, == '', if mid-stream it'll be a not-yet-complete chunk of json
        async.forEachSeries(chunks, function(chunk, cb){
            total++;
            try{
                exports.add(svcId, JSON.parse(chunk), cb);
            }catch(E){
                logger.error("got "+E+" processing "+chunk);
                return callback();
            }
        }, function(err){
            if(err) logger.error("got error "+err);
        });
    });
}

exports.add = function(service, data, callback){
    var idr = {host:service, slashes:true};
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
            idr.hash = data._id; // TODO when links fully uses .id, switch to that here
            break;
        default:
            callback("unknown service");
    }
    index.index(url.format(idr), data, false, callback);
}