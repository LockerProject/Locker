var apps = {};
var added = {};
var repos = {};
$("#sync").click(function(){
    $.getJSON('/registry/sync', {}, function(js) {
        window.location.reload();
    });
    return false;
});

function loadApps(){
    $.getJSON('/registry/apps', {}, function(js) {
        console.log(js);
        if(Object.keys(repos).length == 0) getRepos(); // run first time only
        if (!js) return;
        apps = js;
        $.getJSON('/registry/added', {}, function(js) {
            console.log(js);
            if (!js) return;
            added = js;
            $("#apps").html("");
            Object.keys(apps).forEach(function(name) {
                var app = apps[name];
                var say = (added[name]) ? "view" : "add";
                var href = (added[name]) ? "/Me/"+name+"/" : "";
                $("#apps").append("<li id='li-"+name+"'>" + app.repository.title + " (<a id='" + name + "' href='"+href+"'>"+say+"</a>) - "+app.description+"</li>");
                $("#" + name).click(function() {
                    if(added[name]) return true;
                    this.innerHTML = "adding..."
                    var a = this;
                    $.getJSON('/registry/add/'+name, {}, function(js) {
                        a.innerHTML = "view";
                        $("#"+name).attr("href","/Me/"+name+"/");
                        added[name] = app;
                    });
                    return false;
                })
            });
        });
    });
}
loadApps();

function getRepos(){
    $.getJSON('/Me/github/getCurrent/repo', {}, function(repoa) {
        console.log(repoa);
        if (!repoa || !repoa.length) return;
        repoa.forEach(function(repo) {
            repos[repo.name] = repo;
            var existing = apps[("app-"+repo.owner+"-"+repo.name).toLowerCase()];
            var publish = (existing) ? "re-publish" : "publish";
            $("#repos").append("<li id='li-"+repo._id+"'>" + repo.name + " (<a id='" + repo._id + "' href=''>"+publish+"</a>)</li>");
            $("#" + repo._id).click(function() {
                var args = (existing) ? {} : {description: repo.description};
                this.innerHTML = "publishing..."
                var a = this;
                $.getJSON('/registry/publish/'+repo.owner+'-'+repo.name, args, function(js) {
                    a.innerHTML = "published!";
                    $("#li-"+repo._id).append("<pre>\n"+JSON.stringify(js, null, 4)+"</pre>");
                    loadApps();
                });
                return false;
            });
        });
    })
}
