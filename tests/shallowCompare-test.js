var assert = require("assert");
var vows = require("vows");
var shallowCompare = require('../Common/node/shallowCompare.js');

var obj1 = {'accounts': {'foursquare' : '', 'twitter' : ''}};
var obj2 = {'accounts': {'foursquare' : ''}};

vows.describe("Shallow Compare function").addBatch({
    "Compares subobjects correctly " : {
        topic: [],
        'backwards': function () {
            assert.isFalse(shallowCompare(obj1, obj2));
        },
        'and forwards': function() {
            assert.isFalse(shallowCompare(obj2, obj1));
        }
    }
}).export(module);