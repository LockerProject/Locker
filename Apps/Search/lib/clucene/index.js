var lucene = require('./lucene_binding.node');

exports.index = function(id, type, body, callback) {
    
    var clucene = new lucene.Lucene();
    console.log(clucene.hello());
    messages[i].data.timestamp = messages[i].timeStamp + '';
    clucene.indexText(JSON.stringify(messages[i].data), 'messages');
};

exports.search = function(type, term, offset, limit, callback) {
    
};