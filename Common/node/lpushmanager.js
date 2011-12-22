var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , async = require('async')
  , datasets = {}
  , levents = require('levents')
  , lutil = require('lutil')
  , config = {}
  ;


// this works, but feels like it should be a cleaner abstraction layer on top of the datastore instead of this garbage
config.ijods = {};
config.datasets = {};
module.exports.datasets = config.datasets;

module.exports.init = function () {
    var dir = path.join(lconfig.me, "push");
    if (!path.existsSync(lconfig.me)) fs.mkdirSync(lconfig.me, 0755);
    if (!path.existsSync(dir)) fs.mkdirSync(path.join(lconfig.me, "push"), 0755);
    if (!path.existsSync(path.join(dir, "push_config.json"))) return;
    config = JSON.parse(fs.readFileSync(path.join(dir, "push_config.json")));
    module.exports.datasets = config.datasets;
}

module.exports.acceptData = function(dataset, response, callback) {
    var deletedIDs = {};
    if (response.config) {
        if (config[dataset]) {
            deletedIDs = compareIDs(config[dataset], response.config);
        } else {
            config[dataset] = {};
        }
        lutil.extend(true, config[dataset], response.config);
        lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, "push", 'push_config.json'),
                          JSON.stringify(config, null, 4));
    }
    if (typeof(response.data) === 'string') {
        return callback('data is in a wacked out format');
    }
    if (dataset.length === 0) {
        return callback();
    }
    processData(deletedIDs, response.data, dataset, callback);
}

// simple async friendly wrapper
function getIJOD(dataset, create, callback) {
    if(config.ijods[dataset]) return callback(config.ijods[dataset]);
    var name = path.join(lconfig.lockerDir, lconfig.me, "push", dataset);
    // only load if one exists or create flag is set
    fs.stat(name+".db", function(err, stat){
        if(!stat && !create) return callback();
        config.ijods[dataset] = new IJOD({name:name}, function(err, ij){
            if(err) logger.error(err);
            return callback(ij);
        });
    });
}
module.exports.getIJOD = getIJOD;

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
    if (!module.exports.datasets[dataset]) {
        module.exports.datasets[dataset] = true;
        lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, "push", 'push_config.json'),
                              JSON.stringify(config, null, 4));
    }
    getIJOD(dataset, true, function(ijod){
        if (deleteIDs && deleteIDs.length > 0 && data) {
            addData(dataset, data, ijod, function(err) {
                if(err) {
                    callback(err);
                } else {
                    deleteData(dataset, deleteIDs, ijod, callback);
                }
            });
        } else if (data && data.length > 0) {
            addData(dataset, data, ijod, callback);
        } else if (deleteIDs && deleteIDs.length > 0) {
            deleteData(dataset, deleteIDs, ijod, callback);
        } else {
            callback();
        }
    });
}

function deleteData (dataset, deleteIds, ijod, callback) {
    var q = async.queue(function(id, cb) {
        levents.fireEvent(lutil.idrNew(dataset, 'push', id), 'delete');
        ijod.delData({id:id}, cb);
    }, 5);
    deleteIds.forEach(q.push);
    q.drain = callback;
}

function addData (dataset, data, ijod, callback) {
    var errs = [];
    var q = async.queue(function(item, cb) {
        var object = (item.obj) ? item : {obj: item};
        if (object.obj) {
            if(object.obj.id === null || object.obj.id === undefined) {
                errs.push({"message":"no value for primary key", "obj": object.obj});
                return cb();
            }
            if (object.type === 'delete') {
                levents.fireEvent(lutil.idrNew(dataset, 'push', object.obj.id), 'delete');
                ijod.delData({id:object.obj["id"]}, cb);
            } else {
                var arg = {id:object.obj.id, data:object.obj};
                if(object.timestamp) arg.at = object.timestamp;
                ijod.addData(arg, function(err, type) {
                    if (type === 'same') return cb();
                    levents.fireEvent(lutil.idrNew(dataset, 'push', object.obj.id), type, object.obj);
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

