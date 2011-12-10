$(document).ready(function() {
  $('.rename-app').change(function() {
    $('.app-name').toggle();
    rename();
  });

  $('.app').change(function() {
    $('textarea[name=app-description]').text($('.app>option:selected').data('description'));
    rename();
  });

  $('.screenshot-url').blur(function() {
    if ($(this).attr('value').length > 0) {
      $('.preview img').attr('src', $('.screenshot-url').attr('value'));
      $('.preview').show();
    } else {
      $('.preview').hide();
    }
  });

  $('.save-draft').click(function() {
    $('input[name=app-publish]').attr('value', false);
    $('form').submit();
    return false;
  });

  $('.cancel').click(function() {
    window.parent.app = 'viewAll';
    window.parent.loadApp();
  });
});

var rename = function() {
  $('.app-name-span').text($('.app>option:selected').text());
};
