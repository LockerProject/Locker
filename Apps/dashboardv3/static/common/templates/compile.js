var dust = require('dust');
var fs = require('fs');


var compiled = '';
for(var i = 2; i < process.argv.length; i++) {
  var filename = process.argv[i];
  var text = fs.readFileSync(filename).toString();
  var name = filename.substring(0, filename.length - 5);
  compiled += dust.compile(text, name) + '\n';
}

fs.writeFileSync('../js/compiled_templates.js', compiled);