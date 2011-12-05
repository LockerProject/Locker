/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    locker = require('../../Common/node/locker.js');

var lutil = require('../../Common/node/lutil');
var lconfig = require('lconfig');
lconfig.load('../../Config/config.json');
var logger = require('logger');

var lockerInfo = {};
exports.lockerInfo = lockerInfo;

var express = require('express'),
    connect = require('connect');
var request = require('request');
var async = require('async');
var url = require('url');
var app = express.createServer(connect.bodyParser());
var index = require('index');
var sync = require('sync');


app.set('views', __dirname);


app.get('/', function(req, res) {
    res.send("You should use a search interface instead of trying to talk to me directly.");
});

app.post('/events', function(req, res) {
    if (!req.body.idr || !req.body.data) {
        logger.error("Invalid event.");
        return res.send("Invalid", 500);
    }
    var update = (req.body.action == "update") ? true : false;
    index.index(req.body.idr, req.body.data, update, function(err){
        logger.error(err);
        res.send(true);
    });
});

app.get('/update', function(req, res) {
    logger.info("updating search index");
    sync.gather(false, function(){
        return res.send('Full search reindex started');
    });
});

app.get('/reindexForType', function(req, res) {
    logger.info("updating search index for "+req.param("type"));
    sync.gather(req.param("type"), function(){
        return res.send('Partial search reindex started');
    });
});

app.get('/query', function(req, res) {
    if (!req.param('q')) {
    }
    var args = {};
    args.q = lutil.trim(req.param('q'));
    if (!args.q || args.q.length == 0) {
        logger.warn('missing or invalid query');
        return res.send('missing or invalid query');
    }

    if (req.param('type')) args.type = req.param('type');
    if (req.param('limit')) args.limit = parseInt(req.param('limit'));


});


// Process the startup JSON object
process.stdin.resume();
var allData = "";
process.stdin.on('data', function(data) {
    allData += data;
    if (allData.indexOf("\n") > 0) {
        data = allData.substr(0, allData.indexOf("\n"));
        lockerInfo = JSON.parse(data);
        locker.initClient(lockerInfo);
        if (!lockerInfo || !lockerInfo.workingDirectory) {
            process.stderr.write('Was not passed valid startup information.'+data+'\n');
            process.exit(1);
        }
        process.chdir(lockerInfo.workingDirectory);
        index.init("index.db", function(err){
            if(err) logger.error(err);
            sync.init(lconfig, index, logger);
            app.listen(lockerInfo.port, 'localhost', function() {
                process.stdout.write(data);
            });
        });
    }
});


/*






exports.handleGetQuery = function(req, callback) {
    var error;
    if (!req.param('q')) {
        error = 'Invalid arguments given for /search/query GET request.';
        logger.error(error);
        return callback(error, {});
    }

    var q = lutil.trim(req.param('q'));
    var type;
    var limit;

    if (req.param('type')) {
        type = req.param('type');
    }

    if (req.param('limit')) {
        limit = req.param('limit');
    }

    if (!q || q.substr(0, 1) == '*') {
        error = 'Please supply a valid query string for /search/query GET request.';
        logger.error(error);
        return callback(error, {});
    }

    function sendResults(err, results, queryTime) {
        if (err) {
            error = 'Error querying via /search/query GET request: '+JSON.stringify(err);
            logger.error(error);
            return callback(error, {});
        }

        if(limit) results = results.slice(0,limit);

        if(req.param('simple') == "true")
        {
            var data = {};
            data.took = queryTime;
            data.error = null;
            data.hits = results;
            data.total = results.length;
            return callback(null, data);
        }

        enrichResultsWithFullObjects(results, function(err, richResults) {
            var data = {};
            data.took = queryTime;

            if (err) {
                data.error = err;
                data.hits = [];
                error = 'Error enriching results of /search/query GET request: ' + err;
                return callback(error, data);
            }

            data.error = null;
            data.hits = richResults;
            data.total = richResults.length;
            return callback(null, data);
        });
    }

    if (type) {
        lsearch.queryType(type, q, {}, sendResults);
    } else {
        lsearch.queryAll(q, {}, sendResults);
    }
};

exports.handleGetReindexForType = function(type, callback) {
    // this handleGetReindex method can happen async, but deleteDocumentsByType MUST happen first before the callback.
    // That's why we call it here
    lsearch.deleteDocumentsByType(type, function(err, indexTime) {
        callback(err, {indexTime: indexTime});
    });

    var items;

    if (type === 'contact') {
        reindexType(lockerInfo.lockerUrl + '/Me/contacts/?all=true', 'contact', 'contacts', function(err) {});
    }
    else if (type === 'photo') {
        reindexType(lockerInfo.lockerUrl + '/Me/photos/?all=true', 'photo', 'photos', function(err) {});
    }
    else if (type === 'place') {
        reindexType(lockerInfo.lockerUrl + '/Me/places/?all=true', 'place', 'places', function(err) {});
    }
    else {
        locker.providers(type, function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
               if (svc.provides.indexOf('timeline/twitter') >= 0) {
                    reindexType(lockerInfo.lockerUrl + '/Me/' + svc.id + '/getCurrent/timeline', 'tweet', 'twitter', function(err) {});
                }
            });
        });
    }
};

function reindexType(url, type, source, callback) {
    var reqObj = request.get({uri:url}, function(err, res, body) {
        if (err) {
            logger.error('Error when attempting to reindex ' + type + ' collection: ' + err);
            return callback(err);
        }
        if (res.statusCode >= 400) {
            var error = 'Received a ' + res.statusCode + ' when attempting to reindex ' + type + ' collection';
            logger.error(err);
            return callback(err);
        }

        var items = JSON.parse(body);
        async.forEachSeries(items, function(item, forEachCb) {
            var fullBody = {};
            var id = (item.id) ? item.id : item._id;
            if(type == "twitter") id = item.id_str;
            fullBody.idr = type+"://"+source+"/#"+id; // backport
            fullBody.data = item;
            var req = {};
            req.body = fullBody;
            req.headers = {};
            req.headers['content-type'] = 'application/json';
            exports.handlePostIndex(req, function() {
                req = null;
                forEachCb.call();
            });
        },function(err) {
            reqObj = null;
            if (err) {
                logger.error(err);
                return callback(err);
            }
            logger.info('Reindexing of ' + type + ' completed.');
            return callback(err);
        });
    });
}

function enrichResultsWithFullObjects(results, callback) {
    // fetch full objects of results
    async.waterfall([
        function(waterfallCb) {
            cullAndSortResults(results, function(err, results) {
                waterfallCb(err, results);
            });
        },
        function(results, waterfallCb) {
            async.forEachSeries(results,
                function(item, forEachCb) {
                    var idr = url.parse(item.id);
                    if(!idr || !idr.host || !idr.hash) return forEachCb();
                    var source = (idr.host == 'twitter') ? 'twitter/timeline' : idr.host; // we only process timeline
                    var u = lockerInfo.lockerUrl + '/Me/' + source + '/id/' + idr.hash.substr(1);
                    makeEnrichedRequest(u, item, forEachCb);
                },
                function(err) {
                    waterfallCb(err, results);
                }
            );
        }
    ],
    function(err, results) {
        if (err) {
            return callback('Error when attempting to sort and enrich search results: ' + err, []);
        }
        return callback(null, results);
    });
}

function cullAndSortResults(results, callback) {
    async.sortBy(results, function(item, sortByCb) {
        // we concatenate the score to the type, and we use the reciprocal of the score so the sort has the best scores at the top
        sortByCb(null, item.type + (1/item.score).toFixed(3));
    },
    function(err, results) {
       callback(null, results);
    });
}

function makeEnrichedRequest(url, item, callback) {
    request.get({uri:url, json:true}, function(err, res, body) {
        if (err) {
            logger.error('Error when attempting to enrich search results at '+url+' - ' + err);
            return callback(err);
        }
        if (res.statusCode >= 400) {
            var error = 'Received a ' + res.statusCode + ' when attempting to enrich search results from '+url;
            logger.error(error);
            return callback(error);
        }

        item.fullobject = body;

        if (item.fullobject.hasOwnProperty('created_at')) {
            var dateDiff = new Date(new Date().getTime() - new Date(item.fullobject.created_at).getTime());
            if (dateDiff.getUTCDate() > 2) {
                item.fullobject.created_at_since = (dateDiff.getUTCDate() - 2) + ' day';
                if (dateDiff.getUTCDate() > 3) item.fullobject.created_at_since += 's';
            } else if (dateDiff.getUTCHours() > 2) {
                item.fullobject.created_at_since = (dateDiff.getUTCHours() - 2) + ' hour';
                if (dateDiff.getUTCHours() > 3) item.fullobject.created_at_since += 's';
            } else if (dateDiff.getUTCMinutes() > 2) {
                item.fullobject.created_at_since = (dateDiff.getUTCMinutes() - 2) + ' minute';
                if (dateDiff.getUTCMinutes() > 3) item.fullobject.created_at_since += 's';
            }
            item.fullobject.created_at_since += ' ago';
        }
        return callback(null);
    });
}

function getSourceForEvent(body) {
    // FIXME: This is a bad hack to deal with the tech debt we have around service type naming and eventing inconsistencies
    var source;

    var via = body.via;
    source = via;
    if(via.indexOf('/') > -1) { // shouldn't need this anymore
        var splitVia = via.split('/');
        via = splitVia[1];
    }
    if (via.indexOf("_") > -1) {
        var splitSource = body.obj.source.split('_');
        source = via + '/' + splitSource[1];
    }
    if (via == "twitter" && body.type.indexOf("timeline") > -1) {
        source = "twitter/timeline";
    }
    return source;
    // END FIXME
}

function handleError(idr, action, error) {
    logger.error('Error attempting to index "' + idr + '" with action of "' + action + '" - ' + error);
}

function handleLog(idr, action, time) {
    var actionWord;
    switch (action) {
        case 'new':
            actionWord = 'added';
            break;
        case 'update':
            actionWord = 'updated';
            break;
        case 'delete':
            actionWord = 'deleted';
            break;
    }
    logger.verbose('Successfully ' + actionWord + ' record in search index:' + idr + ' in ' + time + 'ms');
}

exports.init = function(config, search, _logger) {
    lconfig = config;
    lsearch = search;
    logger = _logger;
}
 */
