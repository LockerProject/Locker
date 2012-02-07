var fs = require("fs");
var md = require("node-markdown").Markdown;
var path = require("path");
var dir = "static";
var files = fs.readdirSync("static");
for (var i = 0; i < files.length; i++) {
    var file = path.join(dir,files[i]);
    if(file.indexOf(".md") < 0) continue;
    console.log("processing "+file);
    var mdat = fs.readFileSync(file,'utf8');
    fs.writeFileSync(file.replace(".md",".html"),md(mdat),'utf8');
}
