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
    var req = request.get({uri:url}, function(err){
        if(err) logger.error(err);
    });
    var total = 0;
    var q = async.queue(function(chunk, cb){
        if(chunk == "") return cb();
        total++;
        try{
            exports.add(svcId, JSON.parse(chunk), cb);
        }catch(E){
            logger.error("got "+E+" processing "+chunk);
            return cb();
        }
    },1);
    var buff = "";
    req.on("data",function(data){
        buff += data.toString();
        var chunks = buff.split('\n');
        buff = chunks.pop(); // if was end \n, == '', if mid-stream it'll be a not-yet-complete chunk of json
        chunks.forEach(q.push);
    });
    var ended = false;
    q.drain = function(){
        if(!ended) return; // drain can be called many times, we only care when it's after data is done coming in
        logger.info("indexed "+total+" items from "+svcId);
        callback();
    };
    req.on("end",function(){
        ended = true;
        q.push(""); // this triggers the drain if there was no data, GOTCHA
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