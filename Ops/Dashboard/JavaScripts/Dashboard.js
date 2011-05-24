/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var serviceMap;

function selectAvailable(index)
{
  var item = serviceMap.available[index];
  $("#serviceInfo h1").html(item["title"]);
  $("#serviceInfo p").html(item["desc"]);
  $("#availSrcDir").html(item["srcdir"]);
  if (item["provides"]) $("#availProvides").html(item["provides"].join(","));
  $("#connectorInstancesList").children().remove();

  if (item.is == "connector")
  {
    $("#addConnectorInstanceButton a").attr("href", "javascript:install(" + index + ");");
    $.each(serviceMap.installed, function(key, value) {
      if (value["srcdir"] == item["srcdir"])
        $("#connectorInstancesList").append("<li><span class='title'>" + value["title"] + "</span><span class='identifier'>" + value["id"] +  "</span><span class='page'><a href='" + value["uri"] + "'><img src='Images/Configure.png' /></a></span></li>");
    });
    $("#connectorInstancesSection").show();
    $("#installButton").hide();
  }
  else
  {
    $("#installButton a").attr("href", "javascript:install(" + index + ");");
    $("#installButton").show();
    $("#connectorInstancesSection").hide();
  }
}

function refreshLog()
{
  $("#logEntriesList").children().remove();
  $.ajax({ url: "/diary" }).success(function(data) {
    data.split("\n").forEach(function(item) {
      if (!item) return;
      var line = JSON.parse(item);
      if (!line || line.length == 0) return;
      var ts = line["timestamp"].toDate();
      var diaryLine = $("#logEntryTemplate").clone();
      diaryLine.attr("id", "");
      diaryLine.addClass("logEntry");
      diaryLine.children("span").append(ts.strftime("%B %d%o at %H:%MM %P"));
      diaryLine.append(line["message"]);
      diaryLine.appendTo("#logEntriesList");
      diaryLine.show();
    });
    $("#logsSection").animate({
      scrollTop: $("#logsSection").attr("scrollHeight") - $("#logsSection").height()
    }, 250);
  });
}

function install(i)
{
  document.location = "/post2install?id=" + i;
}

$(document).ready(function()
{

  // Update Interface from Service Map
  $.ajax({ url: "/map", dataType: "json" }).success(function(data) {
    serviceMap = data;

    serviceMap.available.forEach(function(item) {
      switch (item.is)
      {
        case "app":
          $("#servicesList").append($("<li class='app' title='" + item.title + "'>" + item.title + "</li>").click(function(event) {
            $("#servicesList li").removeClass("current");
            $(event.target).addClass("current");
            $("#installButton a").html("Install App");
            selectAvailable(serviceMap.available.indexOf(item));
          }));
          break;

        case "connector":
          $("#servicesList").append($("<li class='connector' title='" + item.title + "'>" + item.title + "</li>").click(function(event) {
            $("#servicesList li").removeClass("current");
            $(event.target).addClass("current");
            selectAvailable(serviceMap.available.indexOf(item));
          }));
          break;

        case "collection":
          $("#servicesList").append($("<li class='collection' title='" + item.title + "'>" + item.title + "</li>").click(function(event) {
            $("#servicesList li").removeClass("current");
            $(event.target).addClass("current");
            $("#installButton a").html("Install Collection");
            selectAvailable(serviceMap.available.indexOf(item));
          }));
          break;

        default:
          console.log("Unknown service type \"" + item.is + "\"");
          break;
      }
      if (item.uri)
      {
        $("#appsList").append($("<li class='' title='" + item.title + "'>" + item.title + "</li>").click(function(event) {
          $("#appsList li, .tab").removeClass("current");
          $(event.target).addClass("current");
          $(".tabPage").hide();
          $("#appSection").show();
          $("#appTitle").html(item.title);
          $("#appFrame").attr("src", item.uri || "");
          $("#zoomAppButton").click(function() { window.open(item.uri) });
        }));
      }
    });
    selectAvailable(0);
  });

  refreshLog();

  $("#servicesTab").click(function()
  {
    $(".tabPage").hide();
    $("#servicesSection").show();
    $("#appsList li, .tab").removeClass("current");
    $("#servicesTab").addClass("current");
  });

  $("#collectionsTab").click(function()
  {
    $(".tabPage").hide();
    $("#collectionsSection").show();
    $("#appsList li, .tab").removeClass("current");
    $("#collectionsTab").addClass("current");
  });

  $("#logsTab").click(function()
  {
    $(".tabPage").hide();
    $("#logsSection").show();
    $("#appsList li, .tab").removeClass("current");
    $("#logsTab").addClass("current");
  });

  // $("#installer").click(function() {
  //   if ($("#available").is(":hidden")) {
  //     $("#available").slideDown(250, function() {
  //       // $("#installer").text("Hide installer")
  //     });
  //     $("#installedServices").animate(
  //       {
  //         top: "270px"
  //       },
  //       {
  //         duration: 250
  //       }
  //     );
  //   } else {
  //     $("#available").slideUp(250, function() {
  //       // $("#installer").text("Install another service");
  //       $("#available").hide();
  //     });
  //     $("#installedServices").animate(
  //       {
  //         top: "50px"
  //       },
  //       {
  //         duration: 250
  //       }
  //     );
  //   }
  // });

});
