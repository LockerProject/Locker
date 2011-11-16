/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/* Jison generated parser */
var lpquery = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"queryBase":3,"prefix":4,"argList":5,"EOF":6,"literal_op":7,"GREATER":8,"GREATER_EQUAL":9,"LESSER":10,"LESSER_EQUAL":11,"NOT_EQUAL":12,"literal":13,"NUMBER":14,"STRING":15,"BOOLEAN":16,"literal_expression":17,".":18,"member":19,"KEY":20,"expression":21,"colon":22,"OR":23,"AND":24,"expressionSubset":25,"(":26,"expressionList":27,")":28,",":29,"array":30,"[":31,"]":32,"arg":33,"=":34,"&":35,"$accept":0,"$end":1},
terminals_: {2:"error",4:"prefix",6:"EOF",8:"GREATER",9:"GREATER_EQUAL",10:"LESSER",11:"LESSER_EQUAL",12:"NOT_EQUAL",14:"NUMBER",15:"STRING",16:"BOOLEAN",18:".",20:"KEY",22:"colon",23:"OR",24:"AND",26:"(",28:")",29:",",31:"[",32:"]",34:"=",35:"&"},
productions_: [0,[3,3],[7,1],[7,1],[7,1],[7,1],[7,1],[13,1],[13,1],[13,1],[17,1],[17,2],[17,3],[17,3],[17,4],[17,4],[19,1],[19,3],[21,1],[21,3],[21,3],[21,3],[21,1],[25,3],[27,1],[27,3],[30,3],[33,3],[33,3],[5,1],[5,3]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1:return [$$[$0-2], $$[$0-1]];
break;
case 2:this.$ = $$[$0];
break;
case 3:this.$ = $$[$0];
break;
case 4:this.$ = $$[$0];
break;
case 5:this.$ = $$[$0];
break;
case 6:this.$ = $$[$0];
break;
case 7:this.$ = Number(yytext);
break;
case 8:this.$ = $$[$0];
break;
case 9:this.$ = (yytext == 'true');
break;
case 10:this.$ = $$[$0];
break;
case 11:this.$ = [$$[$0], $$[$0-1]];
break;
case 12:this.$ = ['range', $$[$0-2], $$[$0]];
break;
case 13:this.$ = ['range_eq', $$[$0-2], $$[$0]];
break;
case 14:this.$ = ['eq_range', $$[$0-3], $$[$0]];
break;
case 15:this.$ = ['eq_range_eq', $$[$0-3], $$[$0]];
break;
case 16:this.$ = $$[$0];
break;
case 17:this.$ = $$[$0-2] + '.' + $$[$0];
break;
case 18:this.$ = ['literal', $$[$0]]
break;
case 19:this.$ = ['keyValue', $$[$0-2], $$[$0]];
break;
case 20:this.$ = ['OR', [$$[$0-2], $$[$0]]]
break;
case 21:this.$ = ['AND', [$$[$0-2], $$[$0]]]
break;
case 22:this.$ = $$[$0];
break;
case 23:this.$ = ['subset', $$[$0-1]];
break;
case 24:this.$ = [$$[$0]];
break;
case 25:this.$ = $$[$0-2]; this.$.push($$[$0]);
break;
case 26:this.$ = $$[$0-1];
break;
case 27:this.$ = [$$[$0-2], $$[$0]];
break;
case 28:this.$ = [$$[$0-2], $$[$0]];
break;
case 29:this.$ = {}; this.$[$$[$0][0]] = $$[$0][1];
break;
case 30:$$[$0-2][$$[$0][0]] = $$[$0][1];
break;
}
},
table: [{3:1,4:[1,2]},{1:[3]},{5:3,20:[1,5],33:4},{6:[1,6],35:[1,7]},{6:[2,29],35:[2,29]},{34:[1,8]},{1:[2,1]},{20:[1,5],33:9},{13:11,14:[1,13],15:[1,14],16:[1,15],30:10,31:[1,12]},{6:[2,30],35:[2,30]},{6:[2,27],35:[2,27]},{6:[2,28],35:[2,28]},{13:18,14:[1,13],15:[1,14],16:[1,15],19:19,20:[1,21],21:17,25:20,26:[1,22],27:16},{6:[2,7],8:[2,7],9:[2,7],10:[2,7],11:[2,7],12:[2,7],18:[2,7],23:[2,7],24:[2,7],28:[2,7],29:[2,7],32:[2,7],35:[2,7]},{6:[2,8],8:[2,8],9:[2,8],10:[2,8],11:[2,8],12:[2,8],18:[2,8],23:[2,8],24:[2,8],28:[2,8],29:[2,8],32:[2,8],35:[2,8]},{6:[2,9],8:[2,9],9:[2,9],10:[2,9],11:[2,9],12:[2,9],18:[2,9],23:[2,9],24:[2,9],28:[2,9],29:[2,9],32:[2,9],35:[2,9]},{29:[1,24],32:[1,23]},{23:[1,25],24:[1,26],28:[2,24],29:[2,24],32:[2,24]},{23:[2,18],24:[2,18],28:[2,18],29:[2,18],32:[2,18]},{18:[1,28],22:[1,27]},{23:[2,22],24:[2,22],28:[2,22],29:[2,22],32:[2,22]},{18:[2,16],22:[2,16]},{13:18,14:[1,13],15:[1,14],16:[1,15],19:19,20:[1,21],21:17,25:20,26:[1,22],27:29},{6:[2,26],35:[2,26]},{13:18,14:[1,13],15:[1,14],16:[1,15],19:19,20:[1,21],21:30,25:20,26:[1,22]},{13:18,14:[1,13],15:[1,14],16:[1,15],19:19,20:[1,21],21:31,25:20,26:[1,22]},{13:18,14:[1,13],15:[1,14],16:[1,15],19:19,20:[1,21],21:32,25:20,26:[1,22]},{13:34,14:[1,13],15:[1,14],16:[1,15],17:33},{20:[1,35]},{28:[1,36],29:[1,24]},{23:[1,25],24:[1,26],28:[2,25],29:[2,25],32:[2,25]},{23:[2,20],24:[2,20],28:[2,20],29:[2,20],32:[2,20]},{23:[2,21],24:[2,21],28:[2,21],29:[2,21],32:[2,21]},{23:[2,19],24:[2,19],28:[2,19],29:[2,19],32:[2,19]},{7:37,8:[1,41],9:[1,42],10:[1,38],11:[1,39],12:[1,43],18:[1,40],23:[2,10],24:[2,10],28:[2,10],29:[2,10],32:[2,10]},{18:[2,17],22:[2,17]},{23:[2,23],24:[2,23],28:[2,23],29:[2,23],32:[2,23]},{23:[2,11],24:[2,11],28:[2,11],29:[2,11],32:[2,11]},{13:44,14:[1,13],15:[1,14],16:[1,15],23:[2,4],24:[2,4],28:[2,4],29:[2,4],32:[2,4]},{13:45,14:[1,13],15:[1,14],16:[1,15],23:[2,5],24:[2,5],28:[2,5],29:[2,5],32:[2,5]},{10:[1,46],11:[1,47]},{23:[2,2],24:[2,2],28:[2,2],29:[2,2],32:[2,2]},{23:[2,3],24:[2,3],28:[2,3],29:[2,3],32:[2,3]},{23:[2,6],24:[2,6],28:[2,6],29:[2,6],32:[2,6]},{23:[2,12],24:[2,12],28:[2,12],29:[2,12],32:[2,12]},{23:[2,13],24:[2,13],28:[2,13],29:[2,13],32:[2,13]},{13:48,14:[1,13],15:[1,14],16:[1,15]},{13:49,14:[1,13],15:[1,14],16:[1,15]},{23:[2,14],24:[2,14],28:[2,14],29:[2,14],32:[2,14]},{23:[2,15],24:[2,15],28:[2,15],29:[2,15],32:[2,15]}],
defaultActions: {6:[2,1]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this,
        stack = [0],
        vstack = [null], // semantic value stack
        lstack = [], // location stack
        table = this.table,
        yytext = '',
        yylineno = 0,
        yyleng = 0,
        recovering = 0,
        TERROR = 2,
        EOF = 1;

    //this.reductionCount = this.shiftCount = 0;

    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    if (typeof this.lexer.yylloc == 'undefined')
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);

    if (typeof this.yy.parseError === 'function')
        this.parseError = this.yy.parseError;

    function popStack (n) {
        stack.length = stack.length - 2*n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }

    function lex() {
        var token;
        token = self.lexer.lex() || 1; // $end = 1
        // if token isn't its numeric value, convert
        if (typeof token !== 'number') {
            token = self.symbols_[token] || token;
        }
        return token;
    };

    var symbol, preErrorSymbol, state, action, a, r, yyval={},p,len,newState, expected;
    while (true) {
        // retreive state number from top of stack
        state = stack[stack.length-1];

        // use default actions if available
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol == null)
                symbol = lex();
            // read action for current state and first input
            action = table[state] && table[state][symbol];
        }

        // handle parse error
        if (typeof action === 'undefined' || !action.length || !action[0]) {

            if (!recovering) {
                // Report error
                expected = [];
                for (p in table[state]) if (this.terminals_[p] && p > 2) {
                    expected.push("'"+this.terminals_[p]+"'");
                }
                var errStr = '';
                if (this.lexer.showPosition) {
                    errStr = 'Parse error on line '+(yylineno+1)+":\n"+this.lexer.showPosition()+'\nExpecting '+expected.join(', ');
                } else {
                    errStr = 'Parse error on line '+(yylineno+1)+": Unexpected " +
                                  (symbol == 1 /*EOF*/ ? "end of input" :
                                              ("'"+(this.terminals_[symbol] || symbol)+"'"));
                }
                this.parseError(errStr,
                    {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }

            // just recovered from another error
            if (recovering == 3) {
                if (symbol == EOF) {
                    throw new Error(errStr || 'Parsing halted.');
                }

                // discard current lookahead and grab another
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                symbol = lex();
            }

            // try to recover from error
            while (1) {
                // check for error recovery rule in this state
                if ((TERROR.toString()) in table[state]) {
                    break;
                }
                if (state == 0) {
                    throw new Error(errStr || 'Parsing halted.');
                }
                popStack(1);
                state = stack[stack.length-1];
            }

            preErrorSymbol = symbol; // save the lookahead token
            symbol = TERROR;         // insert generic error symbol as new lookahead
            state = stack[stack.length-1];
            action = table[state] && table[state][TERROR];
            recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
        }

        // this shouldn't happen, unless resolve defaults are off
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: '+state+', token: '+symbol);
        }

        switch (action[0]) {

            case 1: // shift
                //this.shiftCount++;

                stack.push(symbol);
                vstack.push(this.lexer.yytext);
                lstack.push(this.lexer.yylloc);
                stack.push(action[1]); // push state
                symbol = null;
                if (!preErrorSymbol) { // normal execution/no error
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    yyloc = this.lexer.yylloc;
                    if (recovering > 0)
                        recovering--;
                } else { // error just occurred, resume old lookahead f/ before error
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;

            case 2: // reduce
                //this.reductionCount++;

                len = this.productions_[action[1]][1];

                // perform semantic action
                yyval.$ = vstack[vstack.length-len]; // default to $$ = $1
                // default location, uses first token for firsts, last for lasts
                yyval._$ = {
                    first_line: lstack[lstack.length-(len||1)].first_line,
                    last_line: lstack[lstack.length-1].last_line,
                    first_column: lstack[lstack.length-(len||1)].first_column,
                    last_column: lstack[lstack.length-1].last_column
                };
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);

                if (typeof r !== 'undefined') {
                    return r;
                }

                // pop off stack
                if (len) {
                    stack = stack.slice(0,-1*len*2);
                    vstack = vstack.slice(0, -1*len);
                    lstack = lstack.slice(0, -1*len);
                }

                stack.push(this.productions_[action[1]][0]);    // push nonterminal (reduce)
                vstack.push(yyval.$);
                lstack.push(yyval._$);
                // goto new state = table[STATE][NONTERMINAL]
                newState = table[stack[stack.length-2]][stack[stack.length-1]];
                stack.push(newState);
                break;

            case 3: // accept
                return true;
        }

    }

    return true;
}};/* Jison generated lexer */
var lexer = (function(){

var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parseError) {
            this.yy.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext+=ch;
        this.yyleng++;
        this.match+=ch;
        this.matched+=ch;
        var lines = ch.match(/\n/);
        if (lines) this.yylineno++;
        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        this._input = ch + this._input;
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            match = this._input.match(this.rules[rules[i]]);
            if (match) {
                lines = match[0].match(/\n.*/g);
                if (lines) this.yylineno += lines.length;
                this.yylloc = {first_line: this.yylloc.last_line,
                               last_line: this.yylineno+1,
                               first_column: this.yylloc.last_column,
                               last_column: lines ? lines[lines.length-1].length-1 : this.yylloc.last_column + match[0].length}
                this.yytext += match[0];
                this.match += match[0];
                this.matches = match;
                this.yyleng = this.yytext.length;
                this._more = false;
                this._input = this._input.slice(match[0].length);
                this.matched += match[0];
                token = this.performAction.call(this, this.yy, this, rules[i],this.conditionStack[this.conditionStack.length-1]);
                if (token) return token;
                else return;
            }
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(), 
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    }});
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0:/* skip */
break;
case 1:return 23;
break;
case 2:return 24;
break;
case 3:return 35;
break;
case 4:return 18;
break;
case 5:{yy_.yytext = yy_.yytext.substr(1, yy_.yyleng-2); return 15;}
break;
case 6:{yy_.yytext = yy_.yytext.substr(1, yy_.yyleng-2); return 15;}
break;
case 7:return 14;
break;
case 8:return 31
break;
case 9:return 32
break;
case 10:return 20;
break;
case 11:return 16;
break;
case 12:return '?';
break;
case 13:return 34;
break;
case 14:return 29;
break;
case 15:return 26;
break;
case 16:return 28;
break;
case 17:return 22;
break;
case 18:return 9;
break;
case 19:return 8;
break;
case 20:return 11;
break;
case 21:return 10;
break;
case 22:return 12;
break;
case 23:yy_.yytext = yy_.yytext.substr(4, yy_.yyleng-5); return 4;
break;
case 24:return 6;
break;
}
};
lexer.rules = [/^\s+/,/^OR/,/^AND/,/^&/,/^\./,/^'[^']+'/,/^"[^"]+"/,/^[0-9]+/,/^\[/,/^\]/,/^(?:[a-eg-su-zA-Z_]|t(?!rue)|f(?!alse))[a-zA-Z_]*/,/^(?:true|false)/,/^\?/,/^=/,/^,/,/^\(/,/^\)/,/^:/,/^\+\./,/^\+/,/^\-\./,/^\-/,/^\!=/,/^\/get.+\?/,/^$/];
lexer.conditions = {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],"inclusive":true}};return lexer;})()
parser.lexer = lexer;
return parser;
})();

exports.parser = lpquery;
exports.parse = function () { return lpquery.parse.apply(lpquery, arguments); }

exports.buildMongoQuery = function(parseTree) {
    var treeTranslation = {
        translateNode:function(node) {
            if (node.hasOwnProperty("length") && treeTranslation.hasOwnProperty(node[0])) {
                return treeTranslation[node[0]](node);
            } else {
                switch (typeof(node)) {
                    case "number":
                        return Number(node); break;
                    case "boolean":
                        return Boolean(node); break;
                    default:
                        return String(node); break;
                }
            }
        },
        // The actual functions
        "keyValue":function(node) {
            var ret = {};
            ret[node[1]] = treeTranslation.translateNode(node[2]);
            return ret;
        },
        "subset":function(node) {
            var ret = {};
            node[1].forEach(function(nodeTerm) {
                var translatedNode = treeTranslation.translateNode(nodeTerm);
                for (var key in translatedNode) {
                    ret[key] = translatedNode[key];
                }
            });
            return ret;
        },
        "AND":function(node) {
            var ret = {$and:[]};
            node[1].forEach(function(nodeTerm) {
                ret["$and"].push(treeTranslation.translateNode(nodeTerm));
            });
            return ret;
        },
        "OR":function(node) {
            var ret = {$or:[]};
            node[1].forEach(function(nodeTerm) {
                ret["$or"].push(treeTranslation.translateNode(nodeTerm));
            });
            return ret;
        },
        "-":function(node) {
            return {$lt:treeTranslation.translateNode(node[1])};
        },
        "-.":function(node) {
            return {$lte:treeTranslation.translateNode(node[1])};
        },
        "+":function(node) {
            return {$gt:treeTranslation.translateNode(node[1])};
        },
        "+.":function(node) {
            return {$gte:treeTranslation.translateNode(node[1])};
        },
        "!=":function(node) {
            return {$ne:treeTranslation.translateNode(node[1])};
        },
        "range":function(node) {
            return {
                $gt:treeTranslation.translateNode(node[1]),
                $lt:treeTranslation.translateNode(node[2])
            };
        },
        "range_eq":function(node) {
            return {
                $gt:treeTranslation.translateNode(node[1]),
                $lte:treeTranslation.translateNode(node[2])
            };
        },
        "eq_range":function(node) {
            return {
                $gte:treeTranslation.translateNode(node[1]),
                $lt:treeTranslation.translateNode(node[2])
            };
        },
        "eq_range_eq":function(node) {
            return {
                $gte:treeTranslation.translateNode(node[1]),
                $lte:treeTranslation.translateNode(node[2])
            };
        }
    };
    var queryResult = {
        // TODO:  This needs a lookup on the actual collection name
        collection:parseTree[0].toLowerCase(), // Add the collection we're looking into
        query:{}
    }
    // If we have terms to query with, put them in
    if (parseTree[1].hasOwnProperty("terms")) {
        parseTree[1]["terms"].forEach(function(term) {
            var termRet = treeTranslation.translateNode(term);
            for (var key in termRet) {
                queryResult.query[key] = termRet[key];
            }
        });
    }
    // If we have a limit put that on
    if (parseTree[1].hasOwnProperty("limit")) {
        queryResult.limit = Number(parseTree[1]["limit"]);
    }
    // Skip into the offset supplied
    if (parseTree[1].hasOwnProperty("offset")) {
        queryResult.skip = Number(parseTree[1]["offset"]);
    }
    // If we have a sort put that on too, example query: http://localhost:8042/query/getContact?offset=0&limit=2&sort='{%22name%22:-1}'
    if (parseTree[1].hasOwnProperty("sort")) {
        try{
            queryResult.sort = JSON.parse(parseTree[1]["sort"]);
        }catch(e){
            console.error("ignoring sort: "+e);
        }
    }
    if (parseTree[1].hasOwnProperty("fields")) {
        queryResult.fields = {};
        for (var i = 0; i < parseTree[1].fields.length; i++) {
            queryResult.fields[parseTree[1].fields[i][1]] = 1;
        }
    }

    return queryResult;
}

