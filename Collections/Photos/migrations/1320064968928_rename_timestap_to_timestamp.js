module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');
    var lmongo = require(__dirname + '/../../../Common/node/lmongo.js');
    lmongo.init('photos', ['photos'], function(mongo) {
        var coll = mongo.collections.photos.photos;
        coll.find({'timestap': {$exists:true}}).toArray(function(err, docs) {
            if (err) {
                console.log(err);
                return false;
            }
            for (var i = 0; i < docs.length; i++) {
                coll.update({id: docs[i].id}, {$set: {timestamp: docs[i].timestap}, $unset: {timestap: 1}}, function(err) {
                    if (err) {
                        console.log(err);
                        return false;
                    }
                });
            }
        });
    });
    return true;
};

