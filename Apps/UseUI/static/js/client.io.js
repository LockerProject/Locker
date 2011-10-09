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
  allCounts[name].lastUpdate = updated;
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
    dequeueGritters();
}).blur(function() {
    window_focus = false;
});

var gritterEvents = {};
function queueGritter(name, count, lastId) {
    console.log("Queueing " + name + ", " + count + ", " + lastId);
    if(window_focus) {
        showGritter(name, count, lastId);
    } else {
        if(gritterEvents[name]) {
            gritterEvents[name]["count"] += count;
        } else {
            gritterEvents[name] = {last:lastId, "count":count};
        }
    }
}

function dequeueGritters() {
    for(var i in gritterEvents) {
        if(gritterEvents[i]) {
            showGritter(i, gritterEvents[i].count, gritterEvents[i].last);
            gritterEvents[i] = 0;
        }
    }
}

function showGritter(name, count, lastId) {
    var prettyName = name;
    if (name == 'newservice') {
        var service = count;
        var svclc = service.toLowerCase();
        var customText = "Importing ";
        var img = svclc;
        if(svclc === 'facebook') {
            customText += "friends, statuses, and photos.";
        } else if (svclc === 'twitter') {
            customText += "friends, statuses, and photos.";
        } else if(svclc === 'foursquare') {
            customText += "checkins and photos.";
        } else if(svclc === 'github') {
            customText += "friends.";
        } else if(svclc === 'google contacts') {
            customText += "contacts.";
            img += 'gcontacts.png';
        } else if(svclc === 'flickr') {
            customText += "friends and photos.";
        }
        img = '/img/icons/' + img + '-gritter.png';
      $.gritter.add({
        title:"Connected " + count,
        text:customText,
        // image:img,
        time: 5000
      });
    } else if(name === 'repo') {
        
    } else {
      var prettyName = name;
      if(name == 'contact') {
          if(count > 1) prettyName = 'people';
          else prettyName = 'person';
      } else if(count > 1) {
          prettyName += 's';
      }
      var gritterId = $.gritter.add({
        title:"New " + prettyName,
        text:"Got " + count + " new " + prettyName,
        image: "img/" + name + "s.png",
        time:5000,
        after_open:function(e) {
            var self = this;
            e.click(function(ce) {
              if (ce.target && !$(ce.target).hasClass("gritter-close")) {
                app = name + "s";
                window.location.hash = app;
                console.log("showGritter lastId:" + lastId);
                renderApp("new-" + lastId);
                $.gritter.remove(gritterId);
              }
            })
        }
      });
    }
}

socket.on('event', function (body) {
  log("got event: ", body);
  updateCounts(body.name, body.count, body.updated);
  queueGritter(body.name, body.new, body.lastId);
});

socket.on('newservice', function(name) {
  log('got new service: ', name);
  queueGritter('newservice', name);
});

socket.on('repo', function(repo) {
    console.log('repo', repo);
});

socket.on("counts", function(counts) {
  log("Counts:",counts);
    for (var key in counts) {
        if (counts.hasOwnProperty(key)) {
            updateCounts(key, counts[key].count, counts[key].updated);
        }
    }

});
