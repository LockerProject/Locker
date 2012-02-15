$(function() {
  setUpWelcome();
  initLearnMore();
  $('body').delegate('.oauthLink','click', Locker.connectService);
  $('#start-exploring-link').click(function(e) {
    e.preventDefault();
    parent.window.location.replace('/');
  });
});

/* This only applies to #Explore-connect, but the JS file may be loaded
 * elsewhere (TODO: split it up better). If neither Facebook nor Twitter are
 * available as Connectors (ie, no api key present), we'll just show everything.
 * Otherwise, ask for Facebook or Twitter first, as they're the most prolific
 * source of data.
 */
var setUpWelcome = function() {
  if (window.parent.location.hash !== '#Explore-connect') return;

  var hasTwitterOrFacebook = false
    , hasAuthedOne = false
    ;

  $('.synclets-list li .action-button').each(function(index, item) {
    item = $(item);
    if (['twitter', 'facebook'].indexOf(item.attr('data-provider')) !== -1) {
      item.closest('li').fadeIn();
      hasTwitterOrFacebook = true;
      if (item.hasClass('disabled')) hasAuthedOne = true;
    }
  });

  showAuthedState(hasAuthedOne || !hasTwitterOrFacebook);
};

var initLearnMore = function() {
  var learnMore = $('.learnmore')
    , link = $('a', learnMore)
    , copy = $('p', learnMore)
    , originalText = link.text();

  link.click(function(e) {
    e.preventDefault();
    var text = (copy.is(":hidden")) ? 'Close section' : originalText;
    link.hide().text(text).fadeIn('fast');
    copy.slideToggle('fast');
  });
};

// this one is called only when going through a first-time connection
var syncletInstalled = function(provider) {
  $('.oauthLink').each(function(index) {
    if ($(this).attr('data-provider') === provider) {
      $(this).removeClass('oauthLink');
      $(this).addClass('disabled');
      $(this).val('Connected');
      $(this).html('Connected');
    }
  });

  $('.sidenav-items.synclets.connect', window.parent.document).append("<img src='img/icons/32px/"+provider+".png'>");
  showAuthedState(true);
  updateUserProfile();
};

var showAuthedState = function(authed) {
  var navs = $('.nav-section, .sidenav', window.parent.document);
  if (authed) {
    navs.fadeIn();
    $("#main-header-1").hide();
    $("#main-header-2").show();
    $(".synclets-list li").fadeIn();
  } else {
    navs.fadeOut('fast');
  }
};

var updateUserProfile = function() {
  var username = null;
  var avatar = null;

  var fetchUserProfile = function() {
    $.get('/synclets/facebook/get_profile', function(body) {
      if (body.username) {
        avatar = "http://graph.facebook.com/" + body.username + "/picture";
        username = body.name;
      } else {
        $.get('/synclets/twitter/get_profile', function(body) {
          if (body.profile_image_url_https) {
            avatar = body.profile_image_url_https;
            username = body.name;
          }
        });
      }
    });
  };

  var profileTimeout = setInterval(function() {
    if (username === null) {
      fetchUserProfile();
    } else {
      clearInterval(profileTimeout);
      $('.avatar', window.parent.document).attr('src', avatar);
      $('.user-info-name-link', window.parent.document).text(username);
    }
  }, 500);
};
