$(function() {
    $(".connect-button-link").click(function(e) {
        e.preventDefault();
        showAllConnectors();
    });
    
    $('.oauthLink').click(function() {
        var popup = window.open($(this).attr('href'), "account", "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no");
        popup.focus();
        return false;
      });
});

// this one is called only when going through a first-time connection
var syncletInstalled = function(provider) {
    $('.oauthLink img').each(function(index) {
        if ($(this).parent().attr('data-provider') === provider) {
            $(this).attr('src', 'img/connected.png');
        }
    });
    $('.sidenav-items.synclets', window.parent.document).append("<img class='installed' src='img/icons/32px/"+provider+".png'>");
    showAllConnectors();
    //var link = $('.oauthLink[data-provider="' + provider + '"]');
    //link.children('img').addClass('installed').appendTo('.sidenav-items.synclets', window.parent.document);
    //link.remove();
};

var showAllConnectors = function() {
    $("#main-header-1").hide();
    $("#main-header-2").show();
    $(".hideable").fadeIn();
};