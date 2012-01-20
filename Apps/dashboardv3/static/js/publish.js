var jcrop_api, uploader;

$(document).ready(function() {
  $('.rename-app').change(function() {
    $('.app-name').toggle();
    rename();
  });

  $('.app').change(function() {
    $('.preview').removeClass('jcrop');
    $('.preview p').text('preview');
    $('#x,#y,#w,#h').attr('value', '');
    if (jcrop_api) { jcrop_api.destroy(); }
    var self = $('.app>option:selected');
    $('input[name=new-file]').attr('value', 'false');
    $('textarea[name=app-description]').text(self.data('description'));
    $('.old-name').attr('value', $('.app>option:selected').text());
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
      $('input[name=new-file]').attr('value', 'false');
      attachJcrop();
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
    window.parent.loadApp('viewAll');
  });

  setupUploader();
});

var rename = function() {
  $('.app-name-span').text($('.app>option:selected').text());
};

var selectItem = function(id) {
  $('select options[selected]').removeAttr('selected');
  $('option[value="' + id + '"]').attr('selected', 'selected');
  $('.app').change();
}

var attachJcrop = function() {
  if (jcrop_api) { jcrop_api.destroy(); }
  $('.preview p').text('crop');
  $('.preview').addClass('jcrop');
  $('.preview img').Jcrop({
      aspectRatio: 1 / 1,
      boxWidth: 450,
      boxHeight: 450,
      onSelect: updateCoords
    },function(){
    jcrop_api = this;
    $('.jcrop-holder').css('margin-top', ($('.jcrop-holder').height() / 2) * -1);
    $('.jcrop-holder').css('margin-left', ($('.jcrop-holder').width() / 2) * -1);
  });
}

var updateCoords = function(c) {
    $('#x').val(c.x);
    $('#y').val(c.y);
    $('#w').val(c.w);
    $('#h').val(c.h);
}

var setupUploader = function() {
  uploader = new plupload.Uploader({
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
    attachJcrop();
  });

  return uploader;
}
