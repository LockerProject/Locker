var defaultApp = 'contactsviewer';
var specialApps = {
    "allApps" : "allApps",
    "viewAll" : "viewAll",
    "connect" : "connect"
};
var defaultSubSections = {};
var loggedIn = true;

$(document).ready(function() {
    $.history.init(function(hash){
        // if(hash === "") {
            // initialize your app
            loadDiv(window.location.hash.substring(1) || $('.installed-apps a').data('id') || defaultApp);
        // } else {
        //     loadDiv(window.location.hash.substring(1) || $('.installed-apps a').data('id') || defaultApp);
        // }
    }, { unescape: ",/" });
  
  $('body').delegate('.install', 'click', function(e) {
    var $e = $(e.currentTarget);
    var id = $e.attr('id');
    $.get('/registry/add/' + id, function() {
      window.location = 'explore#Explore-' + id;
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
  
  if (window.location.hash !== '#Explore-connect' && $.cookie("firstvisit") === 'true') {
      if (window.location.hash === '#Develop-devdocs' || window.location.hash === '#AppGallery-Featured') {
        $.cookie("firstvisit", null, {path: '/' });
      } else {
        doModal();
      }
  }
});

var loadApp = function(info) {
  var app = info.subSection || info.topSection;
  $('.app-container').hide();
  $('.app-container#iframeContainer').show();
  $('.app-details').hide();
  if (specialApps[app]) {
    $("#appFrame")[0].contentWindow.location.replace(specialApps[app] + '?params=' + info.params);
  } else if (app === "Publish") {
    $("#appFrame")[0].contentWindow.location.replace('publish?app=' + info.params.app);
    $('#appHeader').hide();
  } else if (app === "connect") {
    $("#appFrame")[0].contentWindow.location.replace('/Dashboard/connect');
  } else {
    handleApp(app);
  }

  $('.iframeLink[data-id="' + info.app + '"]').parent('p').siblings().show();
};

var syncletInstalled = function(provider) {
  if (provider === 'github') {
    $('.your-apps').show();
  }
  var link = $('.sidenav .oauthLink[data-provider="' + provider + '"]');
  if($('#appDiv').is(':visible')) {
    link.each(function(index, element) {
      element = $(element);
      var nxt = element.next('span');
      if(!nxt.length) nxt = element.prev('span');
      nxt.remove();
      element.remove();
    });
  } else {
    var connectedList = $('.sidenav-items.synclets-connected');
    // \n's are for spacing, gross, but true
    connectedList.append('\n\n\n').append(link.find('img'));
    link.remove();
  }
  link = $('#appHeader .unconnected-services .oauthLink[data-provider="' + provider + '"]');
  if(link.length) {
    var unConnectedList = $('#appHeader .connected-services');
    // \n's are for spacing, gross, but true
    unConnectedList.append('\n\n\n').append(link.find('img').addClass('installed'));
    link.remove();
  }
};


handlers.Explore = loadApp;
handlers.Develop = loadApp;
handlers.connect = loadApp;
handlers.viewAll = loadApp;
handlers.publish = loadApp;


function handleApp(appName) {
  $.get('clickapp/' + appName, function(e) {});
  doAppHeader(appName);
  $("#appFrame")[0].contentWindow.location.replace('/Me/' + appName);
}

function doAppHeader(appName) {
  registry.getApp(appName, function(app) {
    if(!app) return;
    registry.getConnectedServices(app, function(connected) {
      registry.getUnConnectedServices(app, function(unconnected) {
        registry.getMyAuthoredApps(function(myAuthoredApps) {
          var mine = myAuthoredApps[appName];
          dust.render('appHeader', {app:app, connected:connected, unconnected:unconnected, mine:mine}, function(err, appHtml) {
            $('#appHeader').html(appHtml);
          });
        });
      })
    });
  });
}