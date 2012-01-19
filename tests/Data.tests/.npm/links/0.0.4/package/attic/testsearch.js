var clucene = require('clucene').CLucene;
var lucene = new clucene.Lucene();
var path = require('path');
var fs = require('fs');

var indexPath = process.cwd() + "/testsearch.index";
if (!path.existsSync(indexPath)) {
  fs.mkdirSync(indexPath, 0755);
};

var EStore = {
  STORE_YES: 1,
  STORE_NO: 2,
  STORE_COMPRESS: 4
};

var EIndex = {
  INDEX_NO: 16,
  INDEX_TOKENIZED: 32,
  INDEX_UNTOKENIZED: 64,
  INDEX_NONORMS: 128,
};


function ndx(id,at,txt,cb)
{
    var doc = new clucene.Document();
    doc.addField("at", at, EStore.STORE_YES|EIndex.INDEX_UNTOKENIZED);
    doc.addField('content', txt, EStore.STORE_NO|EIndex.INDEX_TOKENIZED);
    lucene.addDocument(id, doc, indexPath, function(err, indexTime, docsReplaced) {
        cb(err, indexTime, docsReplaced);
    });
}    


ndx("jer","1234567","jer was here bar",function(err){
    console.log("indexed "+err);
    lucene.search(indexPath, "content:(bar)",function(err, res, time){
       console.log("err:"+err);
       console.log("res:"+JSON.stringify(res));
       console.log("time:"+time); 
    });
});
