userEmail = "";
userName = "";
userOptin = '';
externalHost = '';
var clicked = false;

function setUserGlobals(data) {
    userEmail = data.email;
    userName = data.name;
    userOptin = data.optin;
    externalHost = data.externalHost;

    $.cookie('optin', userOptin, {path: '/'});

    $(".userEmail").text(userEmail);
    $(".user-name").text(userName);

    var E = $("#customLogout");
    E.show();
    var width = $("#menuExpander .userEmail").width() + $("#menuExpander .expander").width() + 10;
    $("#menuExpander").width(width);
    E.width(width);
    E.position({left:$("#header").width() - width - 20, top:0});
    $("#userMenu").width(width);
}

function closeUserMenu() {
    $('#userMenu').hide();
    $('#customLogout').removeClass('userMenu');
    $('#customLogout').removeClass('userMenuActive');
}

function checkClick() {
    if (document.activeElement && document.activeElement === document.getElementById('appFrame')) {
        closeUserMenu();
    } else {
        window.setTimeout(checkClick, 200);
    }
}

function openUserMenu() {
    $('#userMenu').show();
    $('#customLogout').addClass('userMenu');
    $('#customLogout').addClass('userMenuActive');
    checkClick();
}

$(document).ready(function() {
    $("#customLogout").hover(function() {
        $("#customLogout").toggleClass("userMenuHover");
    });

    $("#menuExpander").click(function() {
        if ($('customLogout').hasClass('userMenuActive')) {
            closeUserMenu();
        } else {
            openUserMenu();
        }
        return false;
    });

    $('.header').click(function() {
        closeUserMenu();
    });

    if (userOptin === true) {
        setTimeout(function(){
          var s = document.createElement('script');
          var f = document.getElementsByTagName('script')[0];
          s.type = 'text/javascript';
          s.async = true;
          s.src = "js/ga.js";
          f.parentNode.insertBefore(s, f);
        }, 1);
    }
});
