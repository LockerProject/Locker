var request = require('request');
exports.sync = function(pi, cb) {
    request.get({uri:"http://www.pandora.com/content/tracklikes?webname="+pi.auth.webname}, function(err, resp, body){
        if(err) return cb(err);
        var chunks = body.split('<div class="section clearfix"');
        chunks.shift(); // garbage in front;
        chunks.forEach(function(div){
            var like = {};
            like.id = attr(div, 'id');
            like.thumb = attr(line(div, '<img src="'),'src');
            like.href = attr(line(div, '<a href="#!/music/song'), 'href');
            like.song = text(line(div, '<a href="#!/music/song'));
            like.station = text(line(div, '<span class="profile_user_name">You</span>'), 2);
            like.stationId = attr(line(div, '<span class="profile_user_name">You</span>'), 'data-station-id');
            like.itunes = attr(line(div, 'data-itunesurl'), 'data-itunesurl');
            like.amazon = attr(line(div, 'data-amazondigitalasin'), 'data-amazondigitalasin');
            like.sample = attr(line(div, 'data-sample-url'), 'data-sample-url');
            console.error(like);
        })
    });
}


// get line with matching prefix and split
function line(html, prefix)
{
    var s = html.split('\n');
    for(var i=0; i<s.length; i++) if(trim(s[i]).indexOf(prefix) == 0) return trim(s[i]);
}

function attr(html, key)
{
    if(html.indexOf(key) == -1) return "";
    var a = html.substr(html.indexOf(key)+key.length).split('"');
    if(a.length <= 1) return "";
    return a[1];
}

function text(html, index)
{
    if(html.indexOf('>') == -1 || html.indexOf('<',html.indexOf('>')) == -1) return "";
    if(index > 0) return text(html.substr(html.indexOf('>')+1),index-1);
    return html.slice(html.indexOf('>')+1, html.indexOf('<',html.indexOf('>')));
}

function trim(str) {
    return str.replace(/^\s*/, '').replace(/\s*$/, '');
}