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
  var msg = addCommas(count);
  $("." + name + "sTotalCount").text(msg);
  $("#" + name).attr("title", msg);
  $(".app-link-floater").css("margin-bottom", "-10px");
  $(".app-link-centerer").css("height", "20px");
  $(".buttonCounter").show();
}

var socket = io.connect();
var once = false;


// detect window focus changes
var window_focus = true;
$(window).focus(function() {
    window_focus = true;
    log('window_focus =', window_focus);
    dequeueGritters();
}).blur(function() {
    window_focus = false;
    log('window_focus =', window_focus);
});

var gritterEvents = {};
function queueGritter(name, count) {
    log('queueGritter window_focus =', window_focus);
    if(window_focus) {
        showGritter(name, count);
    } else {
        if(gritterEvents[name]) {
            gritterEvents[name] += count;
        } else {
            gritterEvents[name] = count;
        }
    }
}

function dequeueGritters() {
    for(var i in gritterEvents) {
        if(gritterEvents[i]) {
            showGritter(i, gritterEvents[i]);
            gritterEvents[i] = 0;
        }
    }
}

function showGritter(name, count) {
    var prettyName = name;
    if (name == 'newservice') {
      $.gritter.add({
        title:"Authorized " + count,
        text:"Beginning to aggregate data from this source.",
        time: 5000
      });
    } else {
      if(name == 'contact') {
          if(count > 1) prettyName = 'people';
          else prettyName = 'person';
      } else if(count > 1) {
          prettyName += 's';
      }
      $.gritter.add({
        title:"New " + prettyName,
        text:"Got " + count + " new " + prettyName,
        image: "img/" + name + "s.png",
        time:5000
      });
    }
}

socket.on('event', function (body) {
  log("got event: ", body);
  updateCounts(body.name, body.count, body.updated);
  queueGritter(body.name, body.new);
});

socket.on('newservice', function(name) {
  log('got new service: ', name);
  queueGritter('newservice', name);
});

socket.on("counts", function(counts) {
  log("Counts:",counts);
    for (key in counts) {
        if (counts.hasOwnProperty(key)) {
            updateCounts(key, counts[key].count, counts[key].updated);
        }
    }

});
