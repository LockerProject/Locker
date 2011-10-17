userEmail = "";
userName = "";

function setUserGlobals(data) {
    userEmail = data.email;
    userName = data.name;
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

$(document).ready(function() {
    $("#customLogout").hover(function() {
        $("#customLogout").toggleClass("userMenuHover");
    });

    $("#customLogout").click(function() {
        $("#customLogout").toggleClass("userMenu");
        $("#userMenu").toggle();
        $("#customLogout").toggleClass("userMenuActive");
        return false;
    });

    $('.header').click(function() {
        $('#userMenu').hide();
        $('#customLogout').removeClass('userMenu');
        $('#customLogout').removeClass('userMenuActive');
    });
});
