$(function() {
  var section = window.parent.location.hash.split('-')[1];
  if (section) {
    $('#develop-nav .' + section.toLowerCase()).addClass('selected');
  }

  $('#develop-nav a, a.iframeLink').click(function(e) {
    e.preventDefault();
    var link = $(this);
    var href = link.attr('href');
    if (href.indexOf('#') === 0) window.parent.location.hash = href;
    else window.open(href, '_blank').focus();
  });

  $('.lazyload').each(function(i, el) {
    el = $(el);
    $.get(el.data('src'), function(r) { el.html(r); });
  });

});


function isGitHubConnected(callback) {
  $.getJSON('/map', function(map) {
    return callback(map.github && map.github.auth && map.github.auth.profile && map.github.authed > 0);
  });
}

function getGitHubProfile(callback) {
  $.getJSON('/map/profiles', function(profiles) {
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
