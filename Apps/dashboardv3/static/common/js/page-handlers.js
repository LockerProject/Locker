var prettyNames = {
  gcontacts : 'Google Contacts',
}


$(document).ready(function() {
  $('body').delegate('.app-card', 'hover', appCardHover)
  .delegate('.sidenav-items input', 'click', filterCheckboxClick)
  .delegate('.app-card', 'click', function() {
    loadDiv('Explore-Details-app=' + $(this).data('id'));
    return false;
  }).delegate('.iframeLink', 'click', function() {
    loadDiv($(this).data('id'));
    return false;
  });
});

function filterCheckboxClick(element) {
  var id = $(element.currentTarget).parent().parent().attr('id');
  var checked = $('#' + id + ' input:checked');
  if (checked.length == 0) {
    $('.your-apps').click();
  } else {
    $('.your-apps').removeClass('blue');
    var app = "Explore-Filter?";
    var types = [];
    var services = [];
    $('#types').find(checked).each(function(i, elem) {
      types.push($(elem).attr('id'));
    });
    $('#services').find(checked).each(function(i, elem) {
      services.push($(elem).attr('id'));
    });
    if(types.length > 0) app += "&types=" + types.join(',');
    if(services.length > 0) app += "&services=" + services.join(',');
    loadDiv(app);
  }
  
}

function loadDiv(app) {
  $('iframe#appFrame').hide();
  $('div#appFrame').show();
  $('.iframeLink,.your-apps,header div.nav a').removeClass('blue');
  $(".selected-section").removeClass('selected-section');
  var info = splitApp(app);
  app = info.app;
  window.location.hash = info.app;
  $('.iframeLink[data-id="' + info.app + '"]').addClass('blue');
  $('header div a[data-id="' + info.topSection + '"]').addClass('blue');
  if(app.indexOf('You-') === 0 || app.indexOf('Create-') === 0) return loadApp(info);
  if(app.indexOf('connect') === 0) return loadApp(info);
  
  $(".sidenav #" + info.topSection).addClass('selected-section');
  $("div#appFrame #" + info.topSection).addClass('selected-section');
  $("div#appFrame #" + info.topSection + " #" + info.subSection).addClass('selected-section');
  if(info.topSection === 'Explore') {
    if(info.subSection === 'Filter') {
      $('.sidenav-items input').attr('checked', false);
      exploreFilter(info.params);
    } else {
      $('.sidenav-items input').attr('checked', false);
      if(info.subSection === 'Featured') exploreFeatured();
      else if(info.subSection === 'Author') exploreAuthor(info.params.author);
      else if(info.subSection === 'Details') exploreDetails(info.params.app);
    }
  }
}

function splitApp(app) {
  var appTmp = app;
  
  var params = '';
  var ndx = app.indexOf('?');
  if (ndx != -1) {
    params = app.substring(ndx + 1);
    app = app.substring(0, ndx);
  }
  
  var index = app.indexOf('-');
  var topSection = app;
  var substring;
  if(index > -1) {
    topSection = app.substring(0, index);
    subSection = app.substring(index + 1);
  }
  if(params) {
    app += '?' + params;
    var paramsArr = params.split('&');
    params = {};
    for(var i in paramsArr) {
      var param = paramsArr[i].split('=');
      params[param[0]] = param[1];
    }
  }
  return {app:app, topSection:topSection, subSection:subSection, params:params};
}

function exploreFeatured() {
  registry.getAllApps(function(appsObj) {
    var apps = [];
    for(var i in appsObj) apps.push(appsObj[i]);
    generateAppsHtml(apps, function(html) {
      $('#Explore #Featured').html(html);
    })
  })
}

function exploreAuthor(author) {
  registry.getByAuthor(author, function(appsObj) {
    var apps = [];
    for(var i in appsObj) apps.push(appsObj[i]);
    generateBreadCrumbs({author:author},function(appHTML) {
      $('#Explore #Author').html(appHTML);
      generateAppsHtml(apps, function(html) {
        $('#Explore #Author').append(html);
      })
    })
  })
}

function exploreFilter(params) {
  var filters = {};
  if(params.types) {
    filters.types = params.types.split(',');
    for(var i in filters.types) $('.sidenav-items input[name=' + filters.types[i] + ']').attr('checked', true);
  } else if(params.services) {
    filters.services = params.services.split(',');
    for(var i in filters.services) $('.sidenav-items input[name=' + filters.services[i] + ']').attr('checked', true);
  }

  registry.getByFilter(filters, function(appsObj) {
    var apps = [];
    for(var i in appsObj) apps.push(appsObj[i]);
    var breadcrumbs = [];
    for(var i in filters.types) breadcrumbs.push({type:filters.types[i], name:prettyName(filters.types[i])});
    for(var i in filters.services) breadcrumbs.push({service:filters.services[i], name:prettyName(filters.services[i])});
    generateBreadCrumbs({filters:breadcrumbs}, function(appHTML) {
      $('#Explore #Filter').html(appHTML);
      if(!(apps.length > 0)) {
        $('#Explore #Filter').append("<div id='no-results'>No app like that exists...yet. Why don't you <a href='#' class='orange iframeLink' data-id='Create'>create the first</a>?</div>");
      } else {
        generateAppsHtml(apps, function(html) {
          $('#Explore #Filter').append(html);
        })
      }
    })
  })
}

function prettyName(str) {
  return prettyNames[str] || capitalizeFirstLetter(str);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function exploreDetails(appName) {
  registry.getApp(appName, function(app) {
    generateBreadCrumbs({app:app},function(appHTML) {
      $('#Explore #Details').html(appHTML);
      generateAppDetailsHtml(app, function(html) {
        $('#Explore #Details').append(html);
      });
    });
  });
}

function appCardHover(e) {
  if (e.type === 'mouseenter') {
    $(e.currentTarget).find('.screenshot').stop().animate({'top': '100px'});
  } else {
    $(e.currentTarget).find('.screenshot').stop().animate({'top': '0px'});
  }
}