var baseUrl = false;

$(document).ready(function() {
    if(baseUrl === false) window.alert("Couldn't find your locker, you might need to add a config.js (see dev.singly.com)");
});

var offset=0;
$(function() {
    // be careful with the limit, some people have large datasets ;)
    loadStuff();
    loadStatus();
    $("#moar").click( function(){
        offset += 50;
        loadStuff();
    });
});

var max = 20;
function loadStatus()
{
    $.getJSON(baseUrl + '/Me/timeline/state',{}, function(data) {
        if(!data) return $("#status").text("timeline failed :(");
        if(data.ready == 1) return $("#status").text("");
        var name = (data.current) ? data.current.type + " at "+data.current.offset : "";
        $("#status").text("timeline is indexing "+name);
        if(max-- <= 0) return $("#status").text("plz reload");
        window.setTimeout(loadStatus, 10000); // poll for a bit
    });
}

function loadStuff(){
    $.getJSON(baseUrl + '/Me/timeline/',{limit:50, offset:offset}, function(data) {
        if(!data || !data.length) return;
        var html = '<h4>'+ago(data[0].first)+'</h4>';
        for(var i in data)
        {
            var p = data[i];
            p.refs.forEach(function(ref){ html += icon(ref); });
            var resp = p.comments + p.ups;
            html += "<i>"+p.from.name+"</i>: <span title='"+JSON.stringify(p,null,'\t')+"'>" + p.text + '</span>';
            html += ' <a href="'+baseUrl+'/Me/timeline/ref?id='+escape(p.ref)+'">.js</a>';
            if(resp > 0) html +=  "<div id='"+p.id+"'><a href='javascript:loadResp(\""+p.id+"\")'>["+resp+"]</a></div> ";
            html += '<hr>';
        }
        $("#test").append(html);
    });
}

function loadResp(id)
{
    $.getJSON(baseUrl + '/Me/timeline/getResponses',{item:id}, function(data) {
        $("#"+id).html("");
        if(!data || !data.length) return;
        var ups = " ups: ";
        var coms = "";
        for(var i in data)
        {
            var r = data[i];
            if(r.type == "up")
            {
                ups += icon(r.ref);
                ups += " "+r.from.name+", ";
            }
            if(r.type == "comment")
            {
                coms += "<br>"
                coms += icon(r.ref);
                coms += " "+r.from.name+": ";
                coms += r.text;
            }
        }
        $("#"+id).append(ups+coms);
    });
}

function icon(ref)
{
    var start = ref.indexOf('//')+2;
    var net = ref.substr(start,ref.indexOf('/',start+2)-start);
    if(net == "links") return "";
    return "<img src='img/"+net+".png' width=16 height=16 />";

}

function ago(at)
{
    var tip = '';
    var timeDiff = Date.now() - at;
    if (timeDiff < 60000) {
        tip += 'last updated less than a minute ago';
    } else if (timeDiff < 3600000) {
        tip += 'last updated ' + Math.floor(timeDiff / 60000) + ' minutes ago';
    } else if (timeDiff < 43200000) {
        tip += 'last updated over an hour ago';
    } else if (timeDiff < 43800000) {
        tip += 'last updated ' + Math.floor(timeDiff / 3600000) + ' hours ago';
    } else {
        var d = new Date;
        d.setTime(at);
        tip += 'last updated ' + d.toString();
    }
    return tip;
}