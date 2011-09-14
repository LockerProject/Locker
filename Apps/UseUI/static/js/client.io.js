
/// Format a number with commas
/*
* Public domain from http://www.mredkj.com/javascript/nfbasic.html
*/
function addCommas(nStr)
{
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

allCounts = {};

function updateCounts(name, count, updated) {
  updated = updated || 0;
  if (!allCounts.hasOwnProperty(name)) allCounts[name] = {};
  allCounts[name].lastUpdate = updated
  allCounts[name].count= count;
  var msg = addCommas(count) + " " + name + "s";
  $("." + name + "sTotalCount").text(msg);
  $("#" + name).attr("title", msg);
}

var socket = io.connect();
var once = false;

socket.on('event', function (body) {
  console.log("got event: ", body);
  updateCounts(body.name, body.count, body.updated);
  $.gritter.add({
    title:"New " + body.name + "s",
    text:"Got " + body.new + " new " + body.name + "s",
    image: "img/" + body.name + "s.png",
    time:5000
  });
});
socket.on("counts", function(counts) {
  console.log("Counts:",counts);
    for (key in counts) {
        if (counts.hasOwnProperty(key)) {
            updateCounts(key, counts[key].count, counts[key].updated);
        }
    }
    
});