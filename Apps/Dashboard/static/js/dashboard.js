/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

function log(m) { if (console && console.log) console.log(m); }

window.serviceMap;
window.unstable = false;

// Sections ------------------------------------------------------------------

function switchSection(section) {
  switch (section) {
    case "home": showSection('home'); break;
    case "connectors": showSection('connectors'); break;
    case "collections": showSection('collections'); break;
    case "apps": showSection('apps'); break;
    case "logs": showSection('logs'); break;
    default:
      log("Unknown section requested (" + section + ")");
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

/*
 * Refresh the Log's entries
 */
function refreshLog() {
    $("#logEntriesList").children().remove();
    $.ajax({ url: "diary" }).success(
        function(data) {
            var diaryLines = JSON.parse(data);
            var diaryItterator = function(item) {
                var service = window.serviceMap.installed[item.service];
                var ts = item.timestamp.toDate();
                var diaryLine = $("#logEntryTemplate").clone();
                diaryLine.attr("id", "");
                diaryLine.addClass("logEntry");
                diaryLine.children(".logService").append(service.title || "Unknown").attr("title", service.id || "Unknown Service ID");
                diaryLine.children(".logMessage").append(item.message);
                diaryLine.children(".logTimestamp").append(ts.strftime("%B %d%o at %H:%MM %P"));
                diaryLine.appendTo("#logEntriesList");
                diaryLine.show();
            };
            diaryLines.forEach(diaryItterator);
            $("#logsSection").animate(
                {
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

function unstableServices(){
    window.unstable = true;
    $("#servicesSection header ul").hide();
    updateServiceMap("",function(){ $("#servicesSection").show();});
}

/* Reveal the details about a service or app
 */
function showDetails(index, section) {
    var item = window.serviceMap.available[index];
    var context = "#"+section+"Section ";

    $(context+ "h1").html(item["title"]);
    $(context+ "p").html(item["desc"]);
    $(context+ ".availType").html(item["is"]);
    $(context+ ".availSrcDir").html(item["srcdir"]);
    var htmlProvides = item["provides"] ? item["provides"].join(", ") : '';
    $(context+ ".serviceInfo .availProvides").html(htmlProvides);
    $(context+ ".connectorInstancesList").children().remove();
    $(context+ ".installButton a").attr("href", "javascript:installService(" + index + ");");
    $(context+ ".installButton").show();
    $(context+ ".connectorInstancesSection").hide();

    // add the connector's instances if applicable
    if (item.is == "connector") {
        // $("#addConnectorInstanceButton a").attr("href", "javascript:installService(" + index + ");");
        $.each(window.serviceMap.installed, 
               function(key, value) {
                   if (value["srcdir"] == item["srcdir"]) {
                       var id = value.id;
                       var abled = 'Dis';
                       if(value.disabled) {
                           abled = 'En';
                       }

                       var connectorInstanceHTML = "" +
                           "<div class='inst-right'>" +
                           "<div class='injst-cont'>" +
                           "<span class='installButton uninstall uninst-" + id + "'><a href='javascript:;'>Uninstall</a></span>" +
                           "</div>" +
                           "<div class='inst-cont'>" +
                           "<span class='installButton disable disable-" + id + "'><a href='javascript:;'>" + abled + "able" +  "</a></span>" +
                           "</div>" +
                           "</div>" +
                           "<li><span id='id-" + id + "' class='lihover'> " +
                           "<span class='title'>" + value["title"] + "</span>" +
                           "<span class='identifier'>" + id +  "</span></span>" +
                           "</li>";
                       $(context+ ".connectorInstancesList").append(connectorInstanceHTML);
                       $(context+ ".connectorInstancesList #id-" + id).slideDown();
                       $(context+ ".connectorInstancesList #id-" + id).parent().click(
                           function(event) {
                               window.location.replace("#!/app/" + id);
                           });
                       var index = -1;
                       for(var i in window.serviceMap.available) {
                           if(value.handle && window.serviceMap.available[i].handle === value.handle) {
                               index = i;
                               break;
                           }
                       }
                       $(context+ ".connectorInstancesList div .uninst-" + id + ' a').attr("href", "javascript:uninstallService('" + id + "', '" + value.title + "', " + index + ");");
                       $(context+ ".connectorInstancesList div .disable-" + id + ' a').attr("href", "javascript:ableService('" + abled + "', '" + id + "', '" + value.title + "', " + index + ");");
                   }
               });
        $(context+ ".connectorInstancesSection").show();
    }

    $(context+ ".serviceInfo").show();
}

function installService(i) {
    $.getJSON("install", {id:i},
              function(data, err, resp) {
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
        $.getJSON("/uninstall", {serviceId:svcID},
                  function(data, err, resp) {
                      if(data && data.success) {
                          var previousLocation = getLocation();
                          updateServiceMap(previousLocation, function() {
                                               setLocation("services");
                                               showDetails(index, "service");
                                               $("#servicesList li").each(
                                                   function(index) {
                                                       if($(this).html() === title) {
                                                           $("#servicesList li").removeClass("current");
                                                           $(this).addClass("current");
                                                       }
                                                   });
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
        $.getJSON('/' + endpoint, {serviceId:svcID},
                  function(data, err, resp) {
                      if(data && data.success) {
                          var previousLocation = getLocation();
                          updateServiceMap(previousLocation,
                                           function() {
                                               setLocation("services");
                                               showDetails(index, "service");
                                               $("#servicesList li").each(
                                                   function(index) {
                                                       if($(this).html() === title) {
                                                           $("#servicesList li").removeClass("current");
                                                           $(this).addClass("current");
                                                       }
                                                   });
                                           });
                      } else {
                          alert('error:' + JSON.string(data));
                      }
                  });
    }
}


// Generic
function showSection(name) {
    // Set History
    setLocation(name);

    // Display Section
    $(".tabPage").hide();
    $("#"+name+"Section").show();
    $("#appsList li, .tab").removeClass("current");
    $("#"+name+"Tab").addClass("current");
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
    $("#zoomAppButton").unbind("click").click(function() { window.open(app.externalUri); });
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
    if (window.serviceMap && window.serviceMap.installed && location.match(/^app/)) {
        var appId = location.substr(4),
        app   = window.serviceMap.installed[appId];

        if (app) showApp(app);
    } else {
        switchSection(location);
    }
};

function updateServiceMap(previousLocation, callback) {
    // Update Interface from Service Map
    $.ajax({ url: "/map", dataType: "json" }).success(
        function(data) {
            var installedSrcDirs = [];
            window.serviceMap = data;

            $("#connectorsList").html('');
            $("#appsList").html('');

            // Populate Apps Tab with installed apps first
            var populateInstalledApps = function(key, value) {
                var item = value;
                if (item.is == "app") {
                    $("#appsList").append($("<li title='" + item.title + "' data-app-id='" + item.id + "'>" + item.title + "</li>").click(
                                              function(event) {
                                                  log("Launching app..");
                                                  showApp(item, event);
                                              }));
                    installedSrcDirs.push(item.srcdir);
                }
            };
            $.each(window.serviceMap.installed, populateInstalledApps);

            // Populate Available Services List
            window.serviceMap.available.forEach(
                function(item) {
                    if (!item.installable && item.is != "collection") return;
                    if (!window.unstable && item.status != "stable") return;

                    switch (item.is) {
                    case "app":
                        // prevent installed apps from showing up twice in view
                        if (installedSrcDirs.indexOf(item.srcdir) != -1 ) return;

                        var li = $("<li class='app' title='" + item.title + "'>" + item.title + "</li>");
                        li.click(
                            function(event) {
                                $("#appsList li").removeClass("current");
                                $(event.target).addClass("current");
                                $("#installButton a").html("Install App");
                                showDetails(window.serviceMap.available.indexOf(item), 'apps');
                            }
                        );
                        $("#appsList").append(li);
                        break;

                    case "connector":
                        $("#connectorsList").append($("<li class='connector' title='" + item.title + "'>" + item.title + "</li>").click(
                                                        function(event) {
                                                            $("#connectorsList li").removeClass("current");
                                                            $(event.target).addClass("current");
                                                            $("#installButton a").html("Install Connector");
                                                            showDetails(window.serviceMap.available.indexOf(item), 'connectors');
                                                        }));
                        break;

                    case "collection":
                        $("#collectionsList").append($("<li class='collection' title='" + item.title + "'>" + item.title + "</li>").click(
                                                         function(event) {
                                                             $("#collectionsList li").removeClass("current");
                                                             $(event.target).addClass("current");
                                                             $("#installButton a").html("Install Collection");
                                                             showDetails(window.serviceMap.available.indexOf(item));
                                                         }));
                        break;

                    default:
                        log("Unknown service type \"" + item.is + "\"");
                        break;
                    }
                });
           
            // Restore Previously Selected App
            if (previousLocation.match(/^app/)) {
                var appId = previousLocation.substr(4),
                app = window.serviceMap.installed[appId];

                if (app) showApp(app);
            }
            callback();
        });
}
// ---------------------------------------------------------------------------

$(document).ready(
    function() {
        var previousLocation = getLocation();
        updateServiceMap(previousLocation,
                         function() {
                             // Setup Section Navigation Observers
                             $("#logsTab").click(showLogsSection);
                             $("#logo").click(function() {showSection('home');});

                             $("#homeTab").click(function() {showSection('home');});
                             $("#connectorsTab").click(function() {showSection('connectors');});
                             $("#collectionsTab").click(function() {showSection('collections');});
                             $("#appsTab").click(function() {showSection('apps');});

                             $("#showUnstableConnectorsCheckbox, #showUnstableAppsCheckbox").change(function(e) {
                                                                                                        unstable = e.currentTarget.value=="on";
                                                                                                        updateServiceMap("", function() {});
                                                                                                    });

                             // Restore Previously Selected Section
                             if (!previousLocation.match(/^app/)) {
                                 if (previousLocation)
                                     switchSection(getLocation());
                                 else
                                     showSection('home');
                             }
                         });
    });
