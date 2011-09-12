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
symbols_: {"error":2,"queryBase":3,"prefix":4,"argList":5,"EOF":6,"literal_op":7,"GREATER":8,"GREATER_EQUAL":9,"LESSER":10,"LESSER_EQUAL":11,"NOT_EQUAL":12,"literal":13,"NUMBER":14,"STRING":15,"member":16,"KEY":17,".":18,"expression":19,"colon":20,"OR":21,"AND":22,"expressionSubset":23,"(":24,"expressionList":25,")":26,",":27,"array":28,"[":29,"]":30,"arg":31,"=":32,"&":33,"$accept":0,"$end":1},
terminals_: {2:"error",4:"prefix",6:"EOF",8:"GREATER",9:"GREATER_EQUAL",10:"LESSER",11:"LESSER_EQUAL",12:"NOT_EQUAL",14:"NUMBER",15:"STRING",17:"KEY",18:".",20:"colon",21:"OR",22:"AND",24:"(",26:")",27:",",29:"[",30:"]",32:"=",33:"&"},
productions_: [0,[3,3],[7,1],[7,1],[7,1],[7,1],[7,1],[13,1],[13,1],[13,2],[16,1],[16,3],[19,1],[19,3],[19,3],[19,3],[19,1],[23,3],[25,1],[25,3],[28,3],[31,3],[31,3],[5,1],[5,3]],
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
case 9:this.$ = [$$[$0], $$[$0-1]];
break;
case 10:this.$ = $$[$0];
break;
case 11:this.$ = $$[$0-2] + '.' + $$[$0];
break;
case 12:this.$ = ['literal', $$[$0]]
break;
case 13:this.$ = ['keyValue', $$[$0-2], $$[$0]];
break;
case 14:this.$ = ['OR', [$$[$0-2], $$[$0]]]
break;
case 15:this.$ = ['AND', [$$[$0-2], $$[$0]]]
break;
case 16:this.$ = $$[$0];
break;
case 17:this.$ = ['subset', $$[$0-1]];
break;
case 18:this.$ = [$$[$0]];
break;
case 19:this.$ = $$[$0-2]; this.$.push($$[$0]);
break;
case 20:this.$ = $$[$0-1];
break;
case 21:this.$ = [$$[$0-2], $$[$0]];
break;
case 22:this.$ = [$$[$0-2], $$[$0]];
break;
case 23:this.$ = {}; this.$[$$[$0][0]] = $$[$0][1];
break;
case 24:$$[$0-2][$$[$0][0]] = $$[$0][1];
break;
}
},
table: [{3:1,4:[1,2]},{1:[3]},{5:3,17:[1,5],31:4},{6:[1,6],33:[1,7]},{6:[2,23],33:[2,23]},{32:[1,8]},{1:[2,1]},{17:[1,5],31:9},{13:11,14:[1,13],15:[1,14],28:10,29:[1,12]},{6:[2,24],33:[2,24]},{6:[2,21],33:[2,21]},{6:[2,22],7:15,8:[1,16],9:[1,17],10:[1,18],11:[1,19],12:[1,20],33:[2,22]},{13:23,14:[1,13],15:[1,14],16:24,17:[1,26],19:22,23:25,24:[1,27],25:21},{6:[2,7],8:[2,7],9:[2,7],10:[2,7],11:[2,7],12:[2,7],21:[2,7],22:[2,7],26:[2,7],27:[2,7],30:[2,7],33:[2,7]},{6:[2,8],8:[2,8],9:[2,8],10:[2,8],11:[2,8],12:[2,8],21:[2,8],22:[2,8],26:[2,8],27:[2,8],30:[2,8],33:[2,8]},{6:[2,9],8:[2,9],9:[2,9],10:[2,9],11:[2,9],12:[2,9],21:[2,9],22:[2,9],26:[2,9],27:[2,9],30:[2,9],33:[2,9]},{6:[2,2],8:[2,2],9:[2,2],10:[2,2],11:[2,2],12:[2,2],21:[2,2],22:[2,2],26:[2,2],27:[2,2],30:[2,2],33:[2,2]},{6:[2,3],8:[2,3],9:[2,3],10:[2,3],11:[2,3],12:[2,3],21:[2,3],22:[2,3],26:[2,3],27:[2,3],30:[2,3],33:[2,3]},{6:[2,4],8:[2,4],9:[2,4],10:[2,4],11:[2,4],12:[2,4],21:[2,4],22:[2,4],26:[2,4],27:[2,4],30:[2,4],33:[2,4]},{6:[2,5],8:[2,5],9:[2,5],10:[2,5],11:[2,5],12:[2,5],21:[2,5],22:[2,5],26:[2,5],27:[2,5],30:[2,5],33:[2,5]},{6:[2,6],8:[2,6],9:[2,6],10:[2,6],11:[2,6],12:[2,6],21:[2,6],22:[2,6],26:[2,6],27:[2,6],30:[2,6],33:[2,6]},{27:[1,29],30:[1,28]},{21:[1,30],22:[1,31],26:[2,18],27:[2,18],30:[2,18]},{7:15,8:[1,16],9:[1,17],10:[1,18],11:[1,19],12:[1,20],21:[2,12],22:[2,12],26:[2,12],27:[2,12],30:[2,12]},{18:[1,33],20:[1,32]},{21:[2,16],22:[2,16],26:[2,16],27:[2,16],30:[2,16]},{18:[2,10],20:[2,10]},{13:23,14:[1,13],15:[1,14],16:24,17:[1,26],19:22,23:25,24:[1,27],25:34},{6:[2,20],33:[2,20]},{13:23,14:[1,13],15:[1,14],16:24,17:[1,26],19:35,23:25,24:[1,27]},{13:23,14:[1,13],15:[1,14],16:24,17:[1,26],19:36,23:25,24:[1,27]},{13:23,14:[1,13],15:[1,14],16:24,17:[1,26],19:37,23:25,24:[1,27]},{13:38,14:[1,13],15:[1,14]},{17:[1,39]},{26:[1,40],27:[1,29]},{21:[1,30],22:[1,31],26:[2,19],27:[2,19],30:[2,19]},{21:[2,14],22:[2,14],26:[2,14],27:[2,14],30:[2,14]},{21:[2,15],22:[2,15],26:[2,15],27:[2,15],30:[2,15]},{7:15,8:[1,16],9:[1,17],10:[1,18],11:[1,19],12:[1,20],21:[2,13],22:[2,13],26:[2,13],27:[2,13],30:[2,13]},{18:[2,11],20:[2,11]},{21:[2,17],22:[2,17],26:[2,17],27:[2,17],30:[2,17]}],
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
var lexer = (function(){var lexer = ({EOF:1,
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
case 1:return 21;
break;
case 2:return 22;
break;
case 3:return 33;
break;
case 4:return 18;
break;
case 5:{yy_.yytext = yy_.yytext.substr(1, yy_.yyleng-2); return 15;}
break;
case 6:{yy_.yytext = yy_.yytext.substr(1, yy_.yyleng-2); return 15;}
break;
case 7:return 14;
break;
case 8:return 29
break;
case 9:return 30
break;
case 10:return 17;
break;
case 11:return '?';
break;
case 12:return 32;
break;
case 13:return 27;
break;
case 14:return 24;
break;
case 15:return 26;
break;
case 16:return 20;
break;
case 17:return 9;
break;
case 18:return 8;
break;
case 19:return 11;
break;
case 20:return 10;
break;
case 21:return 12;
break;
case 22:yy_.yytext = yy_.yytext.substr(4, yy_.yyleng-5); return 4;
break;
case 23:return 6;
break;
}
};
lexer.rules = [/^\s+/,/^OR/,/^AND/,/^&/,/^\./,/^'[^']+'/,/^"[^"]+"/,/^[0-9]+/,/^\[/,/^\]/,/^[a-zA-z]+/,/^\?/,/^=/,/^,/,/^\(/,/^\)/,/^:/,/^\+\./,/^\+/,/^\-\./,/^\-/,/^\!=/,/^\/get.+\?/,/^$/];
lexer.conditions = {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23],"inclusive":true}};return lexer;})()
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
                if (typeof(node) == "number")
                    return Number(node);
                else
                    return String(node);
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
    if (parseTree[1].hasOwnProperty("fields")) {
        queryResult.fields = {};
        for (var i = 0; i < parseTree[1].fields.length; i++) {
            queryResult.fields[parseTree[1].fields[i][1]] = 1;
        }
    }

    return queryResult;
}

