var defaultApp = 'contactsviewer';
var specialApps = {
    "allApps" : "allApps",
    "publish" : "publish",
    "viewAll" : "viewAll",
    // "exploreApps" : "exploreApps",
    // "registryApp" : "registryApp",
    "connect" : "connect"
};
var defaultSubSections = {};
var loggedIn = true;

$(document).ready(function() {
    $.history.init(function(hash){
        if(hash == "") {
            // initialize your app
            loadDiv(window.location.hash.substring(1) || $('.installed-apps a').data('id') || defaultApp);
        } else {
            loadDiv(window.location.hash.substring(1) || $('.installed-apps a').data('id') || defaultApp);
        }
    }, { unescape: ",/" });

  $('body').delegate('.install', 'click', function(e) {
    var $e = $(e.currentTarget);
    var id = $e.attr('id');
    $.get('/registry/add/' + id, function() {
      window.location = 'you#You-' + id;
    });
    return false;
  });

  $('body').delegate('.oauthLink','click', function(e) {
    var options = "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no";
    var popup = window.open($(this).attr('href'), "account", options);
    popup.focus();
    return false;
  });

  $('.your-apps').click(function() {
    $('.blue').removeClass('blue');
    $(this).addClass('blue');
    if (document.getElementById('appFrame').contentWindow.filterItems) {
      document.getElementById('appFrame').contentWindow.filterItems($(this).attr('id'));
    }
  });

  var modalClosed = true;
  function doModal(sectionNum) {
    if (!modalClosed) return;
    modalClosed = false;
    var modal = $('#basic-modal-content').modal({onClose: function (dialog) {
      modalClosed = true;
      $.modal.close();
    }});
    $('#simplemodal-overlay,#no-thanks,#close-button,#close-this,.gotit-button').click(function(e) {
      $.cookie("firstvisit", null, {path: '/' });
      modal.close();
    });
  }

  if (window.location.hash !== '#You-connect' && $.cookie("firstvisit") === 'true') {
      doModal();
  }
});

var loadApp = function(info) {
  var app = info.subSection || info.topSection;
  $('iframe#appFrame').show();
  $('div#appFrame').hide();
  $('.app-details').hide();
  if (specialApps[app]) {
    $("#appFrame")[0].contentWindow.location.replace(specialApps[app] + '?params=' + info.params);
  } else if (app === "connect") {
    $("#appFrame")[0].contentWindow.location.replace('/Dashboard/connect');
  } else {
    $.get('clickapp/' + app, function(e) {});
    $("#appFrame")[0].contentWindow.location.replace('/Me/' + app);
  }

  $('.iframeLink[data-id="' + info.app + '"]').parent('p').siblings().show();
};

var syncletInstalled = function(provider) {
  if (provider === 'github') {
    $('.your-apps').show();
  }
  var link = $('.oauthLink[data-provider="' + provider + '"]');
  if($('div#appFrame').is(':visible')) {
    link.each(function(index, element) {
      element = $(element);
      var nxt = element.next('span');
      if(!nxt.length) nxt = element.prev('span');
      nxt.remove();
      element.remove();
    })
  } else {
    var connectedList = $('.sidenav-items.synclets-connected');
    // \n's are for spacing, gross, but true
    connectedList.append('\n\n\n').append(link.find('img'));
    link.remove();
  }
};

handlers.You = loadApp;
handlers.Create = loadApp;
handlers.connect = loadApp;
handlers.Settings = {};
handlers.Settings.Connections = function () {
  registry.getMyConnectors(function (authedConnectors, mySuccess) {
    registry.getMyUnconnectedConnectors(function (otherConnectors, unSuccess) {
      var mine = [];
      for (var conn in authedConnectors) {
        if (authedConnectors.hasOwnProperty(conn)) mine.push(authedConnectors[conn]);
      }
      generateConnectors({authedConnectors:mine, otherConnectors:otherConnectors}, function (connHTML) {
        $('#Settings #Connections').html(connHTML);
      });
    });
  });
}

function generateConnectors(connectors, callback) {
  dust.render('connectors', connectors, function (err, appHtml) {
    callback(appHtml);
  });
}


handlers.You = loadApp;
handlers.create = loadApp;
handlers.Create = loadApp;
handlers.connect = loadApp;
handlers.viewAll = loadApp;
handlers.publish = loadApp;
