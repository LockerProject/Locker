/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var serviceMap;

function selectAvailable(index) {
    var item = serviceMap.available[index];
    $("#availInfo h1").html(item["title"]);
    $("#availInfo p").html(item["desc"]);
    $("#availSrcDir").html(item["srcdir"]);
    if (item["provides"]) $("#availProvides").html(item["provides"].join(","));
    $("#availInstall").attr("href", "javascript:install(" + index + ");");
}

function refreshDiary()
{
  $("#diaryLines").children().remove();
  $.ajax({url:"/diary"}).success(function(data) {
    data.split("\n").forEach(function(item) {
      if (!item) return;
      var line = JSON.parse(item);
      if (!line || line.length == 0) return;
      var ts = line["timestamp"].toDate();
      var diaryLine = $("#diaryTemplate").clone();
      diaryLine.attr("id", "");
      diaryLine.addClass("diaryLine");
      diaryLine.children("span").append(ts.strftime("%B %d%o at %H:%MM %P"));
      diaryLine.append(line["message"]);
      diaryLine.appendTo("#diaryLines");
      diaryLine.show();
    });
    $("#diarySection").animate({scrollTop:$("#diarySection").attr("scrollHeight") - $("#diarySection").height()}, 250);
  });
}

function install(i)
{
    document.location = "/post2install?id="+i;
}

$(document).ready(function()
{
  $.ajax({url:"/map", dataType:"json"}).success(function(data) {
      serviceMap = data;
      for (var key in serviceMap.installed) {
          var item = serviceMap.installed[key];
          $("#installedServices").append("<li><span class='title'>" + item["title"] + "</span><span class='identifier'>" + item["id"] +  "</span><span class='page'><a href='" + item["uri"] + "'>Configure</a></span></li>");
          $("#services").append("<li>" + item["title"] + "</li>");
      }
      serviceMap.available.forEach(function(item) {
          $("#availList").append($("<li>" + item["title"] + "</li>").click(function(event) {
              $("#availList li").removeClass("current");
              $(event.target).addClass("current");
              selectAvailable(serviceMap.available.indexOf(item));
          }));
      });
      selectAvailable(0);
  });

  refreshDiary();

  $("#adaptersTab").click(function()
  {
    $(".tabPage").hide();
    $("#adaptersSection").show();
    $(".tab").removeClass("current");
    $("#adaptersTab").addClass("current");
  });

  $("#collectionsTab").click(function()
  {
    $(".tabPage").hide();
    $("#collectionsSection").show();
    $(".tab").removeClass("current");
    $("#collectionsTab").addClass("current");
  });

  $("#diaryTab").click(function()
  {
    $(".tabPage").hide();
    $("#diarySection").show();
    $(".tab").removeClass("current");
    $("#diaryTab").addClass("current");
  });

  $("#installer").click(function() {
    if ($("#available").is(":hidden")) {
      $("#available").slideDown(250, function() {
        // $("#installer").text("Hide installer")
      });
      $("#installedServices").animate(
        {
          top: "270px"
        },
        {
          duration: 250
        }
      );
    } else {
      $("#available").slideUp(250, function() {
        // $("#installer").text("Install another service");
        $("#available").hide();
      });
      $("#installedServices").animate(
        {
          top: "50px"
        },
        {
          duration: 250
        }
      );
    }
  });

});
