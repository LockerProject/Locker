// merge contacts from journals
var fs = require('fs');

var fb_json = "../Facebook.journal/my/contacts.json";
var gc_dir = "../gcontacts.journal/my/";
var ab_json = "../osxAddressBook.journal/my/contacts.json";

var ccount = 0;
var contacts = {};
var debug = false;

function cadd(c, source) {
    morphContact(c, source);
    var key = c.name.replace(/[A-Z]\./g, '').toLowerCase().replace(/\s/g, '');
    if (contacts[key]) {
        // merge
        mergeContacts(contacts[key], c);
    } else {
        contacts[key] = c;
        ccount++;
    }
}

function morphContact(c, source) {
    if(source.type == 'google_contacts') {
        c.pic = [source.account + '/' + c.id + '.jpg'];
    }
}

function copyPhotos(sourceDir, subdir) {
    var sourceSub = sourceDir + '/' + subdir;
    var newSub = 'my/photos/' + subdir;
    try {
        fs.mkdirSync(process.cwd() + '/my/photos', 0777);
    } catch (err) {}
    try {
        var files = fs.readdirSync(sourceSub);
    } catch(err) {
        return;
    }
    if(!files)
        return null;
    try {
        fs.mkdirSync(newSub, 0777);
    } catch(err) { return; }
    for(var i = 0; i < files.length; i++) {
        fs.linkSync(sourceSub + '/' + files[i], newSub + '/' + files[i]);
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
    mergeArrayInObjects(one, two, "pic",  function(obj1, obj2) {return false;});
}

/**
 * Merge two arrays of the name arrayName in two objects
 */
function mergeArrayInObjects(obj1, obj2, arrayName, entriesAreEqual) {
    if(obj1[arrayName]) {
        if(obj2[arrayName]) {
            mergeArrays(obj1[arrayName], obj2[arrayName], entriesAreEqual);
        }
    } else if(obj2[arrayName]) {
        obj1[arrayName] = obj2[arrayName];
    }
}

/**
 * Merge two arrays, removing duplicates that match based on equals function
 */
function mergeArrays(one, two, entriesAreEqual) {
    for(var i = 0; i < two.length; i++) {
        var present = false;
        for(var j = 0; j < one.length; j++) {
            if(entriesAreEqual(one[j], two[i]))
                present = true;
        }
        if(!present)
            one.push(two[i]);
    }
}


/**
 * Reads in a file (at path), splits by line, and parses each line as JSON.
 * return parsed objects in an array
 */
function parseLinesOfJSONFile(path) {
    var objects = [];
    var cs = fs.readFileSync(path, 'utf-8').split("\n");
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != "{") continue;
        if(debug) console.log(cs[i]);
        objects.push(JSON.parse(cs[i]));
    }
    return objects;
}

/**
 * Read in files from Facebook.journal
 */
if (fs.statSync(fb_json)) {
    var cs = parseLinesOfJSONFile(fb_json);
    for (var i = 0; i < cs.length; i++) {
        cadd(cs[i], {type: 'facebook', account: ''});
    }
}

/**
 * Read in files from osxAddressBook.journal
 */
if (fs.statSync(ab_json)) {
    var cs = parseLinesOfJSONFile(ab_json);
    for (var i = 0; i < cs.length; i++) {
        cadd(cs[i], {type: 'address_book'});
    }
}

/**
 * Read in files from gcontacts.journal
 */
var gcfiles = fs.readdirSync(gc_dir);
for (var i = 0; i < gcfiles.length; i++) {
    if (gcfiles[i].indexOf(".contacts.json") <= 0) continue;
    var id = gcfiles[i].substr(0, gcfiles[i].length - 14);
    var filename = gc_dir + "/" + gcfiles[i];
    var cs = parseLinesOfJSONFile(filename);
    for (var j = 0; j < cs.length; j++) {
        var cj = cs[j];
        if (cj.name == null) {
            if (cj.email && cj.email.length > 0)
                cj.name = cj.email[0].value;
            else
                cj.name = cj.id;
            if(debug) console.log("name reassigned to " + cj.name);
        }
        cadd(cj, {type: 'google_contacts', account: id});
    }
    copyPhotos(gc_dir + 'photos', id);
}

var stream = fs.createWriteStream("my/contacts.json");
for (var c in contacts) {
    stream.write(JSON.stringify(contacts[c]) + "\n");
}
stream.end();


console.log("got " + ccount + " contacts");
