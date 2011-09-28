var monthNames = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];
var yearbuckets = {};
var monthbuckets = {};
var daybuckets = {};
var curState = {};

$(function() {
    var sort = '\'{"timestamp":-1}\'';
    $.getJSON('/query/getPhoto', {'sort':sort}, processResults);
    $('#page_wrapper').delegate('ul', 'click', moveIn);
    $('.back-button').click(moveOut);
    Galleria.loadTheme('js/themes/classic/galleria.classic.min.js');
    $(document).keydown(function(e) {
        if (e.keyCode === 27) {
            $('#galleria').css('height', 0).css('width', 0);
            $('#galleria').html('');
        } else if (e.keyCode === 37) {
            Galleria.get(0).prev();
        } else if (e.keyCode === 39) {
            Galleria.get(0).next();
        }
    });
});

var processResults = function(photos) {
    var $newElems;
    if (photos.length == 0) return;


    for (var i = 0; i < photos.length; i++) {
        var timestamp = new Date(photos[i].timestamp);
        var year = timestamp.getFullYear();
        var month = timestamp.getMonth();
        var day = timestamp.getDate();
        photos[i].thumbUrl = photos[i].thumbnail || photos[i].url;
        photos[i].date = monthNames[month] + ' ' + day + ', ' + year;
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
    $('.gallery-row:not(.template)').remove();
    var keys = rsortedKeys(bucket);
    for (var i = 0; i < keys.length; i++) {
        var thisBucket = bucket[keys[i]];
        var newRow = $('.gallery-row.template').clone();
        newRow.removeClass('template');
        var text = keys[i];
        if (curState.year) {
            if (curState.month) {
                text = monthNames[curState.month] + " " + keys[i];
            } else {
                text = monthNames[keys[i]];
            }
        }
        newRow.find('.title p').text(text);
        var hoverText = text + ' - ' + thisBucket.length + ' Photo';
        if (thisBucket.length > 1) { hoverText += 's'; }
        newRow.find('.hoverstate p').text(hoverText);
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
            var thumbUrl = image.thumbUrl;
            newItem.find('div').css('background-image', 'url("' + thumbUrl + '")');
            newRow.append(newItem);
        }
        newRow.data('key', keys[i]);
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

var moveIn = function() {
    if (curState.year) {
        if (curState.month) {
            drawGallery(daybuckets[curState.year][curState.month][$(this).data('key')]);
            return;
        } else {
            if (monthbuckets[curState.year][$(this).data('key')].length < 11) {
                return drawGallery(monthbuckets[curState.year][$(this).data('key')]);
            }
            curState.month = $(this).data('key');
        }
    } else {
        if (yearbuckets[$(this).data('key')].length < 11) {
            return drawGallery(yearbuckets[$(this).data('key')]);
        }
        curState.year = $(this).data('key');
    }
    renderState();
}

var moveOut = function() {
    if (curState.month) {
        delete curState.month;
    } else {
        delete curState.year;
    }
    renderState();
}

var renderState = function() {
    if (curState.year) {
        $('.back-button').show();
        if (curState.month) {
            $('.back-button p').text(curState.year);
            $('.header-text').text(monthNames[curState.month] + " " + curState.year);
            renderBoxes(daybuckets[curState.year][curState.month]);
        } else {
            $('.back-button p').text('All Photos');
            $('.header-text').text(curState.year);
            renderBoxes(monthbuckets[curState.year]);
        }
    } else {
        $('.back-button').hide();
        $('.header-text').text('Photos');
        renderBoxes(yearbuckets);
    }

}

var drawGallery = function(bucket) {
    var data = [];
    console.log(bucket);
    for (var i = 0; i < bucket.length; i++) {
        var newObj = {};
        newObj.image = bucket[i].url;
        newObj.thumb = bucket[i].thumbUrl || bucket[i].thumbnail || bucket[i].url;
        newObj.title = bucket[i].title;
        console.log(bucket[i].date);
        newObj.description = bucket[i].date;
        newObj.link = bucket[i].sourceLink;
        data.push(newObj);
    }
    $('#galleria').css('height', window.innerHeight);
    $('#galleria').css('width', window.innerWidth);
    $('#galleria').galleria({
        debug: false,
        popupLinks: true,
        data_source: data
    });
    $('#galleria').delegate('.galleria-info-close', 'click', function() {
        $('#galleria').css('height', 0).css('width', 0);
        $('#galleria').html('');
    });
}
