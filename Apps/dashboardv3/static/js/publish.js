$(document).ready(function() {
  $('.rename-app').change(function() {
    $('.app-name').toggle();
    rename();
  });

  $('.app').change(function() {
    var self = $('.app>option:selected');
    $('input[name=new-file]').attr('value', 'false');
    $('textarea[name=app-description]').text(self.data('description'));
    $('.screenshot-url').attr('value', '');
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

  var uploader = setupUploader();

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

var setupUploader = function() {
  var uploader = new plupload.Uploader({
    runtimes : 'gears,html5,flash,silverlight,browserplus',
    browse_button : 'appscreenshot',
    container : 'container',
    max_file_size : '10mb',
    url : 'publishScreenshot',
    flash_swf_url : 'js/vendor/plupload.flash.swf',
    silverlight_xap_url : 'js/vendor/plupload.silverlight.xap',
    filters : [
      {title : "Image files", extensions : "jpg,gif,png,jpeg"},
    ],
  });

  uploader.init();

  uploader.bind('FilesAdded', function(up, files) {
    $('.preview img').attr('src', 'img/loading6.gif');
    uploader.start();
  });

  uploader.bind('FileUploaded', function(up, file) {
    $('.preview img').attr('src', 'tempScreenshot');
    $('input[name=new-file]').attr('value', 'true');
    $('.screenshot-url').attr('value', '');
  });

  return uploader;
}
