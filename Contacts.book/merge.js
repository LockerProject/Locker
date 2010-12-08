// merge contacts from journals
var fs = require('fs');

var fb_json = "../Facebook.journal/my/contacts.json";
var gc_dir = "../gcontacts.journal/my/";
var ab_json = "../osxAddressBook.journal/my/contacts.json";

var ccount = 0;
var contacts = {};
var debug = false;

function cadd(c) {
    var key = c.name.toLowerCase();
    if (contacts[key]) {
        // merge
        mergeContacts(contacts[key], c);
    } else {
        contacts[key] = c;
        ccount++;
    }
}

/**
 * name
 * email
 * phone
 * address
 * pic (avatar)
 */
function mergeContacts(one, two) {
    mergeArrayInObjects(one, two, "email", function(obj1, obj2) {
        return obj1.value.toLowerCase() == obj2.value.toLowerCase();
    });
    mergeArrayInObjects(one, two, "phone", function(obj1, obj2) {
        return obj1.value.replace(/[^0-9]/g,'').toLowerCase() ==
               obj2.value.replace(/[^0-9]/g,'').toLowerCase();
    });
    mergeArrayInObjects(one, two, "address", function(obj1, obj2) {
        return obj1.value.replace(/[,\s!.#-()@]/g,'').toLowerCase() == 
               obj2.value.replace(/[,\s!.#-()@]/g,'').toLowerCase();
    });
}

function mergeArrayInObjects(obj1, obj2, arrayName, objectsAreEqual) {
    if(obj1[arrayName]) {
        if(obj2[arrayName]) {
            mergeArrays(obj1[arrayName], obj2[arrayName], objectsAreEqual);
        }
    } else if(obj2[arrayName]) {
        obj1[arrayName] = obj2[arrayName];
    }
}

function mergeArrays(one, two, equals) {
    for(var i = 0; i < two.length; i++) {
        var present = false;
        for(var j = 0; j < one.length; j++) {
            if(equals(one[j], two[i]))
                present = true;
        }
        if(!present)
            one.push(two[i]);
    }
}

if (fs.statSync(fb_json)) {
    var js = fs.readFileSync(fb_json, 'utf-8');
    var cs = js.split("\n");
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != "{") continue;
        if(debug) console.log(cs[i]);
        var cj = JSON.parse(cs[i]);
        cadd(cj);
    }
}

if (fs.statSync(ab_json)) {
    var js = fs.readFileSync(ab_json, 'utf-8');
    var cs = js.split("\n");
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != "{") continue;
        if(debug) console.log(cs[i]);
        var cj = JSON.parse(cs[i]);
        cadd(cj);
    }
}

var gcfiles = fs.readdirSync(gc_dir);
for (var i = 0; i < gcfiles.length; i++) {
    if (gcfiles[i].indexOf(".contacts.json") <= 0) continue;
    var js = fs.readFileSync(gc_dir + "/" + gcfiles[i], 'utf-8');
    var cs = js.split("\n");
    for (var j = 0; j < cs.length; j++) {
        if (cs[j].substr(0, 1) != "{") continue;
        if(debug) console.log(cs[j]);
        var cj = JSON.parse(cs[j]);
        if (cj.name == null) {
            if (cj.email && cj.email.length > 0) cj.name = cj.email[0].value;
            else cj.name = cj.id;
            if(debug) console.log("name reassigned to " + cj.name);
        }
        cadd(cj);
    }

}

var stream = fs.createWriteStream("my/contacts.json");
for (var c in contacts) {
    stream.write(JSON.stringify(contacts[c]) + "\n");
}
stream.end();


console.log("got " + ccount + " contacts");
