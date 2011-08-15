var repl = require('repl');
require.paths.push('./Common/node');
var lconfig = require('lconfig');
lconfig.load('config.json');

var lsearch = require('lsearch');
lsearch.setIndexPath('./Me/search.indices');
lsearch.setEngine(lsearch.engines.CLucene);

var myrepl = repl.start('lockersearch> ');
var ctx = myrepl.context;
ctx.search = lsearch;

ctx.indexType = function(type, object) {
    lsearch.indexType(type, object,
    function(err, time) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        console.log('Indexed document in ' + time);
    });  
};
ctx.queryType = function(type, query) {
    lsearch.queryType(type, query, {}, function(err, results) {
       if (err) {
           console.log('Error: ' + err);
           return;
       } 
       console.log('Found ' + results.length + ' results:');
       for (var i in results) {
           console.log(results[i]);
       }
    });
};
ctx.queryAll = function(query) {
    lsearch.queryAll(query, {}, function(err, results) {
       if (err) {
           console.log('Error: ' + err);
           return;
       } 
       console.log('Found ' + results.length + ' results:');
       for (var i in results) {
           console.log(results[i]);
       }
    });
};
ctx.query = ctx.queryAll;

ctx.help = function() {
    console.log('\n'+
    'LOCKERSEARCH HELP:\n\n'+
    '  - help() -- shows this help screen\n\n'+
//    '  - queryAll("query") -- will search "query" across all types\n\n'+
    '  - queryType("type", "query") -- will search "query" for only the given top-level service type\n\n'+
    '  - indexType("type", object) -- will index the object for the given type.\n\n\n'+
    '  NOTES:\n\n'+
    '    - Query strings *almost* adhere to version 2.3 of the Lucene queryparser syntax. The only thing that diverges from the spec is the handling of field names. For more information on the Lucene query parser syntax, see:  http://lucene.apache.org/java/2_3_2/queryparsersyntax.html\n'+
    '    - Currently, the only types supported are the following:  contact, message\n'+
    '    - In order to index an object of a given type, you must follow the mapping rules for that given type.  Below are the mappings for the three types:\n'+
    '        contact:  {"_id":<string>, "name":<string>, "nickname":<string>, "email":[{"type":<string>, "value":<string>}]}\n'+
    '    - In addition to each type\'s required fields, you must include one global field called _id.  _id is the Locker UUID of the particular object you are indexing\n');
    myrepl.displayPrompt();
};
ctx.help();
