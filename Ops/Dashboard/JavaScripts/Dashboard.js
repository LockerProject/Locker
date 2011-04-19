
var serviceMap;

function selectAvailable(index) {
    var item = serviceMap.available[index];
    $("#availInfo h1").html(item["title"]);
    $("#availInfo p").html(item["desc"]);
    $("#availInfo .availSrcDir").html(item["srcdir"]);
    if (item["provides"]) $("#availInfo .availProvides").html(item["provides"].join(","));
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

$(document).ready(function()
{
  $.ajax({url:"/map", dataType:"json"}).success(function(data) {
      serviceMap = data;
      for (var key in serviceMap.installed) {
          var item = serviceMap.installed[key];
          $("#installed").append("<tr><td>" + item["title"] + "</td><td>" + item["id"] +  "</td><td><a href='" + item["uri"] + "'>page</a></td></li>");
          $("#services").append("<li>" + item["title"] + "</li>");
      }
      serviceMap.available.forEach(function(item) {
          $("#availList").append($("<p>" + item["title"]+"</p>").click(function() {
              selectAvailable(serviceMap.available.indexOf(item));
          }));
      });
      selectAvailable(0);
  });

  refreshDiary();

  $("#servicesTab").click(function()
  {
    $(".tabPage").hide();
    $("#servicesSection").show();
    $(".tab").removeClass("current");
    $("#servicesTab").addClass("current");
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
    } else {
      $("#available").slideUp(250, function() {
        // $("#installer").text("Install another service");
        $("#available").hide();
      });
    }
  });

});
