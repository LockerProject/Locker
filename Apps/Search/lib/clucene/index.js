var lucene = require('./lucene_binding.node');
var clucene = new lucene.Lucene();

var typeMap = {};

exports.map = function(type) { 
  typeMap.type = '../../../../Me/search/' + type + '-index';
  clucene.index('../../../../Me/search/' + type + '-text', typeMap.type);
};

exports.index = function(id, type, body, callback) {
    console.log(clucene.hello());
    messages[i].data.timestamp = messages[i].timeStamp + '';
    clucene.indexText(JSON.stringify(messages[i].data), typeMap.type);
    callback(null, {result: 'ok'});
};

exports.search = function(type, term, offset, limit, callback) {
    var results = clucene.search(typeMap.type, term);
    callback(null, results);
};