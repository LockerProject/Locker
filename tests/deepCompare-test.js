var assert = require("assert");
var vows = require("vows");
var deepCompare = require('../Common/node/deepCompare.js');

var obj1 = {'accounts': {'foursquare' : '', 'twitter' : ''}};
var obj2 = {'accounts': {'foursquare' : ''}};

vows.describe("Deep Compare function").addBatch({
    "Compares subobjects correctly " : {
        topic: [],
        'backwards': function () {
        assert.isFalse(deepCompare(obj1, obj2));
        },
        'and forwards': function() {
            assert.isFalse(deepCompare(obj2, obj1));
        }
    }
}).export(module);