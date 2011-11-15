var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , datastore = require('ldatastore')
  , async = require('async')
  , datasets = {}
  , levents = require('levents')
  , EventEmitter = require('events').EventEmitter
  , ee
  , lutil = require('lutil')
  , config = {}
  ;


module.exports.datasets = datasets;
module.exports.eventEmitter = ee = new EventEmitter();

module.exports.acceptData = function(dataset, response, callback) {
    datastore.init('push', function() {
        var deletedIDs = {};
        if (response.config) {
            if (config[dataset]) {
                deletedIDs = compareIDs(config[dataset], response.config);
            } else {
                config[dataset] = {};
            }
            lutil.extend(true, config[dataset], response.config);
        }
        //var deleteIDs = compareIDs(info.config, response.config);
        if (typeof(response.data) === 'string') {
            return callback('data is in a wacked out format');
        }
        if (dataset.length === 0) {
            return callback();
        }
        processData(deletedIDs, response.data, dataset, callback);
    });

}

// copy copy copy
function compareIDs (originalConfig, newConfig) {
    var resp = {};
    if (originalConfig && originalConfig.ids && newConfig && newConfig.ids) {
        var newSet = newConfig.ids;
        var oldSet = originalConfig.ids;
        var seenIDs = {};
        resp = [];
        for (var j = 0; j < newSet.length; j++) seenIDs[newSet[j]] = true;
        for (var j = 0; j < oldSet.length; j++) {
            if (!seenIDs[oldSet[j]]) resp.push(oldSet[j]);
        }
    }
    return resp;
}

//dataset is the name of the dataset
function processData (deleteIDs, data, dataset, callback) {
    module.exports.datasets[dataset] = true;
    datastore.addCollection(dataset, 'push', 'id');

    if (deleteIDs && deleteIDs.length > 0 && data) {
        addData(dataset, data, function(err) {
            if(err) {
                callback(err);
            } else {
                deleteData(dataset, deleteIDs, callback);
            }
        });
    } else if (data && data.length > 0) {
        addData(dataset, data, callback);
    } else if (deleteIDs && deleteIDs.length > 0) {
        deleteData(dataset, deleteIDs, callback);
    } else {
        callback();
    }
}

function deleteData (dataset, deleteIds, callback) {
    var q = async.queue(function(id, cb) {
        var newEvent = {obj : {source : 'push/' + dataset, type: 'delete', data : {}}};
        newEvent.obj.data['id'] = id;
        newEvent.fromService = dataset;
        levents.fireEvent('push/' + dataset, newEvent.fromService, newEvent.obj.type, newEvent.obj);
        datastore.removeObject('push_' + dataset, id, {timeStampe: Date.now()}, cb);
    }, 5);
    deleteIds.forEach(q.push);
    q.drain = callback;
}

function addData (dataset, data, callback) {
    var errs = [];
    var q = async.queue(function(item, cb) {
        var object = (item.obj) ? item : {obj: item};
        if (object.obj) {
            if(object.obj.id === null || object.obj.id === undefined) {
                errs.push({"message":"no value for primary key", "obj": object.obj});
                return cb();
            }
            var newEvent = {obj : {source : dataset, type: object.type, data: object.obj}};
            newEvent.fromService = dataset;
            if (object.type === 'delete') {
                levents.fireEvent('push/' + dataset, newEvent.fromService, newEvent.obj.type, newEvent.obj);
                datastore.removeObject('push_' + dataset, object.obj["id"], {timeStamp: object.timestamp}, cb);
            } else {
                datastore.addObject('push_' + dataset, object.obj, {timeStamp: object.timestamp}, function(err, type, doc) {
                    if (type === 'same') return cb();
                    newEvent.obj.data = doc;
                    levents.fireEvent('push/' + dataset, newEvent.fromService, type, newEvent.obj);
                    return cb();
                });
            }
        } else {
            cb();
        }
    }, 5);
    data.forEach(function(d){ q.push(d, errs.push); }); // hehe fun
    q.drain = function() {
        if (errs.length > 0) {
            callback(errs);
        } else {
            callback();
        }
    };
}

