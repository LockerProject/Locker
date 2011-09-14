function log(m) { if (console && console.log) console.log(m); }

var collectionHandle = "";
var resultsTemplate = null;

function queryLinksCollection (queryString) {
    log("Querying: " + $.param({q:queryString||""}));
    $(".dateGroup").remove();
    $("#infoMsg").hide();
    var url = "/Me/" + collectionHandle + "/search?q=" + queryString;
    if (!queryString) url = "/Me/" + collectionHandle + "/getLinksFull?limit=100";
    $.ajax({
      "url": url,
      type: "GET",
      dataType: "json",
      success: function(data) {
        //called when successful
        if (!data || data.length == 0) {
            $("#infoMsg").attr("class", "info");
            $("#infoMsg").text("No results found");
            $("#infoMsg").show();
            return;
        }
        // First we sort it by the at field then we're going to group it by date
        var dateGroups = []; // Array of objectcs matching {date:..., links:[...]}
        var curDate = null;
        var curLinks;
        for (var i = 0; i < data.length; ++i) {
            // We unset all the non compared fields
            var nextDate = new Date;
            nextDate.setTime(parseInt(data[i].at));
            nextDate.setHours(0);
            nextDate.setMinutes(0);
            nextDate.setSeconds(0);
            nextDate.setMilliseconds(0);
            
            // If it's a different date let's start a new group of links
            if (!curDate || nextDate.getTime() != curDate.getTime()) {
                var newDateGroup = {date:nextDate.strftime("%A, %B %d, %Y"), links:[]};
                dateGroups.push(newDateGroup);
                curLinks = newDateGroup.links;
                curDate = nextDate;
            }
            
            curLinks.push(data[i]);
        }
        $("#results").render({groups:dateGroups,groupClass:"dateGroup"}, resultsTemplate);
        $("#results").show();
        $(".viewMore").click(function() {
            if ($(this).text().indexOf("Hide") > 0) {
                $(this).parents(".linkInfo").find(".embedView").hide(250);
                $(this).html("&#9654; View");
            } else {
                var elem = $(this).parents(".linkInfo").find(".embedView");
                var E = $(this);
                $.ajax({
                  url: "/Me/" + collectionHandle + "/embed?url=" + $(this).parents(".linkInfo").find("a").attr("href"),
                  type: "GET",
                  dataType: "json",
                  success: function(data) {
                      if (data.html) {
                          elem.html(data.html);
                      } else if (data.thumbnail_url) {
                          elem.html("<img src='" + data.thumbnail_url + "' /><div>" + data.description||"" + "</div>");
                      } else {
                          elem.html("No preview.");
                      }
                      elem.show(250);
                      E.html("&#x25bc; Hide");
                  },
                  error: function() {

                  }
                });
                E.html("<img src='img/ajax-loader.gif' /> Loading...");
                //$(this).html("&#9654; View");
            }
        });
      },
      error: function() {
        //called when there is an error
      }
    });
}    

function findLinksCollection() {
    log("Finding the collection");
    $.ajax({
      url: "/providers?types=link",
      type: "GET",
      dataType: "json",    
      success: function(data) {
          for (var i = 0; i < data.length; ++i) {
              if (data[i].provides.indexOf("link") > -1 && data[i].is === "collection") {
                  collectionHandle = data[i].id;
                  $("#loading").hide();
                  $("header").show();
                  break;
              }
          }
          // If we couldn't find a collection bail out
          if (collectionHandle === "") {
              showError("Could not find a valid links Collection to display.  Please contact your system administrator.");
              return;
          }
          updateLinkCount();
          queryLinksCollection();
      },
      error: function() {
          showError("Could not find a valid links Collection to display.  Please contact your system administrator.");
      }
    });    
}

function showError(errorMessage) {
    $("#infoMsg").text(errorMessage);
    $("#infoMsg").attr("class", "error");
    $("#infoMsg").show();
    $("#results").hide();
    $("#loading").hide();
}

$(function(){
    resultsTemplate = $p("#results").compile({
        "div.templateDateGroup" : {
            // Loop on each date group
            "group<-groups" : {
                "@class":"groupClass",
                "div.dateInfo":"group.date",
                "div.linkInfo" : {
                    // On each date group we loop the links
                    "link<-group.links": {
                        "img.providerIcon@src":function(arg, item) {
                            var images = {
                                "facebook":"img/facebook.png",
                                "twitter":"img/twitter.png"
                            };
                            return images[arg.item.encounters[arg.item.encounters.length - 1].network];
                        },
                        "div.fullInfo@class+":function(arg) {
                            var theClass = arg.pos % 2 == 0 ? " even" : " odd";
                            if (!arg.item.title && arg.item.link.length < 200) theClass += " shiftDownDesc";
                            return theClass;
                        },
                        "img.favicon@src":"link.favicon",
                        "a":function(arg) {
                            if (arg.item.link.length > 100) {
                                return arg.item.link.substring(0, 100) + "...";
                            } else {
                                return arg.item.link;
                            }
                        },
                        "a@href":"link.link",
                        "div.linkDescription":"link.title",
                        "div.linkFrom":function(arg) {
                            return "From: " + arg.item.encounters.map(function(item) { return item.from; }).join(", ");
                        },
                        "div.linkFrom@style":function(arg) {
                            return arg.item.encounters[arg.item.encounters.length - 1].from ? "" : "display:none";
                        },
                        "span.origLink@style":function(arg) {
                            return arg.item.encounters[arg.item.encounters.length - 1].orig == arg.item.link ? "display:none" : "";
                        },
                        "span.origLink":function(arg) {
                            var orig = arg.item.encounters[arg.item.encounters.length - 1].orig;
                            return orig != arg.item.link ? "(" + orig + ")" : "";
                        }
                    }
                }
            }
        }
    });

    $("#searchForm").submit(function() {
        queryLinksCollection($("#linksQuery").val());
        return false;
    });
    $("#searchReset").click(function() {
        $("#linksQuery").val("");
        queryLinksCollection();
        return false;
    });
    findLinksCollection();
    $("#searchLinks").click(function(){
        queryLinksCollection($("#linksQuery").val());
        return false;
    });
});

function hideMe() {
    $(event.srcElement).hide();
}

function updateLinkCount() {
      $.ajax({
        url: "/Me/" + collectionHandle + "/state",
        type: "GET",
        dataType: "json",
        complete:function() {
            setTimeout(updateLinkCount, 10000);
        },
        success: function(data) {
            $("#linkCounter").text(data.count + " total");
        }
      });
}