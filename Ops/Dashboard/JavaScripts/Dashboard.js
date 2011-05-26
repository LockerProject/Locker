/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var serviceMap;

// Sections ------------------------------------------------------------------

function switchSection(section)
{
  switch (section)
  {
    case "logs": showLogsSection(); break;
    case "services": showServicesSection(); break;
    default:
      console.log("Unknown section requested (" + section + ")");
      break;
  }
}

// Logs Section --------------------------------------------------------------

function showLogsSection()
{

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

function refreshLog()
{
  $("#logEntriesList").children().remove();
  $.ajax({ url: "/diary" }).success(function(data) {
    var diaryLines = JSON.parse(data);
    diaryLines.forEach(function(item) {
      var ts = item.timestamp.toDate();
      var diaryLine = $("#logEntryTemplate").clone();
      diaryLine.attr("id", "");
      diaryLine.addClass("logEntry");
      diaryLine.children("span").append(ts.strftime("%B %d%o at %H:%MM %P"));
      diaryLine.append(item.message);
      diaryLine.appendTo("#logEntriesList");
      diaryLine.show();
    });
    $("#logsSection").animate({
      scrollTop: $("#logsSection").attr("scrollHeight") - $("#logsSection").height()
    }, 250);
  });
}

// Services Section ----------------------------------------------------------

function showServicesSection()
{

  // Set History
  setLocation("services");

  // Display Section
  $(".tabPage").hide();
  $("#servicesSection").show();
  $("#appsList li, .tab").removeClass("current");
  $("#servicesTab").addClass("current");

}

function selectService(index)
{
  var item = serviceMap.available[index];
  $("#serviceInfo h1").html(item["title"]);
  $("#serviceInfo p").html(item["desc"]);
  $("#availSrcDir").html(item["srcdir"]);
  if (item["provides"]) $("#availProvides").html(item["provides"].join(","));
  $("#connectorInstancesList").children().remove();

  if (item.is == "connector")
  {
    $("#addConnectorInstanceButton a").attr("href", "javascript:installService(" + index + ");");
    $.each(serviceMap.installed, function(key, value) {
      if (value["srcdir"] == item["srcdir"])
        $("#connectorInstancesList").append("<li><span class='title'>" + value["title"] + "</span><span class='identifier'>" + value["id"] +  "</span></li>").click(function(event) {
          window.location.replace("#!/app/" + value.id);
        });
    });
    $("#connectorInstancesSection").show();
    $("#installButton").hide();
  }
  else
  {
    $("#installButton a").attr("href", "javascript:installService(" + index + ");");
    $("#installButton").show();
    $("#connectorInstancesSection").hide();
  }
}

function installService(i)
{
  document.location = "/post2install?id=" + i;
}

// Apps ----------------------------------------------------------------------

function showApp(app, event)
{

  // Set History
  setLocation("app/" + app.id);

  // Display App
  $("#appsList li, .tab").removeClass("current");
  $("#appsList li[data-app-id=" + app.id + "]").addClass("current");
  $(".tabPage").hide();
  $("#appSection").show();
  $("#appTitle").html(app.title);
  // $("#appFrame").attr("src", app.uri || "");
  $("#appFrame")[0].contentWindow.location.replace(app.uri || "");
  $("#zoomAppButton").click(function() { window.open(app.uri) });

}

// History (Location) Management ---------------------------------------------

function setLocation(location)
{
  if (location == getLocation()) return;
  history.pushState({}, "", "#!/" + location);
}

function getLocation()
{
  return document.location.hash.substr(3); // Strip "#!/"
}

window.onpopstate = function(event)
{
  var location = getLocation();
  if (location.match(/^app/))
  {
    var appId = location.substr(4),
        app   = serviceMap.installed[appId];

    if (app) showApp(app);
  }
  else
    switchSection(location);
}

// ---------------------------------------------------------------------------

$(document).ready(function()
{
  var previousLocation = getLocation();

  // Update Interface from Service Map
  $.ajax({ url: "/map", dataType: "json" }).success(function(data) {
    serviceMap = data;

    // Populate Available Services List
    serviceMap.available.forEach(function(item) {
      switch (item.is)
      {
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

    // Populate Installed Apps List
    $.each(serviceMap.installed, function(key, value) {
      var item = value;
      $("#appsList").append($("<li title='" + item.title + "' data-app-id='" + item.id + "'>" + item.title + "</li>").click(function(event) {
        showApp(item, event);
      }));
    });

    // Restore Previously Selected App
    if (previousLocation.match(/^app/))
    {
      var appId = previousLocation.substr(4),
          app   = serviceMap.installed[appId];

      if (app) showApp(app);
    }
  });

  // Setup Section Navigation Observers
  $("#logsTab").click(showLogsSection);
  $("#servicesTab").click(showServicesSection);

  // Restore Previously Selected Section
  if (!previousLocation.match(/^app/))
  {
    if (previousLocation)
      switchSection(getLocation());
    else
      showLogsSection();
  }

});
