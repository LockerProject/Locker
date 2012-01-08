var grammar = {
  "lex": {
    "rules": [
      ["\\s+", "/* skip */"],
      [ "OR", "return 'OR';" ],
      [ "AND", "return 'AND';" ],
      [ "&", "return '&';" ],
      ["\\.", "return '.';"],
      [
        "'[^']+'",
        "{yytext = yytext.substr(1, yyleng-2); return 'STRING';}"
      ],
      [
        "\"[^\"]+\"",
        "{yytext = yytext.substr(1, yyleng-2); return 'STRING';}"
      ],
      ["[0-9]+", "return 'NUMBER';"],
      ["\\[", "return '['"],
      ["\\]", "return ']'"],
      ["(?:[a-eg-su-zA-Z_]|t(?!rue)|f(?!alse))[a-zA-Z_]*", "return 'KEY';"],
      ["(?:true|false)", "return 'BOOLEAN';"],
      ["\\?", "return '?';" ],
      ["=", "return '=';" ],
      [",", "return ',';" ],
      ["\\(", "return '(';" ],
      ["\\)", "return ')';" ],
      [":", "return 'colon';" ],
      ["\\+\\.", "return 'GREATER_EQUAL';"],
      ["\\+", "return 'GREATER';"],
      ["\\-\\.", "return 'LESSER_EQUAL';"],
      ["\\-", "return 'LESSER';"],
      ["\\!=", "return 'NOT_EQUAL';"],
      [
        "\\/get.+\\?",
        "yytext = yytext.substr(4, yyleng-5); return 'prefix';"
      ],
      [ "$", "return 'EOF';" ]
    ]
  },
  "operators": [
      ["left", "GREATER_EQUAL", "LESSER_EQUAL", "GREATER", "LESSER", "NOT_EQUAL", "OR", "AND"]
  ],
  "start": "queryBase",
  "bnf": {
    "queryBase": [ ["prefix argList EOF", "return [$1, $2];"] ],
    "literal_op" : [
        ["GREATER", "$$ = $1;"],
        ["GREATER_EQUAL", "$$ = $1;"],
        ["LESSER", "$$ = $1;"],
        ["LESSER_EQUAL", "$$ = $1;"],
        ["NOT_EQUAL", "$$ = $1;"]
    ],
    "literal" : [
        ["NUMBER", "$$ = Number(yytext);"],
        ["STRING", "$$ = $1;"],
        ["BOOLEAN", "$$ = (yytext == 'true');"]
    ],
    "literal_expression" : [
        ["literal", "$$ = $1;"],
        ["literal literal_op", "$$ = [$2, $1];"],
        ["literal LESSER literal", "$$ = ['range', $1, $3];"],
        ["literal LESSER_EQUAL literal", "$$ = ['range_eq', $1, $3];"],
        ["literal . LESSER literal", "$$ = ['eq_range', $1, $4];"],
        ["literal . LESSER_EQUAL literal", "$$ = ['eq_range_eq', $1, $4];"]
    ],
    "member" : [
        ["KEY", "$$ = $1;"],
        ["member . KEY", "$$ = $1 + '.' + $3;"]
    ],
    "expression": [ 
        ["literal", "$$ = ['literal', $1]"],
        ["member colon literal_expression", "$$ = ['keyValue', $1, $3];"],
        ["expression OR expression", "$$ = ['OR', [$1, $3]]"],
        ["expression AND expression", "$$ = ['AND', [$1, $3]]"],
        ["expressionSubset", "$$ = $1;"],
    ],
    "expressionSubset" : [
        ["( expressionList )", "$$ = ['subset', $2];"]
    ],
    "expressionList" : [ 
        ["expression", "$$ = [$1];"], 
        ["expressionList , expression", "$$ = $1; $$.push($3);"]
    ],
    "array": [ ["[ expressionList ]", "$$ = $2;"] ],
    "arg" : [ 
        ["KEY = array", "$$ = [$1, $3];"],
        ["KEY = literal", "$$ = [$1, $3];"]
    ],
    "argList": [ ["arg", "$$ = {}; $$[$1[0]] = $1[1];"], ["argList & arg", "$1[$3[0]] = $3[1];"] ]
  }
};

