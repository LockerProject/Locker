var debug = false;
var log = function(m) { if (debug && console && console.log) console.log(m); }
var app, timeout, appId, installed;
var providers = [];
var manuallyClosed = false;
var retryTime = 1000;
var ready = false;
var searchWaiting = false;
var searchInterval;
var searchSelector = '.search-header-row:not(.template),.search-result-row:not(.template)';
if ( ! window.location.origin) window.location.origin = window.location.protocol+"//"+window.location.host;
var externalBase = window.location.origin;

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
          if ($("#services:visible").length > 0)
            closeServices();
          else
            expandServices();
        });

        $('#search-results').delegate(searchSelector, 'mouseover', function() {
            $('.highlighted').removeClass('highlighted');
            $(this).addClass('highlighted');
        }).delegate(searchSelector, 'mouseleave', function() {
            $(this).removeClass('highlighted');
        }).delegate(searchSelector, 'click', function() {
            $('#search-results').fadeOut();
        });

        // disable pass through click events when an area is blurred
        $('.blur').click(function() {
            return false;
        });

        $('.search').blur(function(){
            $('#search-results').fadeOut();
        });

        $('.search').focus(function() {
            if ($('.search')[0].value.length > 0) $('#search-results').fadeIn();
            window.setTimeout(function() {
              $('.search')[0].select();
            }, 100);
        });

        $('.search').keyup(function(e) {
            if (e.keyCode == 13) {
                $('.highlighted').click();
                $('#search-results').fadeOut();
                return false;
            } else if (e.keyCode == 38) {
                var selected = $('#search-results').children('.highlighted');
                $('#search-results').children('.highlighted').removeClass('highlighted');
                if (selected.prevAll(':not(.search-divider):visible').first().length > 0) {
                    selected.prevAll(':not(.search-divider):visible').first().addClass('highlighted');
                } else {
                    $('#search-results').children(':not(.search-divider):visible').last().addClass('highlighted');
                }
                return false;
            } else if (e.keyCode == 40) {
                var selected = $('#search-results').children('.highlighted');
                $('#search-results').children('.highlighted').removeClass('highlighted');
                if (selected.nextAll(':not(.search-divider):visible').first().length > 0) {
                    selected.nextAll(':not(.search-divider):visible').first().addClass('highlighted');
                } else {
                    $('#search-results').children(':not(.search-divider):visible').first().addClass('highlighted');
                }
                return false;
            } else {
                if ($('.search')[0].value.length == 0) {
                    $('#search-results').fadeOut();
                    $('.search').removeClass('populated');
                } else {
                    search();
                }
            }
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

        var viewersFullDisplay = false;
        $("#viewers-hide-show").click(function() {
            if(!viewersFullDisplay) {
                $("#viewers-hover").hide();
                $("#viewers-title").show();
                $("#viewers-list").show();
                $("#viewers").animate({"left":"0px"}, 300, function() {
                    $("#viewers-slide-button").attr('src', 'img/slide-in.png');
                    viewersFullDisplay = true;
                });
            } else {
                $("#viewers").animate({"left":"-320px"}, 300, function() {
                    viewersFullDisplay = false;
                    $("#viewers-title").hide();
                    $("#viewers-list").hide();
                    $("#viewers-hover").show();
                    $("#appFrame")[0].contentWindow.focus();
                    $("#viewers-slide-button").attr('src', 'img/slide-out.png');
                });
            }
        });

        renderApp();

        $(window).resize(resizeFrame);
        resizeFrame();
    }
);

/*
 * Search stuff
 */
var searchTerm;
function search() {
    var q = searchTerm = $('.search')[0].value;
    var baseURL = '/Me/search/query';
    var star = (q.length < 3 || q.substr(-1) == ' ') ? "" : "*";
    $.get(baseURL, {q: q + star, type: 'contact/full*', limit: 3}, function(results) {
        processResults('people', resXform(results), q);
    });
    $.get(baseURL, {q: q + star, type: 'photo/full*', limit: 3}, function(results) {
        processResults('photos', resXform(results), q);
    });
    $.get(baseURL, {q: q + star, type: 'timeline/twitter*', limit: 3}, function(results) {
        processResults('tweets', resXform(results), q);
    });
    $.get('/Me/links/search', {q: q + star, limit: 3}, function(otherData) {
        processResults('links', otherData, q);
    });
}

function resXform(res) {
    if(!res || !res.hits || !res.hits.length) return [];
    return res.hits;
}

function processResults(name, results, query) {
    if(query != searchTerm) return; // bail if search changed!
    var ids = {};
    if (results !== undefined && results.length > 0) {
        for (var i = 0; i < $('.search-result-row.' + name).length; i++) {
            ids[$($('.search-result-row.' + name)[i]).attr('id')] = true;
        }
        updateHeader(name, query);
        for (var i = 0; i < results.length; i++) {
            if (results[i] !== undefined) {
                var obj = results[i];
                delete ids[obj._id];
                if ($('#' + obj._id + '.' + name).length === 0) {
                    if (renderRow(name, obj) === false) {
                        results.splice(i, 1);
                        i--;
                    }
                }
            }
        }
        for (var i in ids) {
            $('#' + i + '.' + name).remove();
        }
    } else {
        $('.search-header-row.' + name).hide();
        $('.search-result-row.' + name).remove();
    }

    $('#search-results').fadeIn();

    if ($('.search-result-row:not(.template)').length > 0) {
      $('#search-results').removeClass("no-results");
        $('.search').addClass('populated');
        if ($('.highlighted').length === 0) {
            $('#search-results').find('.search-result-row:not(.template)').first().addClass('highlighted');
        }
    } else {
        // $('#search-results').fadeOut();
      $('.search').removeClass('populated');
      $('#search-results').addClass("no-results");
    }
}

function updateHeader(name, query) {
    var header = $('.search-header-row.' + name);
    header.find('span').text("");
    header.show();
    header.unbind('click');
    header.click(function() { app = $(this).data('app'); renderApp('search-' + query); });
}

function renderRow(name, obj) {
    var newResult = $('.search-result-row.template').clone();
    newResult.removeClass('template');
    newResult.addClass(name);
    newResult.attr('id', obj._id);
    if (resultModifiers[name](newResult, obj) === false) {
        return false;
    }
    $('.search-header-row.' + name).after(newResult);
}

var resultModifiers = {};

resultModifiers.people = function(newResult, obj) {
    newResult.children('.search-result').html(obj.fullobject.name);
    if (obj.fullobject['photos']) {
        newResult.find('.search-result-icon').attr('src', obj.fullobject.photos[0]);
    } else {
        newResult.find('.search-result-icon').attr('src', '/static/img/silhouette.png');
    }
    newResult.click(function() { app = 'contacts'; renderApp('view-' + obj._id); });
}

resultModifiers.photos = function(newResult, obj) {
    newResult.children('.search-result').html(obj.fullobject.title);
    newResult.find('.search-result-icon').attr('src', obj.fullobject['thumbnail'] || obj.fullobject['url']);
    var img = newResult.find('.search-result-icon')[0];
    img.onload = function() {
        if (this.clientWidth > 36) {
            var left = (this.clientWidth - 36) / 2;
            $(this).css('left', left * -1);
        }
    }
    newResult.click(function() { app = 'photos'; renderApp('view-' + obj._id); });
}

resultModifiers.links = function(newResult, obj) {
    if (obj.title === undefined) {
        return false;
    }
    newResult.attr('title', obj.title);
    newResult.children('.search-result').html(obj.title);
    newResult.find('.search-result-icon').attr('src', obj.favicon || 'img/link.png').addClass("favicon");
    newResult.click(function() { window.open(obj.link,'_blank'); });
}

resultModifiers.tweets = function(newResult, obj) {
    newResult.attr('title', obj.fullobject.text);
    newResult.children('.search-result').html(obj.fullobject.text);
    newResult.find('.search-result-icon').attr('src', obj.fullobject.user.profile_image_url_https);
    newResult.click(function() { window.open('https://www.twitter.com/' + obj.fullobject.user.screen_name + '/status/' + obj.fullobject.id_str, '_blank'); });
}

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
                for (app in data.installed) {
                    hasProps = true;
                    if (window.guidedSetup) window.guidedSetup.servicesAdded();
                    app = data.installed[app];

                    if (providers.indexOf(app.provider) != -1) {
                        // update app button with "pending" gfx
                        t.updateState(app.provider, app);
                    }
                }
                if(!installed || (!installed.github && data.installed.github)) drawViewers(); // add it whenever it loads first time
                installed = data.installed;
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
            if (!window.syncletPoll) {
                window.syncletPoll = new SyncletPoll(providers);
            } else {
                window.syncletPoll.halt();
                delete window.syncletPoll;
                window.syncletPoll = new SyncletPoll(providers);
            }
            for (var i = 0; i < syncletsToRender.length; i++) {
                drawService(syncletsToRender[i]);
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

function drawViewer(viewer, isSelected) {
    var newService = $('.viewer.template').clone();
    var newServiceHover = $('.viewer-hover.template').clone();
    var viewerUrl = externalBase + '/Me/' + viewer.handle + '/';
    newService.find('.viewer-icon').attr('src', viewerUrl + 'img/viewer-icon.png').attr('onError', 'this.src=\'img/viewer-icon.png\'');
    newService.find('.viewer-link').attr('href', '#' + viewer.viewer);
    if(!isSelected) {
        newService.find('.viewer-link').click(function() {
            if(viewer.sync)
            {
                console.log("forced background syncing to github");
                $.get('/synclets/github/run?id=repos', function(){});
                return;
            }
            setViewer(viewer.viewer, viewer.handle, function() {
                renderApp();
                drawViewers();
            });
        });
    } else {
        newService.addClass('selected');
    }
    newService.find('.viewer-name').text(viewer.title);
    newService.find('.viewer-author').text(viewer.author !== ''?"by " + viewer.author:'');
    newService.find('.viewer-author-link').attr('href', "https://github.com/" + viewer.author);
    newService.removeClass('template');
    $('#viewers-list').append(newService);

    if(viewer.author == "") return;
    newServiceHover.find('.viewer-icon').attr('src', viewerUrl + 'img/viewer-icon.png').attr('onError', 'this.src=\'img/viewer-icon.png\'');
    newServiceHover.find('.viewer-link').attr('href', '#' + viewer.viewer);
    if(!isSelected) {
        newServiceHover.find('.viewer-link').click(function() {
            setViewer(viewer.viewer, viewer.handle, function() {
                renderApp();
                drawViewers();
            });
        });
    } else {
        newServiceHover.addClass('selected');
    }
    newServiceHover.removeClass('template');
    $('#viewers-hover').append(newServiceHover);
}

function drawViewers() {
    console.log('drawViewers');
    $.getJSON('viewers', function(data) {
        console.error("DEBUG: data", data);
        $('.viewer:not(.template)').remove();
        $('.viewer-hover:not(.template)').remove();
        var viewersToRender = data.available[app];
        for(var i in viewersToRender) {
            drawViewer(viewersToRender[i], data.selected[app] === viewersToRender[i].handle);
        }
        var addViewerView = {
            title: 'Create a Viewer',
            author: '',
            viewer: 'photos',
            handle: 'devdocs'
        };
        drawViewer(addViewerView, false);
        if(!installed || !installed.github) return;
        var addViewerView = {
            title: 'Sync your views from GitHub',
            author: '',
            viewer: 'photos',
            handle: 'devdocs',
            sync: true
        };
        drawViewer(addViewerView, false);
    });
}

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

function renderApp(fragment) {
    if (timeout) clearTimeout(timeout);
    $('.selected').removeClass('selected');
    $("#" + app).addClass('selected');
    $.getJSON('viewers', function(data) {
        if (fragment !== undefined &&
            (fragment.split('-')[0] === 'view' ||
            fragment.split('-')[0] === 'search' ||
            fragment.split('-')[0] === 'new')) {
            if (app === 'photos') appId = 'photosv09';
            if (app === 'contacts') appId = 'contactsviewer';
            if (app === 'links') appId = 'linkalatte';
            data.selected[app] = appId;
        } else {
            if (!data.selected[app]) return;
            appId = data.selected[app];
        }
        var viewerUrl = externalBase + '/Me/' + appId + '/';
        drawServices();
        drawViewers();
        (function poll (data) {
            $.getJSON("/Me/" + app + "/state", function(state) {
                ready = state.count > 0;
                if (ready) {
                    // log('clearing timeout');
                    var needReload = false;
                    if (!fragment && viewerUrl == $("#appFrame")[0].contentWindow.location.toString()) needReload = true;
                    $("#appFrame")[0].contentWindow.location.replace(viewerUrl + (fragment?("?"+fragment+"#"+fragment):"")); // HACK WTF OMG IrAGEuBroSER!
                    if (needReload) {
                        $("#appFrame")[0].contentDocument.location.reload(true);
                    }
                    $("#appFrame")[0].contentWindow.focus();
                    clearTimeout(timeout);
                    if (manuallyClosed) closeServices();
                }
                else {
                    var currentLocation = $("#appFrame")[0].contentWindow.location;
                    var newLocation = viewerUrl + "notready.html";
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

function expandServices()
{
  $('.services-box-container').addClass("active");

  // Hide child elements of the services container...
  $('#services #choose-services').hide();
  $('#services #service-selector').hide();

  $("#services").css({ height: "0px" }).show();

  // Push the viewers slider down...
  $("#viewers").animate({ top: "183px" }, { duration: 200 });

  // Push the main content area down...
  $("#iframeWrapper").animate({ top: "161px" }, { duration: 200 });

  // TODO The above should both be handled by resizing their container, not each individually...

  // Expand the Services area to size...
  $('#services').animate({ height: "96px" }, { duration: 200, complete: function() {
    $('#services #choose-services').fadeIn();
    $('#services #service-selector').fadeIn();
  }});
}

function resizeFrame() {
    $('#appFrame').height($(window).height() - $('#services').height() - $('.header').height() - 6);
    $("#appFrame").width($(window).width());
}



function closeServices()
{

  $('.services-box-container').removeClass("active");

  // Restore the main content area...
  $("#iframeWrapper").animate({
    top: "64px"
  }, {
      duration: 200, queue: false
  });

  // Restore the viewers slider...
  $("#viewers").animate({ top: "86px" }, { duration: 200 });

  $('#services').animate({height: "0px"}, {duration: 200, queue: false, complete:function() {
      // $('.services-box-container').show();
      $('#services').hide();
      resizeFrame();
  }});

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
            text.forward = ['Get Started!', 'NEXT', 'DONE'];
            text.body = [];
            text.body[0] = "<p>This helps you pull all your stuff together from around the web and see it in one place.</p>" +
                           "<p>Once it's all together, you can build on top of it and share what you create!</p>";
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

function drawGuidedSetup() {
    if (guidedSetupActive) return;
    guidedSetupActive = true;
    $('.blur').show();
}

function setViewer(type, handle, callback) {
    $.post('setViewer', {type:type, handle:handle}, callback);
}
