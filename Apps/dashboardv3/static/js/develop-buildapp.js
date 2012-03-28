if (typeof Locker === 'undefined') Locker = {};
if (typeof Locker.Develop === 'undefined') Locker.Develop = {};

Locker.Develop.BuildAnApp = (function() {
  function init() {
    if (currentSection() === 'buildanapp') {
      prettyPrint();
      manageGithubConnection();
    }
  }

  function manageGithubConnection() {
    isGitHubConnected(function(isConnected) {
      if(isConnected) return;
      $('#connect-github').show();
      pollForGitHubProfile(function(profile) {
        $('#connect-github').slideUp();
      });
    });
  }

  function currentSection() {
    var section = window.parent.location.hash.split('-')[1];
    if (section) return section.toLowerCase();
  }

  function isGitHubConnected(callback) {
    $.getJSON('/map', function(map) {
      return callback(map.github && map.github.auth && map.github.auth.profile && map.github.authed > 0);
    });
  }

  function pollForGitHubProfile(callback) {
    getGitHubProfile(function(profile) {
      if(profile) return callback(profile);
      var timeout = setTimeout(function() {
        clearTimeout(timeout);
        pollForGitHubProfile(callback);
      }, 1000);
    });
  }

  function getGitHubProfile(callback) {
    $.getJSON('/map/profiles', function(profiles) {
      for(var i in profiles) if(i.indexOf('contact://github/') === 0) return callback(profiles[i]);
      return callback();
    });
  }

  return {
    init : init
  };
})();

$(Locker.Develop.BuildAnApp.init);
