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
    },
    "Doesn't break if you pass an object with properties and an undefined object" : {
        topic: deepCompare(obj1, undefined),
        'successfully': function(topic) {
            assert.isFalse(topic);
        }
    },
    "Doesn't break if you pass a null object" : {
        topic: deepCompare(obj1, null),
        'successfully': function(topic) {
            assert.isFalse(topic);
        }
    }
}).export(module);
