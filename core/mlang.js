/**
 * @license
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// TODO: add type-checking in partialEval
//  (type-checking is a subset of partial-eval)

function compile_(a) {
  return /*Expr.isInstance(a) || Property.isInstance(a)*/ a.f ? a :
    a === true  ? TRUE        :
    a === false ? FALSE       :
    ConstantExpr.create({arg1:a});
}

function compileArray_(args) {
  var b = [];

  for ( var i = 0 ; i < args.length ; i++ ) {
    var a = args[i];

    if ( a !== null && a !== undefined ) b.push(compile_(a));
  }

  return b;
}


CLASS({
  name: 'Expr',

  // package: 'foam.mlang',

  documentation: 'Parent model for all mLang expressions. Contains default implementations for many methods.',

  methods: {
    toMQL: function() { /* Outputs MQL for this expression. */ return this.label_; },
    toSQL: function() { /* Outputs SQL for this expression. */ return this.label_; },
    toBQL: function() { /* Outputs yet another query language for this expression. */ return this.label_; },
    toString: function() {
      /* Converts to a string form for debugging; defaults to $$DOC{ref: ".toMQL", text: "MQL"}. */
      return this.toMQL();
    },
    collectInputs: function(terms) {
      /* Recursively adds all inputs of an expression to an array. */
      terms.push(this);
    },
    partialEval: function() {
      /* <p>Simplifies the expression by eliminating unnecessary clauses and combining others.</p>
       <p>Can sometimes reduce whole (sub)expressions to TRUE or FALSE.</p>
      */
      return this;
    },
    minterm: function(index, term) {
      // True if this bit is set in the minterm number.
      return !!((term >>> index[0]--) & 1 );
    },
    normalize: function() {
      return this;
      // Each input term to the expression.
      var inputs = [];
      this.collectInputs(inputs);

      // Truth table for every minterm (combination of inputs).
      var minterms = new Array(Math.pow(2, inputs.length));

      for ( var i = 0; i < minterms.length; i++ ) {
        minterms[i] = this.minterm([inputs.length - 1], i);
      }

      // TODO: Calculate prime implicants and reduce to minimal set.
      var terms = [];
      for ( i = 0; i < minterms.length; i++ ) {
        if ( minterms[i] ) {
          var subterms = [];
          for ( var j = 0; j < inputs.length; j++ ) {
            if ( i & (1 << (inputs.length - j - 1))) subterms.push(inputs[j]);
          }
          terms.push(AndExpr.create({ args: subterms }));
        }
      }
      var ret = OrExpr.create({ args: terms }).partialEval();
      console.log(this.toMQL(),' normalize-> ', ret.toMQL());
      return ret;
    },
    pipe: function(sink) {
      /* Returns a $$DOC{ref: "Sink"} which applies this expression to every value <tt>put</tt> or <tt>remove</tt>d, calling the provided <tt>sink</tt> only for those values which match the expression. */
      var expr = this;
      return {
        __proto__: sink,
        put:    function(obj) { if ( expr.f(obj) ) sink.put(obj);   },
        remove: function(obj) { if ( expr.f(obj) ) sink.remove(obj); }
      };
    }
  }
});


var TRUE = (FOAM({
  model_: 'Model',
  name: 'TrueExpr',
  extendsModel: 'Expr',

  documentation: 'Model for the primitive true value.',

  methods: {
    toString: function() { return '<true>'; },
    toSQL:    function() { return '( 1 = 1 )'; },
    toMQL:    function() { return ''; },
    toBQL:    function() { return ''; },
    f:        function() { return true; }
  }
})).create();


var FALSE = (FOAM({
  model_: 'Model',
  name: 'FalseExpr',
  extendsModel: 'Expr',

  documentation: 'Model for the primitive false value.',

  methods: {
    toSQL: function(out) { return '( 1 <> 1 )'; },
    toMQL: function(out) { return '<false>'; },
    toBQL: function(out) { return '<false>'; },
    f:     function() { return false; }
  }
})).create();

var IDENTITY = (FOAM({
  model_: 'Model',
  name: 'IDENTITY',
  extendsModel: 'Expr',

  documentation: 'The identity expression, which passes through its input unchanged.',

  methods: {
    f: function(obj) { return obj; },
    toString: function() { return 'IDENTITY'; }
  }
})).create();

/** An n-ary function. **/
CLASS({
  name: 'NARY',

  extendsModel: 'Expr',
  abstract: true,

  documentation: 'Parent model for expressions which take an arbitrary number of arguments.',

  properties: [
    {
      name:  'args',
      label: 'Arguments',
      type:  'Expr[]',
      help:  'Sub-expressions',
      documentation: 'An array of subexpressions which are the arguments to this n-ary expression.',
      factory: function() { return []; }
    }
  ],

  methods: {
    toString: function() {
      var s = this.name_ + '(';
      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a = this.args[i];
        s += a.toString();
        if ( i < this.args.length-1 ) s += (', ');
      }
      return s + ')';
    },

    toSQL: function() {
      var s;
      s = this.model_.label;
      s += '(';
      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a = this.args[i];
        s += a.toSQL();
        if ( i < this.args.length-1 ) out.push(',');
      }
      s += ')';
      return s;
    },
    toMQL: function() {
      var s;
      s = this.model_.label;
      s += '(';
      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a = this.args[i];
        s += a.toMQL();
        if ( i < this.args.length-1 ) out.push(',');
      }
      s += ')';
      return str;
    },
    toBQL: function() {
      var s;
      s = this.model_.label;
      s += '(';
      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a = this.args[i];
        s += a.toBQL();
        if ( i < this.args.length-1 ) out.push(',');
      }
      s += ')';
      return str;
    }
  }
});


/** An unary function. **/
CLASS({
  name: 'UNARY',

  extendsModel: 'Expr',
  abstract: true,

  documentation: 'Parent model for one-argument expressions.',

  properties: [
    {
      name:  'arg1',
      label: 'Argument',
      type:  'Expr',
      help:  'Sub-expression',
      documentation: 'The first argument to the expression.',
      defaultValue: TRUE
    }
  ],

  methods: {
    toSQL: function() {
      return this.label_ + '(' + this.arg1.toSQL() + ')';
    },
    toMQL: function() {
      return this.label_ + '(' + this.arg1.toMQL() + ')';
    },
    toBQL: function() {
      return this.label_ + '(' + this.arg1.toBQL() + ')';
    }
  }
});


/** An unary function. **/
CLASS({
  name: 'BINARY',

  extendsModel: 'UNARY',
  abstract: true,

  documentation: 'Parent model for two-argument expressions. Extends $$DOC{ref: "UNARY"} to include $$DOC{ref: ".arg2"}.',

  properties: [
    {
      name:  'arg2',
      label: 'Argument',
      type:  'Expr',
      help:  'Sub-expression',
      documentation: 'Second argument to the expression.',
      defaultValue: TRUE
    }
  ],

  methods: {
    toSQL: function() {
      return this.arg1.toSQL() + ' ' + this.label_ + ' ' + this.arg2.toSQL();
    },
    toMQL: function() {
      return this.arg1.toMQL() + ' ' + this.label_ + ' ' + this.arg2.toMQL();
    },
    toBQL: function() {
      return this.arg1.toBQL() + ' ' + this.label_ + ' ' + this.arg2.toBQL();
    }
  }
});


CLASS({
  name: 'MaxExpr',

  extendsModel: 'UNARY',

  properties: [
    {
      name:  'max',
      type:  'int',
      help:  'Maximum value.',
      defaultValue: undefined
    }
  ],

  methods: {
    maximum: function(o1, o2) {
      return o1.compareTo(o2) > 0 ? o1 : o2;
    },
    reduce: function(other) {
      return MaxExpr.create({max: this.maximum(this.max, other.max)});
    },
    reduceI: function(other) {
      this.max = this.maximum(this.max, other.max);
    },
    pipe: function(sink) { sink.put(this); },
    put: function(obj) {
      var v = this.arg1.f(obj);
      this.max = this.max === undefined ? v : this.maximum(this.max, v);
    },
    remove: function(obj) { },
    toString: function() { return this.max; }
  }
});


function MAX(expr) {
  return MaxExpr.create({arg1: expr});
}


CLASS({
  name: 'ExplainExpr',

  extendsModel: 'UNARY',

  documentation: 'Pseudo-expression which outputs a human-readable description of its subexpression, and the plan for evaluating it.',

  properties: [
    {
      name:  'plan',
      help:  'Execution Plan',
      defaultValue: ""
    }
  ],

  methods: {
    toString: function() { return this.plan; },
    toSQL: function() { return this.arg1.toSQL(); },
    toMQL: function() { return this.arg1.toMQL(); },
    toBQL: function() { return this.arg1.toBQL(); },
    partialEval: function() {
      var newArg = this.arg1.partialEval();

      return this.arg1 === newArg ? this : EXPLAIN(newArg);
    },
    f: function(obj) { return this.arg1.f(obj); }
  }
});


function EXPLAIN(arg) {
  return ExplainExpr.create({arg1: arg});
}


function COUNT() {
  return CountExpr.create();
}

CLASS({
  name: 'CountExpr',

  extendsModel: 'Expr',

  properties: [
    {
      name:  'count',
      type:  'int',
      defaultValue: 0
    }
  ],

  methods: {
    reduce: function(other) {
      return CountExpr.create({count: this.count + other.count});
    },
    reduceI: function(other) {
      this.count = this.count + other.count;
    },
    pipe: function(sink) { sink.put(this); },
    put: function(obj) { this.count++; },
    remove: function(obj) { this.count--; },
    toString: function() { return this.count; }
  }
});


CLASS({
  name: 'InExpr',

  extendsModel: 'BINARY',

  documentation: 'Binary expression which is true if its first argument is EQ to any element of its second argument, which is an array.',

  properties: [
    {
      name:  'arg2',
      label: 'Argument',
      type:  'Expr',
      help:  'Sub-expression',
      postSet: function() { this.valueSet_ = undefined; }
    }
  ],

  methods: {
    partialEval: function() {
      if ( this.arg2.length == 1 ) return EQ(this.arg1, this.arg2[0]);
      return this;
    },
    valueSet: function() {
      if ( ! this.valueSet_ ) {
        var s = {};
        for ( var i = 0 ; i < this.arg2.length ; i++ ) s[this.arg2[i]] = true;
        this.valueSet_ = s;
      }
      return this.valueSet_;
    },
    toSQL: function() { return this.arg1.toSQL() + ' IN ' + this.arg2; },
    toMQL: function() { return this.arg1.toMQL() + '=' + this.arg2.join(',') },
    toBQL: function() { return this.arg1.toBQL() + ':(' + this.arg2.join('|') + ')' },

    f: function(obj) {
      return this.valueSet().hasOwnProperty(this.arg1.f(obj));
    }
  }
});


function IN(arg1, arg2) {
  return InExpr.create({arg1: compile_(arg1), arg2: arg2 });
}


CLASS({
  name: 'EqExpr',

  extendsModel: 'BINARY',
  abstract: true,

  documentation: function() { /*
    <p>Binary expression that compares its arguments for equality.</p>
    <p>When evaluated in Javascript, uses <tt>==</tt>.</p>
    <p>If the first argument is an array, returns true if any of its value match the second argument.</p>
  */},

  methods: {
    toSQL: function() { return this.arg1.toSQL() + '=' + this.arg2.toSQL(); },
    toMQL: function() {
      if ( ! this.arg1.toMQL || ! this.arg2.toMQL ) return '';
      return this.arg2     === TRUE ? 'is:' + this.arg1.toMQL()   :
             this.arg2.f() == ''    ? '-has:' + this.arg1.toMQL() :
             this.arg1.toMQL() + '=' + this.arg2.toMQL()      ;
    },

    toBQL: function() {
      if ( ! this.arg1.toBQL || ! this.arg2.toBQL ) return '';
      return this.arg2     === TRUE ? this.arg1.toBQL() + ':true' :
             this.arg1.toBQL() + ':' + this.arg2.toBQL()      ;
    },

    partialEval: function() {
      var newArg1 = this.arg1.partialEval();
      var newArg2 = this.arg2.partialEval();

      if ( ConstantExpr.isInstance(newArg1) && ConstantExpr.isInstance(newArg2) ) {
        return compile_(newArg1.f() == newArg2.f());
      }

      return this.arg1 !== newArg1 || this.arg2 !== newArg2 ?
        EqExpr.create({arg1: newArg1, arg2: newArg2}) :
      this;
    },

    f: function(obj) {
      var arg1 = this.arg1.f(obj);
      var arg2 = this.arg2.f(obj);

      if ( Array.isArray(arg1) ) {
        return arg1.some(function(arg) {
          return arg == arg2;
        });
      }

      if ( arg2 === TRUE ) return !! arg1;
      if ( arg2 === FALSE ) return ! arg1;

      return arg1 == arg2;
    }
  }
});


function EQ(arg1, arg2) {
  var eq = EqExpr.create();
  eq.instance_.arg1 = compile_(arg1);
  eq.instance_.arg2 = compile_(arg2);
  return eq;
  //  return EqExpr.create({arg1: compile_(arg1), arg2: compile_(arg2)});
}


CLASS({
  name: 'LtExpr',

  extendsModel: 'BINARY',
  abstract: true,

  methods: {
    toSQL: function() { return this.arg1.toSQL() + '<' + this.arg2.toSQL(); },
    toMQL: function() { return this.arg1.toMQL() + '-before:' + this.arg2.toMQL(); },
    toBQL: function() { return this.arg1.toBQL() + '<' + this.arg2.toBQL(); },

    partialEval: function() {
      var newArg1 = this.arg1.partialEval();
      var newArg2 = this.arg2.partialEval();

      if ( ConstantExpr.isInstance(newArg1) && ConstantExpr.isInstance(newArg2) ) {
        return compile_(newArg1.f() < newArg2.f());
      }

      return this.arg1 !== newArg1 || this.arg2 != newArg2 ?
        LtExpr.create({arg1: newArg1, arg2: newArg2}) :
      this;
    },

    f: function(obj) { return this.arg1.f(obj) < this.arg2.f(obj); }
  }
});

function LT(arg1, arg2) {
  return LtExpr.create({arg1: compile_(arg1), arg2: compile_(arg2)});
}


CLASS({
  name: 'GtExpr',

  extendsModel: 'BINARY',
  abstract: true,

  methods: {
    toSQL: function() { return this.arg1.toSQL() + '>' + this.arg2.toSQL(); },
    toMQL: function() { return this.arg1.toMQL() + '-after:' + this.arg2.toMQL(); },
    toBQL: function() { return this.arg1.toBQL() + '>' + this.arg2.toBQL(); },

    partialEval: function() {
      var newArg1 = this.arg1.partialEval();
      var newArg2 = this.arg2.partialEval();

      if ( ConstantExpr.isInstance(newArg1) && ConstantExpr.isInstance(newArg2) ) {
        return compile_(newArg1.f() > newArg2.f());
      }

      return this.arg1 !== newArg1 || this.arg2 != newArg2 ?
        GtExpr.create({arg1: newArg1, arg2: newArg2}) :
      this;
    },

    f: function(obj) { return this.arg1.f(obj) > this.arg2.f(obj); }
  }
});

function GT(arg1, arg2) {
  return GtExpr.create({arg1: compile_(arg1), arg2: compile_(arg2)});
}

CLASS({
  name: 'LteExpr',

  extendsModel: 'BINARY',
  abstract: true,

  methods: {
    toSQL: function() { return this.arg1.toSQL() + '<=' + this.arg2.toSQL(); },
    toMQL: function() { return this.arg1.toMQL() + '-before:' + this.arg2.toMQL(); },
    toBQL: function() { return this.arg1.toBQL() + '<=' + this.arg2.toBQL(); },

    partialEval: function() {
      var newArg1 = this.arg1.partialEval();
      var newArg2 = this.arg2.partialEval();

      if ( ConstantExpr.isInstance(newArg1) && ConstantExpr.isInstance(newArg2) ) {
        return compile_(newArg1.f() <= newArg2.f());
      }

      return this.arg1 !== newArg1 || this.arg2 != newArg2 ?
        LtExpr.create({arg1: newArg1, arg2: newArg2}) :
      this;
    },

    f: function(obj) { return this.arg1.f(obj) <= this.arg2.f(obj); }
  }
});


function LTE(arg1, arg2) {
  return LteExpr.create({arg1: compile_(arg1), arg2: compile_(arg2)});
}


CLASS({
  name: 'GteExpr',

  extendsModel: 'BINARY',
  abstract: true,

  methods: {
    toSQL: function() { return this.arg1.toSQL() + '>=' + this.arg2.toSQL(); },
    toMQL: function() { return this.arg1.toMQL() + '-after:' + this.arg2.toMQL(); },
    toBQL: function() { return this.arg1.toBQL() + '>=' + this.arg2.toBQL(); },

    partialEval: function() {
      var newArg1 = this.arg1.partialEval();
      var newArg2 = this.arg2.partialEval();

      if ( ConstantExpr.isInstance(newArg1) && ConstantExpr.isInstance(newArg2) ) {
        return compile_(newArg1.f() >= newArg2.f());
      }

      return this.arg1 !== newArg1 || this.arg2 != newArg2 ?
        GtExpr.create({arg1: newArg1, arg2: newArg2}) :
      this;
    },

    f: function(obj) { return this.arg1.f(obj) >= this.arg2.f(obj); }
  }
});


function GTE(arg1, arg2) {
  return GteExpr.create({arg1: compile_(arg1), arg2: compile_(arg2)});
}


CLASS({
  name: 'ConstantExpr',

  extendsModel: 'UNARY',

  methods: {
    escapeSQLString: function(str) {
      return "'" +
        str.replace(/\\/g, "\\\\").replace(/'/g, "\\'") +
        "'";
    },
    escapeMQLString: function(str) {
      if ( str.length > 0 && str.indexOf(' ') == -1 && str.indexOf('"') == -1 && str.indexOf(',') == -1 ) return str;
      return '"' +
        str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') +
        '"';
    },
    toSQL: function() {
      return ( typeof this.arg1 === 'string' ) ?
        this.escapeSQLString(this.arg1) :
        this.arg1.toString() ;
    },
    toMQL: function() {
      return ( typeof this.arg1 === 'string' ) ?
        this.escapeMQLString(this.arg1) :
        (this.arg1.toMQL ? this.arg1.toMQL() :
         this.arg1.toString());
    },
    toBQL: function() {
      return ( typeof this.arg1 === 'string' ) ?
        this.escapeMQLString(this.arg1) :
        (this.arg1.toBQL ? this.arg1.toBQL() :
         this.arg1.toString());
    },
    f: function(obj) { return this.arg1; }
  }
});


CLASS({
  name: 'AndExpr',

  extendsModel: 'NARY',
  abstract: true,

  documentation: 'N-ary expression which is true only if each of its 0 or more arguments is true. AND() === TRUE',

  methods: {
    // AND has a higher precedence than OR so doesn't need parenthesis
    toSQL: function() {
      var s = '';
      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a = this.args[i];
        s += a.toSQL();
        if ( i < this.args.length-1 ) s += (' AND ');
      }
      return s;
    },
    toMQL: function() {
      var s = '';
      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a = this.args[i];
        var sub = a.toMQL();
        if ( OrExpr.isInstance(a) ) {
          sub = '(' + sub + ')';
        }
        s += sub;
        if ( i < this.args.length-1 ) s += (' ');
      }
      return s;
    },
    toBQL: function() {
      var s = '';
      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a = this.args[i];
        var sub = a.toBQL();
        if ( OrExpr.isInstance(a) ) {
          sub = '(' + sub + ')';
        }
        s += sub;
        if ( i < this.args.length-1 ) s += (' ');
      }
      return s;
    },
    collectInputs: function(terms) {
      for ( var i = 0; i < this.args.length; i++ ) {
        this.args[i].collectInputs(terms);
      }
    },
    minterm: function(index, term) {
      var out = true;
      for ( var i = 0; i < this.args.length; i++ ) {
        out = this.args[i].minterm(index, term) && out;
      }
      return out;
    }
  },

  constants: {
    PARTIAL_AND_RULES: [
      [ 'EqExpr', 'EqExpr',
        function(e1, e2) {
          return e1.arg1.exclusive ?
            e1.arg2.f() == e2.arg2.f() ? e1 : FALSE :
            e1.arg2.f() == e2.arg2.f() ? e1 : null ;
        }
      ],
      [ 'InExpr', 'InExpr',
        function(e1, e2) {
          var i = e1.arg1.exclusive ? e1.arg2.intersection(e2.arg2) : e1.arg2.union(e2.arg2) ;
          return i.length ? IN(e1.arg1, i) : FALSE;
        }
      ],
      [ 'InExpr', 'ContainedInICExpr',
        function(e1, e2) {
          if ( ! e1.arg1.exclusive ) return null;
          var i = e1.arg2.filter(function(o) { o = o.toUpperCase(); return e2.arg2.some(function(o2) { return o.indexOf(o2) != -1; }); });
          return i.length ? IN(e1.arg1, i) : FALSE;
        }
      ],
      [ 'ContainedInICExpr', 'ContainedInICExpr',
        function(e1, e2) {
          console.assert(false, 'AND.partialEval: ContainedInICExpr has no partialEval rule');
        }
      ],
      [ 'InExpr', 'ContainsICExpr',
        function(e1, e2) {
          if ( ! e1.arg1.exclusive ) return;
          var i = e1.arg2.filter(function(o) { return o.indexOfIC(e2.arg2.f()) !== -1; });
        }
      ],
      [ 'InExpr', 'ContainsExpr',
        function(e1, e2) {
          if ( ! e1.arg1.exclusive ) return;
          var i = e1.arg2.filter(function(o) { return o.indexOf(e2.arg2.f()) !== -1; });
          return i.length ? IN(e1.arg1, i) : FALSE;
        }
      ],
      [ 'EqExpr', 'InExpr',
        function(e1, e2) {
          if ( ! e1.arg1.exclusive ) return;
          return e2.arg2.indexOf(e1.arg2.f()) === -1 ? FALSE : e1;
        }
      ]
    ],

    partialAnd: function(e1, e2) {
      if ( OrExpr.isInstance(e2) ) { var tmp = e1; e1 = e2; e2 = tmp; }
      if ( OrExpr.isInstance(e1) ) {
        var args = [];
        for ( var i = 0 ; i < e1.args.length ; i++ ) {
          args.push(AND(e2, e1.args[i]));
        }
        return OrExpr.create({args: args}).partialEval();
      }

      if ( ! BINARY.isInstance(e1) ) return null;
      if ( ! BINARY.isInstance(e2) ) return null;
      if ( e1.arg1 != e2.arg1 ) return null;

      var RULES = this.PARTIAL_AND_RULES;
      for ( var i = 0 ; i < RULES.length ; i++ ) {
        if ( e1.model_.name == RULES[i][0] && e2.model_.name == RULES[i][1] ) return RULES[i][2](e1, e2);
        if ( e2.model_.name == RULES[i][0] && e1.model_.name == RULES[i][1] ) return RULES[i][2](e2, e1);
      }

      if ( DEBUG )
        console.log('Unknown partialAnd combination: ', e1.name_, e2.name_);

      return null;
    },

    partialEval: function() {
      var newArgs = [];
      var updated = false;

      for ( var i = 0 ; i < this.args.length ; i++ ) {
        var a    = this.args[i];
        var newA = this.args[i].partialEval();

        if ( newA === FALSE ) return FALSE;

        if ( AndExpr.isInstance(newA) ) {
          // In-line nested AND clauses
          for ( var j = 0 ; j < newA.args.length ; j++ ) {
            newArgs.push(newA.args[j]);
          }
          updated = true;
        }
        else {
          if ( newA === TRUE ) {
            updated = true;
          } else {
            newArgs.push(newA);
            if ( a !== newA ) updated = true;
          }
        }
      }

      for ( var i = 0 ; i < newArgs.length-1 ; i++ ) {
        for ( var j = i+1 ; j < newArgs.length ; j++ ) {
          var a = this.partialAnd(newArgs[i], newArgs[j]);
          if ( a ) {
            console.log('***************** ', newArgs[i].toMQL(), ' <PartialAnd> ', newArgs[j].toMQL(), ' -> ', a.toMQL());
            if ( a === FALSE ) return FALSE;
            newArgs[i] = a;
            newArgs.splice(j, 1);
          }
        }
      }

      if ( newArgs.length == 0 ) return TRUE;
      if ( newArgs.length == 1 ) return newArgs[0];

      return updated ? AndExpr.create({args: newArgs}) : this;
    },

    f: function(obj) {
      return this.args.every(function(arg) {
        return arg.f(obj);
      });
    }
  }
});


function AND() {
  return AndExpr.create({args: compileArray_.call(null, arguments)});
}
