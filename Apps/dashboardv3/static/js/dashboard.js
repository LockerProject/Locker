var specialApps = {
    "allApps"  : "allApps",
    "connect"  : "connect",
    "develop"  : "develop",
    "settings" : "settings"
};
var defaultSubSections = {};
var loggedIn = true;
var _gaq = _gaq || [];

$(document).ready(function() {
    $.history.init(function(hash){
        loadDiv(window.location.hash.substring(1) || $('.installed-apps a').data('id') || '#Explore-contactsviewer');
    }, { unescape: ",/" });

    $('body').delegate('.install', 'click', function(e) {
        var $e = $(e.currentTarget);
        var id = $e.attr('id');
        $.get('/registry/add/' + id, function() {
            if(typeof _kml !== 'undefined') _kml.push('addapp');
            window.location = 'explore#Explore-' + id;
        });
        return false;
    });

    $('body').delegate('.oauthLink','click', Locker.connectService);
    $('body').delegate('.sync-button', 'click', function(evt) {
      evt.preventDefault();
      var button = $(this);
      var provider = button.data('provider');
      if (button.hasClass('disabled')) return;
      button.addClass('disabled').text('Synching');

      var ellipsis = setInterval(function() {
        var text = button.text();
        if (/\.{3}$/.test(text)) text = text.replace(/\.*$/, '');
        else text += '.';
        button.text(text);
      }, 500);

      Locker.syncService(provider, {id: 'repos'}, function(success) {
        clearInterval(ellipsis);
        button.text(success ? 'Synched!' : 'Failed').css({
          'padding-left': 0,
          'text-align': 'center'
        });
      });
    });

    $('.your-apps').click(function() {
        $('.blue').removeClass('blue');
        $(this).addClass('blue');
        if (document.getElementById('appFrame').contentWindow.filterItems) {
            document.getElementById('appFrame').contentWindow.filterItems($(this).attr('id'));
        }
    });

    function promptForConnections() {
      registry.getMyConnectors(function(connectors) {
        var count = Object.keys(connectors).length;
        if (count === 0 || (count === 1 && typeof(connectors.github) !== 'undefined')) {
          window.location.hash = '#Explore-connect';
        } else {
          $('.nav-section, .sidenav').show();
          showConnectMore();
        }
      });
    }

    function showConnectMore() {
        if ($.cookie("firstvisit") !== 'true') return;
        $.cookie("firstvisit", null, {path: '/' });
        var modal = $('#connect-more').modal();
        $('#simplemodal-overlay,#no-thanks,#close-button,#close-this,.gotit-button').click(function(e) {
            modal.close();
        });
    }

    if (window.location.hash !== '#Explore-connect') promptForConnections();
});

var loadApp = function(info) {
    var app = info.subSection || info.topSection;
    $('.app-container').hide();
    $('.app-container#iframeContainer').show();
    $('.app-details').hide();
    $('#iframeContainer .app-header').hide();
    if (specialApps[app]) {
        setFrame(specialApps[app] + '?params=' + info.params);
    } else if (info.topSection === "Settings") {
        if (info.subSection === "Connections") setFrame('/dashboard/settings-connectors');
        else if (info.subSection === "AccountInformation") setFrame('/dashboard/settings-account');
        else if (info.subSection === "APIKey") setFrame('/dashboard/settings-api');
        else alert("CAN YOOOOO SMELL WHAT THE ROCK IS COOOKING?");
    } else if (app === "Publish") {
        setFrame('publish?app=' + info.params.app);
    } else if (info.topSection === "Develop") {
        if (info.subSection === "BuildAnApp") setFrame('/dashboard/develop-buildapp');
        else if (info.subSection === "ApiExplorer") setFrame('/dashboard/develop-apiexplorer');
        else if (info.subSection === "Publishing") setFrame('/dashboard/develop-publishing');
        else if (info.subSection === "ExampleApps") setFrame('/dashboard/develop-exampleapps');
        else if (info.subSection === "Chat") setFrame('/dashboard/develop-chat');
        else if (info.subSection === "TemplatesIcons") setFrame('/dashboard/develop-templatesicons');
    } else if (app === "connect") {
        setFrame('/dashboard/connect');
    } else {
        handleApp(app);
    }

    $('.iframeLink[data-id="' + info.app + '"]').parent('p').siblings().show();
};


var syncletInstalled = function(provider) {
  if (provider === 'github') $('.your-apps').show();
  // update connected and unconnected services lists
  link = $('.unconnected-services .oauthLink[data-provider="' + provider + '"]');
  if(link.length) {
    link.each(function(index, element) {
      element = $(element);
      var img = element.find('img');
      var connected = element.parent().parent().find('.connected-services');
      connected.append('\n\n\n').append(img.addClass('installed'));
      element.remove();
    });
  }
};


handlers.Explore = loadApp;
handlers.Develop = loadApp;
handlers.connect = loadApp;
handlers.Settings = loadApp;
handlers.allApps = loadApp;
handlers.publish = loadApp;

function setFrame(path) {
    $("#appFrame")[0].contentWindow.location.replace(path);
}

var connectedCount = 0;
function handleApp(appName) {
    $.get('clickapp/' + appName, function(e) {});
    doAppHeader(appName, '#iframeContainer .app-header');
    getAppAndConnectedServices(appName, function(err, app, connected) {
        if(app.uses && app.uses.services && (connected.hasOwnProperty('length') && connected.length === 0)) {
            $("#appFrame").hide();
        } else {
            $("#appFrame").show();
            setFrame('/Me/' + appName);
        }
    });
}

function getAppAndConnectedServices(appName, callback) {
    registry.getMap(function(err, map) {
        if(err || !map[appName]) return callback(err, map);
        var app = map[appName];
        registry.getConnectedServices(app.uses, function(connected) {
            callback(undefined, app, connected);
        });
    });
}
