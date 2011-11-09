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
var unseenCount = {"links":{count:0, lastId:undefined}, "contacts":{count:0, lastId:undefined}, "photos":{count:0, lastId:undefined},"places":{count:0,lastId:undefined}};

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

var frame_focus = false;
var window_focus = false;
$(document).ready(function() {
  // detect window focus changes
  $(window).focus(function() {
      window_focus = true;
      dequeueGritters();
  }).blur(function() {
    window_focus = false;
  });

  $("#appFrame").load(function() {
    $(window.frames["appFrame"].window).focus(function() {
      frame_focus = true;
      dequeueGritters();
    }).blur(function() {
      frame_focus = false;
    })
  });
});

var gritterEvents = {};
function queueGritter(name, count, lastId) {
    console.log("Queueing " + name + ", " + count + ", " + lastId);
    if(window_focus || frame_focus) {
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

function clearUnseen(app) {
  unseenCount[app].count = 0;
  unseenCount[app].lastId = undefined;
}

function showGritter(name, arg, lastId) {
    var prettyName = name;
    if (name == 'syncgithub') {
        $.gritter.add({
            title:"Syncing viewers",
            text:"We're syncing viewers from your github account, should be available shortly!",
            time: 5000
        });
    } else if (name == 'newservice') {
        var service = arg;
        var svclc = service.provider.toLowerCase();
        var customText = "Importing ";
        var img = svclc;
        if(svclc === 'facebook') {
            customText += "friends, statuses, and photos.";
        } else if (svclc === 'twitter') {
            customText += "friends, statuses, and photos.";
        } else if(svclc === 'foursquare') {
            customText += "checkins and photos.";
        } else if(svclc === 'github') {
            customText += "friends and viewers.";
        } else if(svclc === 'instagram') {
            customText += "friends and photos.";
        } else if(svclc === 'gcontacts') {
            customText += "contacts.";
            img += 'gcontacts.png';
        } else if(svclc === 'flickr') {
            customText += "friends and photos.";
        }
        img = '/img/icons/' + img + '-gritter.png';
      $.gritter.add({
        title:"Connected " + service.title,
        text:customText,
        // image:img,
        time: 5000
      });
    } else if(name === 'viewer') {
        drawServices();
        drawViewers();
        var action = (arg.action === 'update'? 'Updated' : 'New');
        var arg = arg.obj.data
        var gritterId = $.gritter.add({
          title: action + " " + arg.viewer.charAt(0).toUpperCase() + arg.viewer.slice(1)+" Viewer",
          text:arg.id,
          image: "img/Collections.png",
          time:10000,
          after_open:function(e) {
              var self = this;
              e.click(function(ce) {
                if (ce.target && !$(ce.target).hasClass("gritter-close")) {
                    app = arg.viewer;
                    window.location.hash = app;
                    var appId = arg.id.replace("/", "-");
                    setViewer(app, appId, function(){
                        renderApp();
                    });
                    $("#viewers-hide-show").click();
                    $.gritter.remove(gritterId);
                }
              })
          }
        });
    } else {
      var prettyName = name;
      if(name == 'contact') {
          if(unseenCount[name + "s"].count > 1) prettyName = 'people';
          else prettyName = 'person';
      } else if(unseenCount[name + "s"].count > 1) {
          prettyName += 's';
      }
      var gritterId = $.gritter.add({
        title:"New " + prettyName,
        text:"Got " + unseenCount[name + "s"].count + " new " + prettyName,
        image: "img/" + name + "s.png",
        time:5000,
        after_open:function(e) {
            var self = this;
            e.click(function(ce) {
              if (ce.target && !$(ce.target).hasClass("gritter-close")) {
                app = name + "s";
                window.location.hash = app;
                console.log("showGritter lastId:" + lastId);
                renderApp("new-" + unseenCount[name + "s"].lastId);
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
  unseenCount[body.name + "s"].count += body.new;
  if (unseenCount[body.name + "s"].lastId === undefined) unseenCount[body.name + "s"].lastId = body.lastId;
  queueGritter(body.name, body.new, body.lastId);
});

socket.on('newservice', function(service) {
  log('got new service: ', service);
  queueGritter('newservice', service);
  if (window.guidedSetup) window.guidedSetup.serviceConnected();
});

socket.on('viewer', function(evt) {
    queueGritter('viewer', evt);
});

socket.on("counts", function(counts) {
  log("Counts:",counts);
    for (var key in counts) {
        if (counts.hasOwnProperty(key)) {
            updateCounts(key, counts[key].count, counts[key].updated);
        }
    }

});
