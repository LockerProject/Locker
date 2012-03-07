
$(function() {
  var apiData;
  var curAPI;
  var models = {};

  $("#testButton").click(function(e) {
    var path = curAPI.path;
    console.log("Start path " + path);
    var queryParams = "";
    if (curAPI.operations[0].parameters) {
      $.each(curAPI.operations[0].parameters, function(key, val) {
        switch(val.paramType) {
        case "path":
          var inputVal;
          if(val.options && val.options.length > 0) {
            inputVal = $("select[name$='" + val.name + "'] option:selected").val();
          } else {
            inputVal =  $("input[name$='" + val.name + "']").val();
          }
          path = path.replace("{" + val.name + "}", inputVal);
          break;
        case "query":
          var inputVal;
          if(val.options && val.options.length > 0) {
            inputVal = $("select[name$='" + val.name + "'] option:selected").val();
          } else {
            inputVal = $("input[name$='" + val.name + "']").val();
          }
          if (inputVal) {
            if (queryParams.length > 0) queryParams += "&";
            queryParams += val.name + "=" + inputVal;
          }
          break;
        default:
          console.log("Unknown paramType" + val.paramType);
          break;
        }
      });
      if (queryParams.length > 0) path = path + "?" + queryParams;
    }
    $("input[type=button]").attr('disabled', true);
    // $(".prettyprint code").text("Loading...");
    $("#fullTestURL").text(callBase+path);
    $("#fullTestURL").attr("href",callBase+path);
    $("#testInfo").show();
    if (curAPI.operations[0].responseClass == "[Image]") {
      $("#testResultImage").attr("src", path);
      $("#testResultImage").show();
      $(".prettyprint").hide();
    } else {
      $(".prettyprint").show();
      $("#testResultImage").hide();
      $.getJSON(path, function(testData) {
        console.log("Full length is " + testData.length)
        var hasMore = false;
        if (testData.length && testData.length > 20) {

          $("#limitedResults").text("Results were limited to 20 entries.  " + (testData.length - 20) + " were hidden.").show();
          testData = testData.splice(0, 20);
        } else {
          $("#limitedResults").hide();
        }
        $(".prettyprint code").text(JSON.stringify(testData, undefined, 2));
        prettyPrint();
        $("input[type=button]").attr('disabled', false);
      }).error(function(error) {
        console.log("We got an error");
        $(".prettyprint code").text(error.responseText);
        prettyPrint();
        $("input[type=button]").attr('disabled', false);
      });
    }
    return false;
  });

  $("#curMethod").change(function() {
    $("#testInfo").hide();
    var data = $(this + "option:selected").data();
    curAPI = data;
    $(".prettyprint code").text("Loading...");
    $("h2.path").text(data.path);
    $(".operationDescription").html(data.description);
    if (data.operations[0].notes) {
      $("div.notes").html(data.operations[0].notes);
      $("div.notesBlock").show();
    } else {
      $("div.notesBlock").hide();
    }
    if (data.operations[0].parameters) {
      $("div.parameters").show();
      $("#testParameters").show();
      $("#testParametersSelect").show();
      $("div.parameters ul").find("li:gt(0)").remove();
      $("#testParameters").find("div:gt(0)").remove();
      $("#testParametersSelect").find("div:gt(0)").remove();
      $("#methodTemplate div.parameters ul").render(data.operations[0], {
        "li":{
          "param<-parameters":{
            "span.paramName":"param.name",
            "span.paramType":"param.dataType",
            "span.paramDescription":"param.description"
          }
        }
      });

      var selectCount = 0;
      for(var i in data.operations[0].parameters) {
        if(data.operations[0].parameters[i].options && data.operations[0].parameters[i].options.length > 0)
          selectCount++;
      }
      if(selectCount > 0) {
        $("div#testParametersSelect ").render(data.operations[0], {
            "div.testParam":{
              "param<-parameters":{
                "span.paramName":"param.name",
                "select@name":"_#{param.name}",
                "select": function(a) {
                    var text = "";
                    var options = a.item.options;
                    for(var i in options)
                        text += "<option>" + options[i] + "</option>";
                    return text;
                }
              },
              filter: function(a) {
                  return typeof a.item.options == 'object' && a.item.options.length > 0;
              }
            }
          });
        } else {
          $("#testParametersSelect").hide();
        }
        if(selectCount < data.operations[0].parameters.length) {
          $("div#testParameters ").render(data.operations[0], {
            "div.testParam":{
              "param<-parameters":{
                "span.paramName":"param.name",
                "input@name":"_#{param.name}",
                "input@value":"param.default",
                "span.testExample": "param.example"
              },
              filter: function(a) {
                  return !a.item.options;
              }
            }
          });
        }
    } else {
      $("div.parameters").hide();
      $("#testParameters").hide();
      $("#testParametersSelect").hide();
    }
    if (data.operations[0].responseClass && data.operations[0].responseClass.indexOf("[") == -1) {
      $("ul.resultEntry").find("li:gt(0)").remove();
      $("#methodTemplate ul.resultEntry").render(models[data.operations[0].responseClass].responseClass, {
        "li":{
          "result<-properties":{
            "@class":function(arg) {
              return "liveRow";
            },
            "span.paramName":function(arg) {
              return arg.pos;
            },
            "span.paramType":function(arg) {
              return arg.item.type;
            },
            "span.paramDescription":function(arg) {
              return arg.item.description;
            }
          }
        }
      });
      $("div.resultModel").show();
    } else {
      $("div.resultModel").hide();
    }
    return false;
  });

  $.getJSON("resources.json", function(data) {
    apiData = data;
    data.apis.sort(function(lh, rh) {
      return lh.path.localeCompare(rh.path);
    });
    $.each(data.apis, function(key, value) {
      var path = data.apis[key].path;
      $("<option>", {value:path}).text(path).data(value).appendTo($("#curMethod"))
    });
    $.each(data.models, function(key, value) {
      models[value.name] = value;
    });
    $('#curMethod').change();
  });
});


$.ajaxSetup({
    xhrFields: {
       withCredentials: true
    },
    crossDomain: true
});
var callBase = window.location.protocol+"//"+window.location.host;

if (document.location.hostname.substr(0,3) == 'me.') {
    var host = document.location.hostname.substr(3);
    $.getJSON('https://'+host+'/users/me/apiToken', function(token){
      if(!token || !token.apiToken) return;
        callBase = 'https://api.'+host+'/'+token.apiToken;
    });
}

