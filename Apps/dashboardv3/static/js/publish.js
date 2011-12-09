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
    $('.preview img').attr('src', $('.screenshot-url').attr('value'));
    $('.preview').show();
  });
});

var rename = function() {
  $('.app-name-span').text($('.app>option:selected').text());
};
