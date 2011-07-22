var telehash = require("./telehash");

var s = new telehash.createSwitch();
s.setSeeds(["telehash.org:42424","6.singly.com:42424","208.68.160.25:42424"]);
s.start();

