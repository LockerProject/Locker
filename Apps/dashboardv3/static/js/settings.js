var info = {};

function setUserGlobals(data) {
    info = data;
}

$(function () {
    $(".connect-button-link").click(function (e) {
        e.preventDefault();
        showHiddenConnectors();
    });

    $("#showToken").click(function(e) {
      $("#apiToken").val(info.apiToken);
    });

    $("#resetToken").click(function(e) {
      $.jsonp({url : info.externalHost + '/users/me/resetApiToken',
               callbackParameter : 'callback',
               error : function (xopts, status) {
                   if (console && console.error) console.error('Uhoh: ' + status);
               },
               success : function (json, status) {
                   $("#apiToken").val(json.apiToken);
               }
      });
    });

    // copied from connect.js
    $('body').delegate('.oauthLink','click', function (e) {
        var options = "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no";
        var popup = window.open($(this).attr('href'), "account", options);
        popup.focus();
        return false;
    });

    $('input[name=username]').val(info.name);
    $('input[name=email]').val(info.email);
    $('input[name=avi_url]').val(info.imageUrl);

    var validate = $('#settings-account').validate({
        rules : {
            username : {required  : true,
                        minlength : 2},
            email : {required : true,
                     email    : true},
            old_password : {minlength : 6},
            new_password : {minlength : 6}
        },
        messages : {
            username     : {required  : "We need to know what to call you, hoss.",
                            minlength : "At least 2 characters are necessary."},
            email        : {required : "Your email address is also how you sign in. Required!"},
            old_password : {minlength : "At least 6 characters are necessary."},
            new_password : {minlength : "At least 6 characters are necessary."}
        },
        submitHandler : function (form) {
            var post = {email        : $('#email').val(),
                        username     : $('#username').val(),
                        old_password : $('#old_password').val(),
                        new_password : $('#new_password').val(),
                        avi_url      : $('#avi_url').val(),
                        optout       : $('#optout').is(':checked') ? true : undefined};

            if (post.old_password && post.new_password) {
                var passwordUrl = info.externalHost + '/users/changePassword';
                $.jsonp({url : passwordUrl,
                         callbackParameter : 'callback',
                         data : post,
                         error : function (xopts, status) {
                             if (console && console.error) console.error(status + ': from url ' + xopts.url);
                             $('#settings_account_error').text('Password change failed. Perhaps you entered your old password incorrectly?');
                         },
                         success : function (json, status) {
                             $('#settings_account_error').text('Your password was successfully changed.');
                         }});
            }
        }
    });

    showAllConnectors();
});

var showHiddenConnectors = function () {
    $(".hideable").fadeIn();
};

var showAllConnectors = function () {
    $(".synclets-list li").fadeIn();
};
