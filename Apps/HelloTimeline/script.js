var baseUrl = false;

$(document).ready(function() {
    if(baseUrl === false) window.alert("Couldn't find your locker, you might need to add a config.js (see dev.singly.com)");
});

var offset=0;
$(function() {
    // be careful with the limit, some people have large datasets ;)
    loadPhotos();
    $("#moar").click( function(){
        offset += 50;
        loadPhotos();
    });
});

function loadPhotos(){
    $.getJSON(baseUrl + '/Me/timeline/',{limit:50, offset:offset}, function(data) {
        if(!data || !data.length) return;
        var html = '';
        for(var i in data)
        {
            var p = data[i];
            html += "<span title='"+JSON.stringify(p,null,'\t')+"'>" + p.text + '</span><hr>';
        }
        $("#test").append(html);
    });
}
