var defaultApp = 'contactsviewer';
var specialApps = {
    "allApps"  : "allApps",
    "connect"  : "connect",
    "develop"  : "develop",
    "settings" : "settings"
};
var defaultSubSections = {};
var loggedIn = true;

$(document).ready(function() {
    $.history.init(function(hash){
        loadDiv(window.location.hash.substring(1) || $('.installed-apps a').data('id') || '#Explore-' + defaultApp);
    }, { unescape: ",/" });

    $('body').delegate('.install', 'click', function(e) {
        var $e = $(e.currentTarget);
        var id = $e.attr('id');
        $.get('/registry/add/' + id, function() {
            window.location = 'explore#Explore-' + id;
        });
        return false;
    });

    $('body').delegate('.oauthLink','click', Locker.connectService);

    $('.your-apps').click(function() {
        $('.blue').removeClass('blue');
        $(this).addClass('blue');
        if (document.getElementById('appFrame').contentWindow.filterItems) {
            document.getElementById('appFrame').contentWindow.filterItems($(this).attr('id'));
        }
    });

    function showConnectMore() {
        if ($.cookie("firstvisit") !== 'true') return;
        $.cookie("firstvisit", null, {path: '/' });
        var modal = $('#connect-more').modal();
        $('#simplemodal-overlay,#no-thanks,#close-button,#close-this,.gotit-button').click(function(e) {
            modal.close();
        });
    }
    if (window.location.hash !== '#Explore-connect') showConnectMore();
});

var loadApp = function(info) {
    var app = info.subSection || info.topSection;
    $('.app-container').hide();
    $('.app-container#iframeContainer').show();
    $('.app-details').hide();
    $('#appHeader').hide();
    if (specialApps[app]) {
        $("#appFrame")[0].contentWindow.location.replace(specialApps[app] + '?params=' + info.params);
    } else if (info.topSection === "Settings") {
        if (info.subSection === "Connections") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/settings-connectors');
        } else if (info.subSection === "AccountInformation") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/settings-account');
        } else if (info.subSection === "APIKey") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/settings-api');
        } else {
            alert("CAN YOOOOO SMELL WHAT THE ROCK IS COOOKING?");
        }
    } else if (app === "Publish") {
        $("#appFrame")[0].contentWindow.location.replace('publish?app=' + info.params.app);
    } else if (info.topSection === "Develop") {
        if (info.subSection === "BuildAnApp") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/develop-buildapp');
        } else if (info.subSection === "ApiExplorer") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/develop-apiexplorer');
        } else if (info.subSection === "Publishing") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/develop-publishing');
        } else if (info.subSection === "ExampleApps") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/develop-exampleapps');
        } else if (info.subSection === "ChatWithTheTeam") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/develop-chatwiththeteam');
        } else if (info.subSection === "TemplatesIcons") {
            $("#appFrame")[0].contentWindow.location.replace('/dashboard/develop-templatesicons');
        }
    } else if (app === "connect") {
        $("#appFrame")[0].contentWindow.location.replace('/dashboard/connect');
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
handlers.Settings = loadApp;
handlers.viewAll = loadApp;
handlers.publish = loadApp;


function handleApp(appName) {
    $.get('clickapp/' + appName, function(e) {});
    doAppHeader(appName);
    $("#appFrame")[0].contentWindow.location.replace('/Me/' + appName);
}

function doAppHeader(appName) {
    registry.getMap(function(err, map) {
        if(err || !map[appName]) return callback(err, map);
        var app = map[appName];
        // this {repository: app} stuff is because the map flattens the things in the repository field
        // up to the top level, but these registry functions expect them to be inside of repository
        registry.getConnectedServices(app.uses, function(connected) {
            registry.getUnConnectedServices(app.uses, function(unconnected) {
                registry.getMyAuthoredApps(function(myAuthoredApps) {
                    var mine = myAuthoredApps[appName];
                    if (mine) app.author = registry.localAuthor;
                    dust.render('appHeader', {app:app, connected:connected, unconnected:unconnected, mine:mine}, function(err, appHtml) {
                        $('#appHeader').html(appHtml);
                        $('#appHeader').show();
                    });
                });
            });
        });
    });
}
