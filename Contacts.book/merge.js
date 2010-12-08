// merge contacts from journals

var fs = require('fs');

var fb_json = "../Facebook.journal/my/contacts.json";
var gc_dir = "../gcontacts.journal/my/";
var ab_json = "../osxAddressBook.journal/my/contacts.json";

var ccount=0;
var contacts = {};

function cadd(c)
{
	if(contacts[c.name])
	{
		// merge
	}else{
		contacts[c.name] = c;
		ccount++;
	}
}

if(fs.statSync(fb_json))
{
	var js = fs.readFileSync(fb_json,'utf-8');
	var cs = js.split("\n");
	for(var i=0;i<cs.length;i++)
	{
		if(cs[i].substr(0,1) != "{") continue;
		console.log(cs[i]);
		var cj = JSON.parse(cs[i]);
		cadd(cj);
	}
}

if(fs.statSync(ab_json))
{
	var js = fs.readFileSync(ab_json,'utf-8');
	var cs = js.split("\n");
	for(var i=0;i<cs.length;i++)
	{
		if(cs[i].substr(0,1) != "{") continue;
		console.log(cs[i]);
		var cj = JSON.parse(cs[i]);
		cadd(cj);
	}
}

var gcfiles = fs.readdirSync(gc_dir);
for(var i=0;i<gcfiles.length;i++)
{
	if(gcfiles[i].indexOf(".contacts.json") <= 0) continue;
	var js = fs.readFileSync(gc_dir+"/"+gcfiles[i],'utf-8');
	var cs = js.split("\n");
	for(var i=0;i<cs.length;i++)
	{
		if(cs[i].substr(0,1) != "{") continue;
		console.log(cs[i]);
		var cj = JSON.parse(cs[i]);
		if(cj.name == null)
		{
			if(cj.email && cj.email.length > 0) cj.name = cj.email[0].value;
			else cj.name = cj.id;
			console.log("name reassigned to "+cj.name);
		}
		cadd(cj);
	}
	
}

var stream = fs.createWriteStream("my/contacts.json");
for(var c in contacts)
{
	stream.write(JSON.stringify(contacts[c])+"\n");
}
stream.end();
	

console.log("got "+ccount+" contacts");
