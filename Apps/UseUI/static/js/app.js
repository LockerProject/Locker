var debug = false;
var log = function(m) { if (debug && console && console.log) console.log(m); }
var app, timeout, appId;
var providers = [];
var manuallyClosed = false;
var retryTime = 1000;
var ready = false;

$(document).ready(
    function() {
        // any mouse activity resets it
        $(document).mousemove( function() {
            retryTime = 1000;
        } );

        app = window.location.hash.substring(1) || "contacts";

        $('.app-select').click(function() {
            $('.app-select').toggleClass('on');
            $('.children').toggle();
        });

        $('.app-link').click(function() {
            app = $(this).attr('id');
            window.location.hash = app;
            renderApp();
            return false;
        });

        // open service drawer button
        $('.services-box').click(function() {
            expandServices();
        });

        // close service drawer button
        $('#service-closer').click(function() {
            if ($('.blur:visible').length === 0) {
                manuallyClosed = true;
                $.post('closed', function(data) { log("success"); });
                closeServices();
            }
        });

        // service buttons
        $('#service-selector').delegate('.provider-link', 'click', function() {
            if ($(this).hasClass('disabled')) return false;
            accountPopup($(this));
            return false;
        });

        // search box
        $('#nav-search').submit(function() {
            var inputText = $("#nav-search .search").val();
            $("#nav-search .search").val("");
            window.location.hash = "search";
            $('.selected').removeClass('selected');
            $("#appFrame")[0].contentWindow.location.replace("/Me/searchapp/search?type=&searchterm="+inputText);
            return false;
        });

        // disable pass through click events when an area is blurred
        $('.blur').click(function() {
            return false;
        });

        $(".app-link[title]").tooltip({
            position:"bottom center",
            predelay:750,
            onBeforeShow: function(ev) {
                var id = this.getTrigger().attr("id");
                // Chop off the s!
                id = id.substring(0, id.length - 1);
                var tip = $('.' + id + 'sTotalCount').text() + '<br /><div class="lastUpdated">';
                if (allCounts[id] && allCounts[id].lastUpdate) {
                    var timeDiff = Date.now() - allCounts[id].lastUpdate;
                    if (timeDiff < 60000) {
                        tip += 'last updated less than a minute ago';
                    } else if (timeDiff < 3600000) {
                        tip += 'last updated ' + Math.floor(timeDiff / 60000) + ' minutes ago';
                    } else if (timeDiff < 43200000) {
                        tip += 'last updated over an hour ago';
                    } else if (timeDiff < 43800000) {
                        tip += 'last updated ' + Math.floor(timeDiff / 3600000) + ' hours ago';
                    } else {
                        var d = new Date;
                        d.setTime(allCounts[id].lastUpdate);
                        log(allCounts);
                        tip += 'last updated ' + d.toString();
                    }
                    tip += '</div>';
                }
                this.getTip().html('<div>' + tip + '</div>');
            }
        });

        renderApp();

        $(window).resize(resizeFrame);
        resizeFrame();
    }
);

/*
 * SyncletPoll
 */
var SyncletPoll = (
    function () {
        var SyncletPoll = function () {
            var t = this;
            t.uri = "/synclets";
            t.repoll = true;
            t.installed = {};

            var app = {};

            t.updateState = function(provider, app) {
                var b =  {
                    "$el": $("#"+provider+"connect")
                };

                if (typeof(t.installed[provider]) != "undefined") {
                    b = t.installed[provider];
                } else {
                    t.installed[provider] = b;
                    b.$el.find('a').addClass("disabled");
                }

                if (app.finishedOnce) {
                    b.$el.find('.checkmark').show();
                }
            };

            t.handleResponse = function(data, err, resp) {
                if(retryTime < 10000) retryTime += 500;
                var hasProps = false;
                globalvar = data.installed;
                for (app in data.installed) {
                    hasProps = true;
                    if (window.guidedSetup) window.guidedSetup.servicesAdded();
                    app = data.installed[app];

                    if (providers.indexOf(app.provider) != -1) {
                        // update app button with "pending" gfx
                        t.updateState(app.provider, app);
                    }
                }
                if (!hasProps && !window.guidedSetup) {
                    window.guidedSetup = new GuidedSetup();
                }
                if (ready === false && hasProps && $('#services').height() === 0) expandServices();

                if (t.repoll) t.timeout = setTimeout(t.query, retryTime);
            };

            t.query = function() {
                var url = t.uri;
                $.ajax({
                           url: url,
                           dataType: 'json',
                           success: t.handleResponse,
                           error: function(e) {
                               // assume it will become available later
                               t.timeout = setTimeout(t.query, 3000);
                           }
                       });
            };

            t.halt = function() {
                t.repoll = false;
                clearTimeout(t.timeout);
            };

            // init
            t.query();
        };

        return function () {
            return new SyncletPoll();
        };

    })();

function drawServices() {
    $.getJSON('/available?handle=' + appId, function(data) {
        $.getJSON('/synclets', function(synclets) {
            $('.service:not(.template)').remove();
            providers = [];
            var syncletsToRender = [];
            for (var i in data.uses) {
                for (var j = 0; j < synclets.available.length; j++) {
                    if (synclets.available[j].provider === data.uses[i]) {
                        if(synclets.available[j].authurl) {
                            providers.push(data.uses[i]);
                            if (typeof(synclets.installed[data.uses[i]]) != "undefined") {
                                syncletsToRender.push(synclets.available[j]);
                            } else {
                                syncletsToRender.unshift(synclets.available[j]);
                            }
                        }
                    }
                }
            }
            for (var i = 0; i < syncletsToRender.length; i++) {
                drawService(syncletsToRender[i]);
            }
            if (!window.syncletPoll) {
                window.syncletPoll = new SyncletPoll(providers);
            } else {
                window.syncletPoll.halt();
                delete window.syncletPoll;
                window.syncletPoll = new SyncletPoll(providers);
            }
        });
    });
}

function drawService(synclet) {
    var newService = $('.service.template').clone();
    newService.find('.provider-icon').attr('src', 'img/icons/' + synclet.provider + '.png').attr('title', synclet.info);
    newService.find('.provider-link').attr('href', synclet.authurl).data('provider', synclet.provider);
    newService.find('.provider-name').text(synclet.provider);
    newService.removeClass('template');
    newService.attr('id', synclet.provider + 'connect');
    $('#service-selector').append(newService);
};

// this needs some cleanup to actually use the proper height + widths
function accountPopup (elem) {
    var width = 620;
    var height = 400;
    var oauthPopupSizes = {foursquare: {height: 540,  width: 960},
                 github: {height: 1000, width: 1000},
                 twitter: {width: 630, height: 500},
                 tumblr: {width: 630, height: 500},
                 facebook: {width: 980, height: 705},
                 flickr: {width: 1000, height: 877}
                };
    if (oauthPopupSizes[elem.data('provider')]) {
        width = oauthPopupSizes[elem.data('provider')].width;
        height = oauthPopupSizes[elem.data('provider')].height;
    }
    var popup = window.open(elem.attr('href'), "account", "width=" + width + ",height=" + height + ",status=no,scrollbars=no,resizable=no");
    popup.focus();
}

function renderApp() {
    if (timeout) clearTimeout(timeout);
    $('.selected').removeClass('selected');
    $("#" + app).addClass('selected');
    $.getJSON('apps', function(data) {
        ready = false;
        if (!data[app]) return;
        appId = data[app].id;
        drawServices();
        (function poll (data) {
            $.getJSON("/Me/" + app + "/state", function(state) {
                ready = state.count > 0;
                if (ready) {
                    log('clearing timeout');
                    $("#appFrame")[0].contentWindow.location.replace(data[app].url);
                    clearTimeout(timeout);
                    if (manuallyClosed) closeServices();
                }
                else {
                    var currentLocation = $("#appFrame")[0].contentWindow.location;
                    var newLocation = data[app].url + "notready.html";
                    if (currentLocation.toString() !== newLocation)
                        currentLocation.replace(newLocation);
                    clearTimeout(timeout);
                    timeout = setTimeout(function() {poll(data);}, 1000);
                    log(timeout);
                }
            });
        })(data);
    });
};

function expandServices() {
    $('.services-box-container').hide();
    $('#appFrame').animate({height: $('#appFrame').height() - 110}, {duration: 200, queue: false});
    $('#services').animate({height: "110px"}, {duration: 200});
}

function resizeFrame() {
    $('#appFrame').height($(window).height() - $('#services').height() - $('.header').height() - 6);
    $("#appFrame").width($(window).width());
}


function drawGuidedSetup() {
    if (guidedSetupActive) return;
    guidedSetupActive = true;
    $('.blur').show();
}

function closeServices() {
    $('#appFrame').animate({height: $('#appFrame').height() + 110}, {duration: 200, queue: false});
        $('#services').animate({height: "0px"}, {duration: 200, queue: false, complete:function() {
            $('.services-box-container').show();
            resizeFrame();
        }
    });
}


/*
 * GuidedSetup
 */
var GuidedSetup = (
    function () {
        var GuidedSetup = function () {
            var t = this;
            var page = 0;
            var text = {};
            t.synced = false;
            text.header = ['Welcome!', 'Get Started.', 'Explore...'];
            text.forward = ['NEXT', 'NEXT', 'DONE'];
            text.body = [];
            text.body[0] = "<p>This helps you pull all your stuff together from around the web.</p>" +
                           "<p></p>";
            text.body[1] = "<p>To get started, connect some services you use.</p>" +
                           "<p></p>";
            text.body[2] = "<p>Now that you've got some services connected, you can got check out the different views!</p>" +
                           "<p><b>Photos</b> - See all your photos from around the web in one place.</p>" +
                           "<p><b>People</b> - See everyone you are connected to in one place.</p>" +
                           "<p><b>Links</b> - Search for and discover all the links people are sharing with you.</p>";


            t.drawGuidedSetup = function() {
                $('.blur').show();
                $('.close-box').click(function() {
                    $('.blur').hide();
                });
                $('.forward').click(t.moveForward);
                $(document).keydown(function(e) {
                    if (e.keyCode === 27) {
                        $('.blur').hide();
                    }
                });

                t.updateText();
            };

            t.moveForward = function() {
                log('moving forward!');
                log(page);
                log(t.synced);
                if (page === 0 && t.synced === false) {
                    $('.forward').addClass('disabled');
                    $('.forward').attr('title', 'You must authorize a service to continue!');
                    $('.forward-buttton-text').attr('title', 'You must authorize a service to continue!');
                    expandServices();
                }
                if (page === 1 && t.synced === false) {
                    return;
                }
                if (page === 2) {
                    return $('.blur').hide();
                }
                page++;
                t.updateBlurs();
                t.updateText();
            }

            t.servicesAdded = function() {
                log('added services!');
                if (t.synced) return;
                t.synced = true;
                $('.forward').removeClass('disabled');
                $('.forward').attr('title', '');
                $('.forward-button-text').attr('title', '');
            }

            t.updateBlurs = function() {
                $('.blur').show();
                if (page === 1) {
                    $('#services .blur').hide();
                } else if (page === 2) {
                    $('.header .blur').hide();
                }
            }

            t.updateText = function() {
                $('.header-text').animate({opacity: 0}, {duration: 200, queue: false});
                $('.forward-button-text').animate({opacity: 0}, {duration: 200, queue: false});
                $('.lightbox .body').animate({opacity: 0}, {duration: 200, queue: false, complete:function() {
                    $('.header-text').text(text.header[page]);
                    $('.forward-button-text').text(text.forward[page]);
                    $('.lightbox .body').html(text.body[page]);
                    $('.header-text').animate({opacity: 1}, {duration: 200, queue: false});
                    $('.forward-button-text').animate({opacity: 1}, {duration: 200, queue: false});
                    $('.lightbox .body').animate({opacity: 1}, {duration: 200, queue: false});
                }});

           }

            t.drawGuidedSetup();
        };

        return function () {
            return new GuidedSetup();
        };

    })();
