module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');
    var lmongo = require(__dirname + '/../../../Common/node/lmongo.js');
    lmongo.init('photos', ['photos'], function(mongo) {
        var coll = mongo.collections.photos.photos;
        coll.find({'sources.service': "synclet/foursquare"}).toArray(function(err, docs) {
            if (err) {
                console.log(err);
                return false;
            }
            for (var i = 0; i < docs.length; i++) {
                var newThumb = docs[i].thumbnail.replace('36x36', '100x100');
                coll.update({id: docs[i].id}, {$set: {thumbnail: newThumb}}, function(err) {
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
