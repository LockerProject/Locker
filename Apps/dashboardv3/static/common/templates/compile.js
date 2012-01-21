var dust = require('dust')
  , fs   = require('fs')
  , path = require('path');


var compiled = '';
for(var i = 2; i < process.argv.length; i++) {
  var filename = process.argv[i];
  var text = fs.readFileSync(filename).toString();
  var name = path.basename(filename, '.html');
  compiled += dust.compile(text, name) + '\n';
}

fs.writeFileSync('../js/compiled_templates.js', compiled);