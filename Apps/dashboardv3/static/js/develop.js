$(function() {
    $("#develop-nav-column div").removeClass('selected');
    switch (window.parent.location.hash) {
        case '#Develop-BuildAnApp':
            $("#develop-nav-buildanapp").addClass('navitem-selected');
            break;
        case '#Develop-ApiExplorer':
            $("#develop-nav-apiexplorer").addClass('navitem-selected');
            break;
        case '#Develop-Publishing':
            $("#develop-nav-publishing").addClass('navitem-selected');
            break;
        case '#Develop-ExampleApps':
            $("#develop-nav-exampleapps").addClass('navitem-selected');
            break;
        case '#Develop-ChatWithTheTeam':
            $("#develop-nav-chatwiththeteam").addClass('navitem-selected');
            break;
        case '#Develop-TemplatesIcons':
            $("#develop-nav-templatesicons").addClass('navitem-selected');
            break;
        default:
    }

    $(".develop-nav-column div a, a.iframeLink").click(function(e) {
        e.preventDefault();
        var href = $(this).attr('href');
        if (href.indexOf('#') === 0) window.parent.location.hash = href;
        else window.parent.location.replace(href);
    });
});


function isGitHubConnected(callback) {
  $.getJSON('/map', function(map) {
    return callback(map.github && map.github.auth && map.github.auth.profile && map.github.authed > 0);
  });
}

function getGitHubProfile(callback) {
  $.getJSON("/map/profiles", function(profiles) {
    for(var i in profiles) if(i.indexOf('contact://github/') === 0) return callback(profiles[i]);
    return callback();
  });
}

function pollForGitHubProfile(callback) {
  getGitHubProfile(function(profile) {
    if(profile) return callback(profile);
    setTimeout(function() {
      pollForGitHubProfile(callback);
    }, 1000);
  });
}
