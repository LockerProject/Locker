$(function() {
    $(".connect-button-link").click(function(e) {
        e.preventDefault();
        $("#main-header-1").hide();
        $("#main-header-2").show();
        $(".hideable").fadeIn();
    });
    
    $('.oauthLink').click(function() {
        var popup = window.open($(this).attr('href'), "account", "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no");
        popup.focus();
        return false;
      });
});