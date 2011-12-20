module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');
    var crypto = require('crypto');
    var lmongo = require(__dirname + '/../../../Common/node/lmongo.js');
    lmongo.init('links', ['link'], function(mongo) {
        var coll = mongo.collections.links.link;
        coll.find({'id': {$exists:false}}).toArray(function(err, docs) {
            if (err) {
                console.log(err);
                return false;
            }
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];
                coll.update({link: doc.link}, {$set: {id:crypto.createHash('md5').update(doc.link).digest('hex')}}, function(err) {
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

