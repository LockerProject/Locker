var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];
var yearbuckets = {};
var monthbuckets = {};
var daybuckets = {};

$(function() {
    var sort = '\'{"timestamp":-1}\'';
    $.getJSON('/query/getPhoto', {'sort':sort}, processResults);
});

var processResults = function(photos) {
    var $newElems;
    if (photos.length == 0) return;


    for (var i = 0; i < photos.length; i++) {
        var timestamp = new Date(photos[i].timestamp);
        var year = timestamp.getFullYear();
        var month = timestamp.getMonth();
        var day = timestamp.getDate();
        if (!yearbuckets[year]) { yearbuckets[year] = []; monthbuckets[year] = []; daybuckets[year] = []; };
        yearbuckets[year].push(photos[i]);
        if (!monthbuckets[year][month]) { monthbuckets[year][month] = []; daybuckets[year][month] = []; };
        monthbuckets[year][month].push(photos[i]);
        if (!daybuckets[year][month][day]) { daybuckets[year][month][day] = []; };
        daybuckets[year][month][day].push(photos[i]);
    }
    renderBoxes(yearbuckets);
};

var renderBoxes = function(bucket) {
    var keys = rsortedKeys(bucket);
    for (var i = 0; i < keys.length; i++) {
        var thisBucket = bucket[keys[i]];
        var newRow = $('.gallery-row.template').clone();
        newRow.removeClass('template');
        newRow.find('.title p').text(keys[i]);
        var max = thisBucket.length > 12 ? 12 : thisBucket.length;
        var imKeys = [];
        var j = 0;
        while (j < thisBucket.length) {
            imKeys.push(j);
            j++;
        }
        for (var j = 0; j < max; j++) {
            var num = imKeys.splice(Math.floor(Math.random()*imKeys.length), 1);
            var image = thisBucket[num];
            var newItem = $('<li class="gallery-item"><div></div></li>');
            var thumbUrl = image.thumbUrl || image.thumbnail || image.url;
            newItem.find('div').css('background-image', 'url("' + thumbUrl + '")');
            newRow.append(newItem);
        }
        $('#page_wrapper').append(newRow);
    }
}


var rsortedKeys = function(obj) {
    var keys = [];

    for(var key in obj) {
        keys.push(key);
    }

    return keys.sort(function(a, b) { return b - a; });
}
