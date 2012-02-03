$(function () {
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
            var post = {lockerName   : $(username).val(),
                        email        : $(email).val(),
                        username     : $(username).val(),
                        old_password : $(old_password).val(),
                        new_password : $(new_password).val(),
                        optout       : $(optout).is(':checked') ? true : undefined};

            if (post.old_password && post.new_password) {
                var passwordUrl = info.externalHost + '/users/changePassword';
                $.jsonp({url : passwordUrl,
                         callbackParameter : 'callback',
                         data : post,
                         error : function (xopts, status) {
                             alert(status + ': ' + JSON.stringify(xopts) + ' (from url ' + passwordUrl + ')');
                         },
                         success : function (json, status) {
                             alert('somehow, success: ' + JSON.stringify(json));
                         }});
            }
        }
    });
});
