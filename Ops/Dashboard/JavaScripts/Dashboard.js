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
  $("#connectorInfo h1").html(item["title"]);
  $("#connectorInfo p").html(item["desc"]);
  $("#availSrcDir").html(item["srcdir"]);
  if (item["provides"]) $("#availProvides").html(item["provides"].join(","));
  $("#addConnectorInstanceButton a").attr("href", "javascript:install(" + index + ");");
  $("#connectorInstancesList").children().remove();
  $.each(serviceMap.installed, function(key, value) {
    if (value["srcdir"] == item["srcdir"])
      $("#connectorInstancesList").append("<li><span class='title'>" + value["title"] + "</span><span class='identifier'>" + value["id"] +  "</span><span class='page'><a href='" + value["uri"] + "'><img src='Images/Configure.png' /></a></span></li>");
  });
}

function refreshDiary()
{
  $("#diaryEntriesList").children().remove();
  $.ajax({ url: "/diary" }).success(function(data) {
    data.split("\n").forEach(function(item) {
      if (!item) return;
      var line = JSON.parse(item);
      if (!line || line.length == 0) return;
      var ts = line["timestamp"].toDate();
      var diaryLine = $("#diaryEntryTemplate").clone();
      diaryLine.attr("id", "");
      diaryLine.addClass("diaryEntry");
      diaryLine.children("span").append(ts.strftime("%B %d%o at %H:%MM %P"));
      diaryLine.append(line["message"]);
      diaryLine.appendTo("#diaryEntriesList");
      diaryLine.show();
    });
    $("#diarySection").animate({
      scrollTop: $("#diarySection").attr("scrollHeight") - $("#diarySection").height()
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
          $("#appsList").append($("<li>" + item.title + "</li>").click(function(event) {
            $("#appsList li, .tab").removeClass("current");
            $(event.target).addClass("current");
            // selectAvailable(serviceMap.available.indexOf(item));

            $(".tabPage").hide();
            $("#appSection").show();
            // $("#appsList li, .tab").removeClass("current");
            // $("#appTab").addClass("current");

            $("#appTitle").html(item.title);
            $("#appFrame").attr("src", item.uri || "");
          }));
          break;

        case "connector":
          $("#connectorsList").append($("<li>" + item.title + "</li>").click(function(event) {
            $("#connectorsList li").removeClass("current");
            $(event.target).addClass("current");
            selectAvailable(serviceMap.available.indexOf(item));
          }));
          break;

        case "collection":
          $("#collectionsList").append($("<li><span class='title'>" + item.title + "</span><span class='description'>" + item.desc + "</span></li>").click(function(event) {
            $("#collectionsList li").removeClass("current");
            $(event.target).addClass("current");
            selectAvailable(serviceMap.available.indexOf(item));
          }));
          break;

        default:
          console.log("Unknown service type \"" + item.is + "\"");
          break;
      }
    });
    selectAvailable(0);
  });

  refreshDiary();

  $("#connectorsTab").click(function()
  {
    $(".tabPage").hide();
    $("#connectorsSection").show();
    $("#appsList li, .tab").removeClass("current");
    $("#connectorsTab").addClass("current");
  });

  $("#collectionsTab").click(function()
  {
    $(".tabPage").hide();
    $("#collectionsSection").show();
    $("#appsList li, .tab").removeClass("current");
    $("#collectionsTab").addClass("current");
  });

  $("#diaryTab").click(function()
  {
    $(".tabPage").hide();
    $("#diarySection").show();
    $("#appsList li, .tab").removeClass("current");
    $("#diaryTab").addClass("current");
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
