var utils = require('../Common/node/connector/utils');
var assert = require("assert");
var vows = require("vows");

var strings = [ 'https://github.com/ctide/arenarecapslibrary', 'https://github.com/ctide/WoWCombatLogParser',
 'https://github.com/ctide/devise_lastseenable', 'https://github.com/ctide/s3db-backup',
  'https://github.com/ctide/ri_cal', 'https://github.com/ctide/gowalla',
  'https://github.com/ctide/Locker', 'https://github.com/ctide/vows',
  'https://github.com/ctide/node' ];

vows.describe("Checked Deleted IDs function").addBatch({
    "returns the list of missing IDs" : {
        topic: function() { return utils.checkDeletedIDs([1, 2, 3, 4, 5], [1, 3, 4]) },
        
        'successfully': function (topic) {
            assert.equal(topic[0], 2);
            assert.equal(topic[1], 5);  
        }
    },
    "returns nothing when there are no known IDs" : {
        topic: function() { return utils.checkDeletedIDs([], [1, 2, 4]) },
        'successfully' : function(topic) {
            assert.equal(topic[0], undefined);
        },
    },
    "returns nothing when comparing 2 identical arrays of strings" : {
        topic: function() { return utils.checkDeletedIDs(strings, strings) },
        'successfully' : function(topic) {
            assert.equal(topic[0], undefined);
        }
    }
}).export(module);