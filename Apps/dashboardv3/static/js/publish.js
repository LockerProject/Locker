$(document).ready(function() {
  $('.rename-app').change(function() {
    $('.app-name').toggle();
    rename();
  });

  $('.app').change(function() {
    var self = $('.app>option:selected');
    $('textarea[name=app-description]').text(self.data('description'));
    if (self.data('rename') == 'on') {
      $('.app-name').show();
      $('.app-name-span').text($('.app>option:selected').text());
      $('.rename-app').attr('checked', 'on');
      $('.app-newname').attr('value', $('.app>option:selected').text());
    } else {
      $('.app-name').hide();
      $('.rename-app').attr('checked', false);
      $('.app-newname').attr('value', '');
    }
    $('.preview img').attr('src', 'screenshot/' + self.data('handle'));
    rename();
  });

  $('.screenshot-url').blur(function() {
    if ($(this).attr('value').length > 0) {
      $('.preview img').attr('src', $('.screenshot-url').attr('value'));
    } else {
      $('.preview img').attr('src', 'screenshot/' + $('.app>option:selected').data('handle'));
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

  if (parent.iframeLoaded) {
    parent.iframeLoaded();
  }
});

var rename = function() {
  $('.app-name-span').text($('.app>option:selected').text());
};

var selectItem = function(id) {
  $('select options[selected]').removeAttr('selected');
  $('option[value="' + id + '"]').attr('selected', 'selected');
  $('.app').change();
}
