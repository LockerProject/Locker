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
exports.gather = function(type, cbDel, cbDone) {
    reset(type, function(){
        if(cbDel) cbDel();
        var services = (type) ? [type] : ['contacts', 'photos', 'places', 'links'];
        async.forEachSeries(services, gatherFromUrl, cbDone);
    });
};

function gatherFromUrl(svcId, callback) {
    var url = path.join("Me", svcId, "?all=true&stream=true");
    url = lconfig.lockerBase + "/" + url;
    logger.info("updating from "+url);
    var req = request.get({uri:url}, function(err){
        if(err) logger.error(err);
        callback();
    });
    var buff = "";
    req.on("data",function(data){
        buff += data.toString();
        var nl;
        async.whilst(function(){
            nl = buff.indexOf('\n');
            return (nl >= 0);
        }, function(cb){
            var dat = buff.substr(0,nl);
            buff = buff.substr(nl+1);
            var js;
            try{
                exports.add(svcId, JSON.parse(dat), cb);
            }catch(E){
                logger.error("got "+E+" processing "+dat);
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
            idr.hash = data._id;
            break;
        default:
            callback("unknown service");
    }
    index.index(url.format(idr), data, false, callback);
}