var locker = require(__dirname + "/locker");

exports.dateToObjectID = function(date) {
	var d = parseInt(date.getTime() / 1000, 10);
	var hexStr = [((d & 0xff000000) >> 24), ((d & 0xff0000) >> 16), ((d & 0xff00) >> 8), ((d & 0xff))].map(function(num) { return (num < 10 ? "0":"") + num.toString(16); }).join("") + "0000000000000000"
	//console.log(require("util").inspect(locker.lmongoclient.dbClient, true, 5));
	var obj = locker.lmongoclient.db.bson_serializer.ObjectID.createFromHexString(hexStr);
	return obj;
}

exports.ObjectID = function(id) {
	return new locker.lmongoclient.db.bson_serializer.ObjectID(id);
}