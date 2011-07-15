/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var serviceMap;
var unstable = false;

// Sections ------------------------------------------------------------------

function switchSection(section) {
  switch (section) {
    case "logs": showLogsSection(); break;
    case "services": showServicesSection(); break;
    default:
      console.log("Unknown section requested (" + section + ")");
      break;
  }
}

// Logs Section --------------------------------------------------------------

function showLogsSection() {

  // Refresh the Log Data
  refreshLog();

  // Set History
  setLocation("logs");

  // Display Section
  $(".tabPage").hide();
  $("#logsSection").show();
  $("#appsList li, .tab").removeClass("current");
  $("#logsTab").addClass("current");

}

function refreshLog() {
  $("#logEntriesList").children().remove();
  $.ajax({ url: "diary" }).success(function(data) {
    var diaryLines = JSON.parse(data);
    diaryLines.forEach(function(item) {
      var service = serviceMap.installed[item.service];
      var ts = item.timestamp.toDate();
      var diaryLine = $("#logEntryTemplate").clone();
      diaryLine.attr("id", "");
      diaryLine.addClass("logEntry");
      diaryLine.children(".logService").append(service.title || "Unknown").attr("title", service.id || "Unknown Service ID");
      diaryLine.children(".logMessage").append(item.message);
      diaryLine.children(".logTimestamp").append(ts.strftime("%B %d%o at %H:%MM %P"));
      diaryLine.appendTo("#logEntriesList");
      diaryLine.show();
    });
    $("#logsSection").animate({
      scrollTop: $("#logsSection").attr("scrollHeight") - $("#logsSection").height()
    }, 250);
  });
}

// Services Section ----------------------------------------------------------

function showServicesSection() {

  // Set History
  setLocation("services");

  // Display Section
  $(".tabPage").hide();
  $("#servicesSection").show();
  $("#appsList li, .tab").removeClass("current");
  $("#servicesTab").addClass("current");

}

function unstableServices()
{
    unstable = true;
    $("#servicesSection header ul").hide();
    updateServiceMap("",function(){ $("#servicesSection").show();});
}

function selectService(index) {
    var item = serviceMap.available[index];
    $("#serviceInfo h1").html(item["title"]);
    $("#serviceInfo p").html(item["desc"]);
    $("#availType").html(item["is"]);
    $("#availSrcDir").html(item["srcdir"]);
    $("#availProvides").html(item["provides"] ? item["provides"].join(", ") : '');
    $("#connectorInstancesList").children().remove();
    $("#installButton a").attr("href", "javascript:installService(" + index + ");");
    $("#installButton").show();
    $("#connectorInstancesSection").hide();

    if (item.is == "connector") {
        // $("#addConnectorInstanceButton a").attr("href", "javascript:installService(" + index + ");");
        $.each(serviceMap.installed, function(key, value) {
            if (value["srcdir"] == item["srcdir"]) {
                var id = value.id;
                var abled = 'Dis';
                if(value.disabled) {
                    abled = 'En';
                }
                $("#connectorInstancesList").append("<div id='inst-right'>" + 
                                                    "<div id='inst-cont'>" + 
                                                        "<span id='installButton' class='uninstall uninst-" + id + "'><a href='#'>Uninstall</a></span>" + 
                                                    "</div>" +
                                                    "<div id='inst-cont'>" + 
                                                        "<span id='installButton' class='disable disable-" + id + "'><a href='#'>" + abled + "able" +  "</a></span>" + 
                                                    "</div>" +
                                                "</div>" + 
                                                "<li><span id='id-" + id + " class='lihover'> " + 
                                                    "<span class='title'>" + value["title"] + "</span>" + 
                                                    "<span class='identifier'>" + id +  "</span></span>" + 
                                                "</li>");
                $("#connectorInstancesList #id-" + id).click(function(event) {
                    window.location.replace("#!/app/" + id);
                });
                var index = -1;
                for(var i in serviceMap.available) {
                    if(value.handle && serviceMap.available[i].handle === value.handle) {
                        index = i;
                        break;
                    }
                }
                $("#connectorInstancesList div .uninst-" + id + ' a').attr("href", "javascript:uninstallService('" + id + "', '" + value.title + "', " + index + ");");
                $("#connectorInstancesList div .disable-" + id + ' a').attr("href", "javascript:ableService('" + abled + "', '" + id + "', '" + value.title + "', " + index + ");");
            }
        });
        $("#connectorInstancesSection").show();
    }

    $("#serviceInfo").show();
}

function installService(i) {
    $.getJSON("install", {id:i}, function(data, err, resp) {
        if(data && data.success) {
            var svc = data.success;
            var previousLocation = getLocation();
            updateServiceMap(previousLocation, function() {
                showApp(svc);
            });
        } else {
            alert('error:' + JSON.string(data));
        }
    });
}

function uninstallService(svcID, title, index) {
    var resp = confirm('Are you sure you want to delete ' + svcID + '? ' + 
                            'This is NOT REVERSIBLE and will DELETE all of the DATA in your locker associated with this connector!!');
    if(resp) {
        $.getJSON("uninstall", {serviceId:svcID}, function(data, err, resp) {
            if(data && data.success) {
                var previousLocation = getLocation();
                updateServiceMap(previousLocation, function() {
                    setLocation("services");
                    selectService(index);
                    $("#servicesList li").each(function(index) {
                        if($(this).html() === title) {
                            $("#servicesList li").removeClass("current");
                            $(this).addClass("current");
                        }
                    })
                });
            } else {
                alert('error:' + JSON.string(data));
            }
        });
    }
}

function ableService(abled, svcID, title, index) {
    var resp = confirm(abled + 'able service ' + title + '?');
    if(resp) {
        var endpoint = abled.toLowerCase() + 'able';
        $.getJSON(endpoint, {serviceId:svcID}, function(data, err, resp) {
            if(data && data.success) {
                var previousLocation = getLocation();
                updateServiceMap(previousLocation, function() {
                    setLocation("services");
                    selectService(index);
                    $("#servicesList li").each(function(index) {
                        if($(this).html() === title) {
                          $("#servicesList li").removeClass("current");
                          $(this).addClass("current");
                        }
                    })
                });
            } else {
                alert('error:' + JSON.string(data));
            }
        });
    }
}
// Apps ----------------------------------------------------------------------

function showApp(app, event) {

  // Set History
  setLocation("app/" + app.id);

  // Display App
  $("#appsList li, .tab").removeClass("current");
  $("#appsList li[data-app-id=" + app.id + "]").addClass("current");
  $(".tabPage").hide();
  $("#appSection").show();
  $("#appTitle").html(app.title);
  // $("#appFrame").attr("src", app.uri || "");
  $("#appFrame")[0].contentWindow.location.replace(app.externalUri || "");
  $("#zoomAppButton").unbind("click").click(function() { window.open(app.externalUri) });

}

// History (Location) Management ---------------------------------------------

function setLocation(location) {
  if (!history.pushState) return;
  if (location == getLocation()) return;
  history.pushState({}, "", "#!/" + location);
}

function getLocation() {
  return document.location.hash.substr(3); // Strip "#!/"
}

window.onpopstate = function(event) {
  var location = getLocation();
  if (serviceMap && serviceMap.installed && location.match(/^app/)) {
    var appId = location.substr(4),
        app   = serviceMap.installed[appId];

    if (app) showApp(app);
  }
  else
    switchSection(location);
}


function updateServiceMap(previousLocation, callback) {
    // Update Interface from Service Map
    $.ajax({ url: "map", dataType: "json" }).success(function(data) {
      serviceMap = data;

      $("#servicesList").html('');
      // Populate Available Services List
      serviceMap.available.forEach(function(item) {
        if (!item.installable) return;
        if (!unstable && item.status != "stable") return;
        switch (item.is) {
          case "app":
            $("#servicesList").append($("<li class='app' title='" + item.title + "'>" + item.title + "</li>").click(function(event) {
              $("#servicesList li").removeClass("current");
              $(event.target).addClass("current");
              $("#installButton a").html("Install App");
              selectService(serviceMap.available.indexOf(item));
            }));
            break;

          case "connector":
            $("#servicesList").append($("<li class='connector' title='" + item.title + "'>" + item.title + "</li>").click(function(event) {
              $("#servicesList li").removeClass("current");
              $(event.target).addClass("current");
              $("#installButton a").html("Install Connector");
              selectService(serviceMap.available.indexOf(item));
            }));
            break;

          case "collection":
            $("#servicesList").append($("<li class='collection' title='" + item.title + "'>" + item.title + "</li>").click(function(event) {
              $("#servicesList li").removeClass("current");
              $(event.target).addClass("current");
              $("#installButton a").html("Install Collection");
              selectService(serviceMap.available.indexOf(item));
            }));
            break;

          default:
            console.log("Unknown service type \"" + item.is + "\"");
            break;
        }
      });

      
      $("#appsList").html('');
      // Populate Installed Apps List
      $.each(serviceMap.installed, function(key, value) {
        var item = value;
        $("#appsList").append($("<li title='" + item.title + "' data-app-id='" + item.id + "'>" + item.title + "</li>").click(function(event) {
          showApp(item, event);
        }));
      });

      // Restore Previously Selected App
      if (previousLocation.match(/^app/)) {
        var appId = previousLocation.substr(4),
            app   = serviceMap.installed[appId];

        if (app) showApp(app);
      }
      callback();
    });
}
// ---------------------------------------------------------------------------

$(document).ready(function() {
  var previousLocation = getLocation();
  updateServiceMap(previousLocation, function() {
      // Setup Section Navigation Observers
      $("#logsTab").click(showLogsSection);
      $("#servicesTab").click(showServicesSection);

      // Restore Previously Selected Section
      if (!previousLocation.match(/^app/)) {
        if (previousLocation)
          switchSection(getLocation());
        else
          showLogsSection();
      }
  });

});
