"use strict";

var numeric = {};

/*
 * 1. Utility functions
 */
numeric.bench = function bench (f,interval) {
    var t1,t2,n,i;
    if(typeof interval === "undefined") { interval = 15; }
    n = 1;
    t1 = new Date();
    while(1) {
        n*=2;
        for(i=n;i>3;i-=4) { f(); f(); f(); f(); }
        while(i>0) { f(); i--; }
        t2 = new Date();
        if(t2-t1 > interval) break;
    }
    for(i=n;i>3;i-=4) { f(); f(); f(); f(); }
    while(i>0) { f(); i--; }
    t2 = new Date();
    return 1000*(3*n-1)/(t2-t1);
}

numeric.precision = 4;
numeric.largeArray = 50;

numeric.prettyPrint = function(x) {
    function fmtnum(x) {
        if(x === 0) { return '0'; }
        if(isNaN(x)) { return 'NaN'; }
        if(x<0) { return '-'+fmtnum(-x); }
        if(isFinite(x)) {
            var scale = Math.floor(Math.log(x) / Math.log(10));
            var normalized = x / Math.pow(10,scale);
            var basic = normalized.toPrecision(numeric.precision);
            if(parseFloat(basic) === 10) { scale++; normalized = 1; basic = normalized.toPrecision(numeric.precision); }
            return basic+'e'+scale.toString();
        }
        return 'Infinity';
    }

    var ret = [];
    function foo(x) {
        var k;
        if(typeof x === "undefined") { ret.push(Array(numeric.precision+8).join(' ')); return false; }
        if(typeof x === "string") { ret.push('"'+x+'"'); return false; }
        if(typeof x === "boolean") { ret.push(x.toString()); return false; }
        if(typeof x === "number") {
            var a = fmtnum(x);
            var b = x.toPrecision(numeric.precision);
            var c = parseFloat(x.toString()).toString();
            var d = [a,b,c,parseFloat(a).toString(),parseFloat(b).toString(),parseFloat(c).toString()];
            for(k=1;k<d.length;k++) { if(d[k].length < a.length) a = d[k]; }
            ret.push(Array(numeric.precision+8-a.length).join(' ')+a);
            return false;
        }
        if(x === null) { ret.push("null"); return false; }
        if(typeof x === "function") { ret.push(x.toString()); return true; }
        if('length' in x) {
            if(x.length > numeric.largeArray) { ret.push('...Large Array...'); return true; }
            var flag = false;
            ret.push('[');
            for(k=0;k<x.length;k++) { if(k>0) { ret.push(','); if(flag) ret.push('\n '); } flag = foo(x[k]); }
            ret.push(']');
            return true;
        }
        ret.push('{');
        var flag = false;
        for(k in x) { if(x.hasOwnProperty(k)) { if(flag) ret.push(',\n'); flag = true; ret.push(k); ret.push(': \n'); foo(x[k]); } }
        ret.push('}');
        return true;
    }
    foo(x);
    return ret.join('');
}

numeric.parseDate = function parseDate(d) {
    function foo(d) {
        if(typeof d === 'string') { return Date.parse(d.replace(/-/g,'/')); }
        if(!(d instanceof Array)) { throw new Error("parseDate: parameter must be arrays of strings"); }
        var ret = [],k;
        for(k=0;k<d.length;k++) { ret[k] = foo(d[k]); }
        return ret;
    }
    return foo(d);
}

numeric.parseFloat = function parseFloat_(d) {
    function foo(d) {
        if(typeof d === 'string') { return parseFloat(d); }
        if(!(d instanceof Array)) { throw new Error("parseFloat: parameter must be arrays of strings"); }
        var ret = [],k;
        for(k=0;k<d.length;k++) { ret[k] = foo(d[k]); }
        return ret;
    }
    return foo(d);
}

numeric.parseCSV = function parseCSV(t) {
    var foo = t.split('\n');
    var j,k;
    var ret = [];
    var pat = /(([^'",]*)|('[^']*')|("[^"]*")),/g;
    var patnum = /^\s*(([+-]?[0-9]+(\.[0-9]*)?(e[+-]?[0-9]+)?)|([+-]?[0-9]*(\.[0-9]+)?(e[+-]?[0-9]+)?))\s*$/;
    var stripper = function(n) { return n.substr(0,n.length-1); }
    var count = 0;
    for(k=0;k<foo.length;k++) {
      var bar = (foo[k]+",").match(pat),baz;
      if(bar.length>0) {
          ret[count] = [];
          for(j=0;j<bar.length;j++) {
              baz = stripper(bar[j]);
              if(patnum.test(baz)) { ret[count][j] = parseFloat(baz); }
              else ret[count][j] = baz;
          }
          count++;
      }
    }
    return ret;
}

numeric.toCSV = function toCSV(A) {
    var s = numeric.dim(A);
    var i,j,m,n,row,ret;
    m = s[0];
    n = s[1];
    ret = [];
    for(i=0;i<m;i++) {
        row = [];
        for(j=0;j<m;j++) { row[j] = numeric.prettyPrint(A[i][j]); }
        ret[i] = row.join(', ');
    }
    return ret.join('\n')+'\n';
}

numeric.getURL = function getURL(url) {
    var client = new XMLHttpRequest();
    client.open("GET",url,false);
    client.send();
    return client;
}

/*
 * 2. Linear algebra with Arrays.
 */
numeric._dim = function _dim(x) {
    var ret = [];
    while(typeof x === "object") { ret.push(x.length); x = x[0]; }
    return ret;
}

numeric.dim = function dim(x) {
    var y,z;
    if(typeof x === "object") {
        y = x[0];
        if(typeof y === "object") {
            z = y[0];
            if(typeof z === "object") {
                return numeric._dim(x);
            }
            return [x.length,y.length];
        }
        return [x.length];
    }
    return [];
}

numeric.mapreduce = function mapreduce(body,init) {
    return Function('x','accum','_s','_k',
            'if(typeof accum === "undefined") accum = '+init+';\n'+
            'if(typeof _s === "undefined") _s = numeric.dim(x);\n'+
            'if(typeof _k === "undefined") _k = 0;\n'+
            'var _n = _s[_k];\n'+
            'var i,xi;\n'+
            'if(_k < _s.length-1) {\n'+
            '    for(i=_n-1;i>=0;i--) {\n'+
            '        accum = arguments.callee(x[i],accum,_s,_k+1);\n'+
            '    }'+
            '    return accum;\n'+
            '}\n'+
            'for(i=_n-1;i>=3;i-=4) { \n'+
            '    xi = x[i];\n'+
            '    '+body+';\n'+
            '    xi = x[i-1];\n'+
            '    '+body+';\n'+
            '    xi = x[i-2];\n'+
            '    '+body+';\n'+
            '    xi = x[i-3];\n'+
            '    '+body+';\n'+
            '}\n'+
            'while(i>=0) {\n'+
            '    xi = x[i];\n'+
            '    '+body+'\n'+
            '    i--;\n'+
            '}\n'+
            'return accum;'
            );
}


numeric.same = function same(x,y) {
    var i,n;
    if(!(x instanceof Array) || !(y instanceof Array)) { return false; }
    n = x.length;
    if(n !== y.length) { return false; }
    for(i=0;i<n;i++) {
        if(x[i] === y[i]) { continue; }
        if(typeof x[i] === "object") { if(!same(x[i],y[i])) return false; }
        else { return false; }
    }
    return true;
}


numeric.rep = function rep(s,v) {
    function foo(k) {
        var n = s[k], ret = new Array(n), i;
        if(k === s.length-1) {
            for(i=n-1;i>=3;i-=4) { ret[i] = v; ret[i-1] = v; ret[i-2] = v; ret[i-3] = v; }
            while(i>=0) { ret[i] = v; i--; }
            return ret;
        }
        for(i=n-1;i>=0;i--) { ret[i] = foo(k+1); }
        return ret;
    }
    return foo(0);
}

numeric.dotMMbig = function dotMMbig(x,y) {
    var i,j,k,p,q,r,ret,foo,bar,woo,i0,k0,p0,r0,s1,s2,s3,baz,accum;
    var dotVV = numeric.dotVV,min = Math.min;
    p = x.length; q = y.length; r = y[0].length;
    ret = new Array(p);
    woo = numeric.transpose(y);
    for(i0=0;i0<p;i0+=4) {
        p0 = min(i0+4,p);
        for(i=i0;i<p0;i++) { ret[i] = new Array(r); }
        for(k0=0;k0<r;k0+=4) {
            r0 = min(k0+4,r);
            for(i=i0;i<p0;i++) {
                bar = x[i];
                foo = ret[i];
                for(k=k0;k<r0;k++) {
                    foo[k] = dotVV(bar,woo[k]);
                }
            }
        }
    }
    return ret;
}

numeric.dotMMsmall = function dotMMsmall(x,y) {
    var i,j,k,p,q,r,ret,foo,bar,woo,i0,k0,p0,r0;
    p = x.length; q = y.length; r = y[0].length;
    ret = new Array(p);
    for(i=p-1;i>=0;i--) {
        foo = new Array(r);
        bar = x[i];
        for(k=r-1;k>=0;k--) {
            woo = bar[q-1]*y[q-1][k];
            for(j=q-2;j>=3;j-=4) {
                i0 = j-1; p0 = j-2; k0 = j-3;
                woo += bar[j]*y[j][k] + bar[i0]*y[i0][k] + bar[p0]*y[p0][k] + bar[k0]*y[k0][k];
            }
            while(j>=0) { woo += bar[j]*y[j][k]; j--; }
            foo[k] = woo;
        }
        ret[i] = foo;
    }
    return ret;
}
numeric.dotMV = function dotMV(x,y) {
    var p = x.length, q = y.length,i;
    var ret = new Array(p), dotVV = numeric.dotVV;
    for(i=p-1;i>=0;i--) { ret[i] = dotVV(x[i],y); }
    return ret;
}

numeric.dotVM = function dotVM(x,y) {
    var i,j,k,p,q,r,ret,foo,bar,woo,i0,k0,p0,r0,s1,s2,s3,baz,accum;
    p = x.length; q = y[0].length;
    ret = new Array(q);
    for(k=q-1;k>=0;k--) {
        woo = x[p-1]*y[p-1][k];
        for(j=p-2;j>=3;j-=4) {
            i0 = j-1; p0 = j-2; k0 = j-3;
            woo += x[j]*y[j][k] + x[i0]*y[i0][k] + x[p0]*y[p0][k] + x[k0]*y[k0][k];
        }
        while(j>=0) { woo += x[j]*y[j][k]; j--; }
        ret[k] = woo;
    }
    return ret;
}

numeric.dotVV = function dotVV(x,y) {
    var i,n=x.length,i1,i2,i3,ret = x[n-1]*y[n-1];
    for(i=n-2;i>=3;i-=4) {
        i1 = i-1; i2 = i-2; i3 = i-3;
        ret += x[i]*y[i] + x[i1]*y[i1] + x[i2]*y[i2] + x[i3]*y[i3];
    }
    i++;
    while(i--) { ret += x[i]*y[i]; }
    return ret;
}

numeric.dot = function dot(x,y) {
    var d = numeric.dim;
    switch(d(x).length*1000+d(y).length) {
    case 2002:
        if(y.length < 40) return numeric.dotMMsmall(x,y);
        else return numeric.dotMMbig(x,y);
    case 2001: return numeric.dotMV(x,y);
    case 1002: return numeric.dotVM(x,y);
    case 1001: return numeric.dotVV(x,y);
    case 1000: return numeric.mulVS(x,y);
    case 1: return numeric.mulSV(x,y);
    case 0: return x*y;
    default: throw new Error('numeric.dot only works on vectors and matrices');
    }
}

numeric.diag = function diag(d) {
    var i,i1,j,j1,j2,j3,n = d.length, A = new Array(n), Ai;
    for(i=n-1;i>=0;i--) {
        Ai = new Array(n);
        i1 = i+4;
        for(j=n-1;j>i1;j-=4) {
            j1 = j-1; j2 = j-2; j3 = j-3;
            Ai[j] = 0;
            Ai[j1] = 0;
            Ai[j2] = 0;
            Ai[j3] = 0;
        }
        while(j>i) { Ai[j] = 0; j--; }
        Ai[i] = d[i];
        for(j=i-1;j>=3;j-=4) {
            j1 = j-1; j2 = j-2; j3 = j-3;
            Ai[j] = 0;
            Ai[j1] = 0;
            Ai[j2] = 0;
            Ai[j3] = 0;
        }
        while(j>=0) { Ai[j] = 0; j--; }
        A[i] = Ai;
    }
    return A;
}
numeric.getDiag = function(A) {
    var n = Math.min(A.length,A[0].length),i,i1,i2,i3,ret = new Array(n);
    for(i=n-1;i>=3;i-=4) {
        i1 = i-1; i2 = i-2; i3 = i-3;
        ret[i] = A[i][i];
        ret[i1] = A[i1][i1];
        ret[i2] = A[i2][i2];
        ret[i3] = A[i3][i3];
    }
    while(i>=0) {
        ret[i] = A[i][i];
        i--;
    }
    return ret;
}

numeric.identity = function identity(n) { return numeric.diag(numeric.rep([n],1)); }
numeric.pointwise = function pointwise(params,body,setup) {
    if(typeof setup === "undefined") { setup = ""; }
    var fun = [];
    var k;
    var avec = /\[i\]$/,p,thevec = '';
    for(k=0;k<params.length;k++) {
        if(avec.test(params[k])) {
            p = params[k].substring(0,params[k].length-3);
            thevec = p;
        } else { p = params[k]; }
        fun.push(p);
    }
    fun[params.length] = '_s';
    fun[params.length+1] = '_k';
    if(typeof body === "string") { var bin = body; body = function(i1) { return bin.replace(/\[i\]/g,'['+i1+']'); } }
    fun[params.length+2] = (
            'if(typeof _s === "undefined") _s = numeric.dim('+thevec+');\n'+
            'if(typeof _k === "undefined") _k = 0;\n'+
            'var _n = _s[_k];\n'+
            'var i, ret = new Array(_n), _i1,_i2,_i3;\n'+
            'if(_k < _s.length-1) {\n'+
            '    for(i=_n-1;i>=0;i--) ret[i] = arguments.callee('+params.join(',')+',_s,_k+1);\n'+
            '    return ret;\n'+
            '}\n'+
            setup+'\n'+
            'for(i=_n-1;i>=3;i-=4) { \n'+
            '    _i1 = i-1; _i2 = i-2; _i3 = i-3;\n'+
            '    '+body('i')+'\n'+
            '    '+body('_i1')+'\n'+
            '    '+body('_i2')+'\n'+
            '    '+body('_i3')+'\n'+
            '}\n'+
            'while(i>=0) {\n'+
            '    '+body('i')+'\n'+
            '    i--;\n'+
            '}\n'+
            'return ret;'
            );
    return Function.apply(null,fun);
}

numeric._biforeach = (function _biforeach(x,y,s,k,f) {
    if(k === s.length-1) { f(x,y); return; }
    var i,n=s[k];
    for(i=n-1;i>=0;i--) { _biforeach(x[i],y[i],s,k+1,f); }
});

numeric.any = numeric.mapreduce('if(xi) return true;','false');
numeric.all = numeric.mapreduce('if(!xi) return false;','true');

numeric.ops2 = {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%',
        and: '&&',
        or:  '||',
        eq:  '===',
        neq: '!==',
        lt:  '<',
        gt:  '>',
        leq: '<=',
        geq: '>=',
        band: '&',
        bor: '|',
        bxor: '^',
        lshift: '<<',
        rshift: '>>',
        rrshift: '>>>'
};
numeric.opseq = {
        addeq: '+=',
        subeq: '-=',
        muleq: '*=',
        diveq: '/=',
        modeq: '%=',
        lshifteq: '<<=',
        rshifteq: '>>=',
        rrshifteq: '>>>=',
        andeq: '&=',
        oreq: '|=',
        xoreq: '^='
};
numeric.mathfuns = ['abs','acos','asin','atan','ceil','cos',
                    'exp','floor','log','round','sin','sqrt','tan'];
numeric.ops1 = {
        neg: '-',
        not: '!',
        bnot: '~'
};

(function () {
    var i,o;
    for(i in numeric.ops2) {
        if(numeric.ops2.hasOwnProperty(i)) {
            o = numeric.ops2[i];
            numeric[i+'VV'] = numeric.pointwise(['x[i]','y[i]'],'ret[i] = x[i] '+o+' y[i];');
            numeric[i+'SV'] = numeric.pointwise(['x','y[i]'],'ret[i] = x '+o+' y[i];');
            numeric[i+'VS'] = numeric.pointwise(['x[i]','y'],'ret[i] = x[i] '+o+' y;');
            numeric[i] = Function('x','y',
                    'if(typeof x === "object") {\n'+
                    '    if(typeof y === "object") return numeric.'+i+'VV(x,y);\n'+
                    '    return numeric.'+i+'VS(x,y);\n'+
                    '} else if(typeof y === "object") return numeric.'+i+'SV(x,y);\n'+
                    'return x '+o+' y;');
            numeric[o] = numeric[i];
        }
    }
    for(i in numeric.ops1) {
        if(numeric.ops1.hasOwnProperty(i)) {
            o = numeric.ops1[i];
            numeric[i+'V'] = numeric.pointwise(['x[i]'],'ret[i] = '+o+'x[i];');
            numeric[i] = Function('x','if(typeof x === "object") return numeric.'+i+'V(x);\nreturn '+o+'(x);');
        }
    }
    for(i=0;i<numeric.mathfuns.length;i++) {
        o = numeric.mathfuns[i];
        numeric[o+'V'] = numeric.pointwise(['x[i]'],'ret[i] = fun(x[i]);','var fun = Math.'+o+';');
        numeric[o] = Function('x','if(typeof x === "object") return numeric.'+o+'V(x);\nreturn Math.'+o+'(x);');
    }
    numeric.isNaNV = numeric.pointwise(['x[i]'],'ret[i] = isNaN(x[i]);');
    numeric.isNaN = function isNaN(x) { if(typeof x === "object") return numeric.isNaNV(x); return isNaN(x); }
    numeric.isFiniteV = numeric.pointwise(['x[i]'],'ret[i] = isFinite(x[i]);');
    numeric.isFinite = function isNaN(x) { if(typeof x === "object") return numeric.isFiniteV(x); return isFinite(x); }
    for(i in numeric.opseq) {
        if(numeric.opseq.hasOwnProperty(i)) {
            numeric[i+'S'] = new Function('x','y',
                    'var n = x.length, i;\n'+
                    'for(i=n-1;i>=0;i--) x[i] '+numeric.opseq[i]+' y;');
            numeric[i+'V'] = new Function('x','y',
                    'var n = x.length, i;\n'+
                    'for(i=n-1;i>=0;i--) x[i] '+numeric.opseq[i]+' y[i];');
            numeric[i] = new Function('x','y',
                    'var s = numeric.dim(x);\n'+
                    'if(typeof y === "number") { numeric._biforeach(x,y,s,0,numeric.'+i+'S); return x; }\n'+
                    'numeric._biforeach(x,y,s,0,numeric.'+i+'V);\n'+
                    'return x;');
            numeric[numeric.opseq[i]] = numeric[i];
        }
    }
}());

numeric.atan2VV = numeric.pointwise(['x[i]','y[i]'],'ret[i] = atan2(x[i],y[i]);','var atan2 = Math.atan2;');
numeric.atan2VS = numeric.pointwise(['x[i]','y'],'ret[i] = atan2(x[i],y);','var atan2 = Math.atan2;');
numeric.atan2SV = numeric.pointwise(['x','y[i]'],'ret[i] = atan2(x,y[i]);','var atan2 = Math.atan2;');
numeric.atan2 = function atan2(x,y) {
    if(typeof x === "object") {
        if(typeof y === "object") return numeric.atan2VV(x,y);
        return numeric.atan2VS(x,y);
    }
    if (typeof y === "object") return numeric.atan2SV(x,y);
    return Math.atan2(x,y);
}

numeric.clone = numeric.pointwise(['x[i]'],'ret[i] = x[i];');

numeric.inv = function inv(x) {
    var s = numeric.dim(x), abs = Math.abs;
    if(s.length !== 2 || s[0] !== s[1]) { throw new Error('numeric: inv() only works on square matrices'); }
    var n = s[0], ret = numeric.identity(n),i,j,k,A = numeric.clone(x),Aj,Ai,Ij,Ii,alpha,temp,k0,k1,k2,k3;
    var P = numeric.linspace(0,n-1), Q = numeric.rep([n],0);
    for(j=0;j<n-1;j++) {
        k=j;
        for(i=j+1;i<n;i++) { if(abs(A[i][j]) > abs(A[k][j])) { k = i; } }
        if(k!==j) {
            temp = A[k]; A[k] = A[j]; A[j] = temp;
            temp = ret[k]; ret[k] = ret[j]; ret[j] = temp;
            temp = P[k]; P[k] = P[j]; P[j] = temp;
        }
        Aj = A[j];
        Ij = ret[j];
        for(i=j+1;i<n;i++) {
            Ai = A[i];
            Ii = ret[i];
            alpha = Ai[j]/Aj[j];
            for(k=j+1;k<n-3;k+=4) {
                k1 = k+1; k2 = k+2; k3 = k+3;
                Ai[k] -= Aj[k]*alpha;
                Ai[k1] -= Aj[k1]*alpha;
                Ai[k2] -= Aj[k2]*alpha;
                Ai[k3] -= Aj[k3]*alpha;
            }
            while(k<n) { Ai[k] -= Aj[k]*alpha; k++; }
            for(k=j;k>=3;k-=4) {
                k0 = P[k-3];
                k1 = P[k-2]; k2 = P[k-1]; k3 = P[k];
                Ii[k0] -= Ij[k0]*alpha;
                Ii[k1] -= Ij[k1]*alpha;
                Ii[k2] -= Ij[k2]*alpha;
                Ii[k3] -= Ij[k3]*alpha;
            }
            while(k>=0) { Ii[P[k]] -= Ij[P[k]]*alpha; k--; }
        }
    }
    for(j=n-1;j>0;j--) {
        Aj = A[j];
        Ij = ret[j];
        for(i=0;i<j;i++) {
            Ii = ret[i];
            alpha = A[i][j]/Aj[j];
            for(k=0;k<n-3;k+=4) {
                k1 = k+1; k2 = k+2; k3 = k+3;
                Ii[k] -= Ij[k]*alpha;
                Ii[k1] -= Ij[k1]*alpha;
                Ii[k2] -= Ij[k2]*alpha;
                Ii[k3] -= Ij[k3]*alpha;
            }
            while(k<n) { Ii[k] -= Ij[k]*alpha; k++; }
        }
    }
    for(i=0;i<n;i++) {
        alpha = A[i][i];
        Ii = ret[i];
        for(j=0;j<n;j++) { Ii[j] /= alpha; }
    }
    return ret;
}

numeric.det = function det(x) {
    var s = numeric.dim(x);
    if(s.length !== 2 || s[0] !== s[1]) { throw new Error('numeric: det() only works on square matrices'); }
    var n = s[0], ret = 1,i,j,k,A = numeric.clone(x),Aj,Ai,alpha,temp,k1,k2,k3;
    for(j=0;j<n-1;j++) {
        k=j;
        for(i=j+1;i<n;i++) { if(Math.abs(A[i][j]) > Math.abs(A[k][j])) { k = i; } }
        if(k !== j) {
            temp = A[k]; A[k] = A[j]; A[j] = temp;
            ret *= -1;
        }
        Aj = A[j];
        for(i=j+1;i<n;i++) {
            Ai = A[i];
            alpha = Ai[j]/Aj[j];
            for(k=j+1;k<n-3;k+=4) {
                k1 = k+1; k2 = k+2; k3 = k+3;
                Ai[k] -= Aj[k]*alpha;
                Ai[k1] -= Aj[k1]*alpha;
                Ai[k2] -= Aj[k2]*alpha;
                Ai[k3] -= Aj[k3]*alpha;
            }
            while(k<n) { Ai[k] -= Aj[k]*alpha; k++; }
        }
        if(Aj[j] === 0) { return 0; }
        ret *= Aj[j];
    }
    return ret*A[j][j];
}

numeric.transpose = function transpose(x) {
    var i,j,j1,j2,j3,m = x.length,n = x[0].length, ret=new Array(n),Ai;
    for(j=0;j<n;j++) ret[j] = new Array(m);
    for(i=0;i<m;i++) {
        Ai = x[i];
        for(j=n-1;j>=3;j-=4) {
            j1 = j-1; j2 = j-2; j3 = j-3;
            ret[j][i] = Ai[j];
            ret[j1][i] = Ai[j1];
            ret[j2][i] = Ai[j2];
            ret[j3][i] = Ai[j3];
        }
        while(j>=0) { ret[j][i] = Ai[j]; j--; }
    }
    return ret;
}
numeric.negtranspose = function negtranspose(x) {
    var i,j,j1,j2,j3,m = x.length,n = x[0].length, ret=new Array(n),Ai;
    for(j=0;j<n;j++) ret[j] = new Array(m);
    for(i=0;i<m;i++) {
        Ai = x[i];
        for(j=n-1;j>=3;j-=4) {
            j1 = j-1; j2 = j-2; j3 = j-3;
            ret[j][i] = -Ai[j];
            ret[j1][i] = -Ai[j1];
            ret[j2][i] = -Ai[j2];
            ret[j3][i] = -Ai[j3];
        }
        while(j>=0) { ret[j][i] = -Ai[j]; j--; }
    }
    return ret;
}

numeric._random = function _random(s,k) {
    var i,n=s[k],ret=new Array(n), rnd, me = numeric._random;
    if(k === s.length-1) {
        rnd = Math.random;
        for(i=n-1;i>=3;i-=4) {
            ret[i] = rnd();
            ret[i-1] = rnd();
            ret[i-2] = rnd();
            ret[i-3] = rnd();
        }
        while(i>=0) { ret[i--] = rnd(); }
        return ret;
    }
    for(i=n-1;i>=0;i--) ret[i] = me(s,k+1);
    return ret;
}
numeric.random = function random(s) { return numeric._random(s,0); }

numeric.norm2Squared = function norm2Squared(x) {}
numeric.norm2Squared = numeric.mapreduce('accum += xi*xi;','0');

numeric.norm2 = function norm2(x) { return Math.sqrt(numeric.norm2Squared(x)); }

numeric.linspace = function linspace(a,b,n) {
    if(typeof n === "undefined") n = Math.round(b-a)+1;
    var i,ret = new Array(n);
    n--;
    for(i=n;i>=0;i--) { ret[i] = (i*b+(n-i)*a)/n; }
    return ret;
}

numeric.getBlock = function getBlock(x,from,to) {
    var s = numeric.dim(x);
    function foo(x,k) {
        var i,a = from[k], n = to[k]-a, ret = new Array(n);
        if(k === s.length-1) {
            for(i=n;i>=0;i--) { ret[i] = x[i+a]; }
            return ret;
        }
        for(i=n;i>=0;i--) { ret[i] = foo(x[i+a],k+1); }
        return ret;
    }
    return foo(x,0);
}

numeric.setBlock = function setBlock(x,from,to,B) {
    var s = numeric.dim(x);
    function foo(x,y,k) {
        var i,a = from[k], n = to[k]-a;
        if(k === s.length-1) { for(i=n;i>=0;i--) { x[i+a] = y[i]; } }
        for(i=n;i>=0;i--) { foo(x[i+a],y[i],k+1); }
    }
    foo(x,B,0);
    return x;
}

numeric.tensor = function tensor(x,y) {
    var s1 = numeric.dim(x), s2 = numeric.dim(y);
    if(s1.length !== 1 || s2.length !== 1) {
        throw new Error('numeric: tensor product is only defined for vectors');
    }
    var m = s1[0], n = s2[0], A = new Array(m), Ai, i,j,xi,j1,j2,j3;
    for(i=m-1;i>=0;i--) {
        Ai = new Array(n);
        xi = x[i];
        for(j=n-1;j>=3;j-=4) {
            j1 = j-1; j2 = j-2; j3 = j-3;
            Ai[j] = xi * y[j];
            Ai[j1] = xi * y[j1];
            Ai[j2] = xi * y[j2];
            Ai[j3] = xi * y[j3];
        }
        while(j>=0) { Ai[j] = xi * y[j]; j--; }
        A[i] = Ai;
    }
    return A;
}

// 3. The Tensor type T
numeric.T = function T(x,y) { this.x = x; this.y = y; }

numeric.Tbinop = function Tbinop(rr,rc,cr,cc,setup) {
    var io = numeric.indexOf;
    if(typeof setup !== "string") {
        var k;
        setup = '';
        for(k in numeric) {
            if(numeric.hasOwnProperty(k) && (rr.indexOf(k)>=0 || rc.indexOf(k)>=0 || cr.indexOf(k)>=0 || cc.indexOf(k)>=0) && k.length>1) {
                setup += 'var '+k+' = numeric.'+k+';\n';
            }
        }
    }
    return Function(['y'],
            'var x = this;\n'+
            'if(!(y instanceof numeric.T)) { y = new numeric.T(y); }\n'+
            setup+'\n'+
            'if(x.y) {'+
            '  if(y.y) {'+
            '    return new numeric.T('+cc+');\n'+
            '  }\n'+
            '  return new numeric.T('+cr+');\n'+
            '}\n'+
            'if(y.y) {\n'+
            '  return new numeric.T('+rc+');\n'+
            '}\n'+
            'return new numeric.T('+rr+');\n'
    );
}

numeric.T.prototype.add = numeric.Tbinop(
        'add(x.x,y.x)',
        'add(x.x,y.x),y.y',
        'add(x.x,y.x),x.y',
        'add(x.x,y.x),add(x.y,y.y)');
numeric.T.prototype.sub = numeric.Tbinop(
        'sub(x.x,y.x)',
        'sub(x.x,y.x),neg(y.y)',
        'sub(x.x,y.x),x.y',
        'sub(x.x,y.x),sub(x.y,y.y)');
numeric.T.prototype.mul = numeric.Tbinop(
        'mul(x.x,y.x)',
        'mul(x.x,y.x),mul(x.x,y.y)',
        'mul(x.x,y.x),mul(x.y,y.x)',
        'sub(mul(x.x,y.x),mul(x.y,y.y)),add(mul(x.x,y.y),mul(x.y,y.x))');

numeric.T.prototype.reciprocal = function reciprocal() {
    var mul = numeric.mul, div = numeric.div;
    if(this.y) {
        var d = numeric.add(mul(this.x,this.x),mul(this.y,this.y));
        return new numeric.T(div(this.x,d),div(numeric.neg(this.y),d));
    }
    return new T(div(1,this.x));
}
numeric.T.prototype.div = function div(y) {
    if(!(y instanceof numeric.T)) y = new numeric.T(y);
    if(y.y) { return this.mul(y.reciprocal()); }
    var div = numeric.div;
    if(this.y) { return new numeric.T(div(this.x,y.x),div(this.y,y.x)); }
    return new numeric.T(div(this.x,y.x));
}
numeric.T.prototype.dot = numeric.Tbinop(
        'dot(x.x,y.x)',
        'dot(x.x,y.x),dot(x.x,y.y)',
        'dot(x.x,y.x),dot(x.y,y.x)',
        'sub(dot(x.x,y.x),dot(x.y,y.y)),add(dot(x.x,y.y),dot(x.y,y.x))'
        );
numeric.T.prototype.transpose = function transpose() {
    var t = numeric.transpose, x = this.x, y = this.y;
    if(y) { return new numeric.T(t(x),t(y)); }
    return new numeric.T(t(x));
}
numeric.T.prototype.transjugate = function transjugate() {
    var t = numeric.transpose, x = this.x, y = this.y;
    if(y) { return new numeric.T(t(x),numeric.negtranspose(y)); }
    return new numeric.T(t(x));
}
numeric.Tunop = function Tunop(r,c,s) {
    if(typeof s !== "string") { s = ''; }
    return Function(
            'var x = this;\n'+
            s+'\n'+
            'if(x.y) {'+
            '  '+c+';\n'+
            '}\n'+
            r+';\n'
    );
}

numeric.T.prototype.exp = numeric.Tunop(
        'return new numeric.T(ex)',
        'return new numeric.T(mul(cos(x.y),ex),mul(sin(x.y),ex))',
        'var ex = numeric.exp(x.x), cos = numeric.cos, sin = numeric.sin, mul = numeric.mul;');
numeric.T.prototype.conj = numeric.Tunop(
        'return new numeric.T(x.x);',
        'return new numeric.T(x.x,numeric.neg(x.y));');
numeric.T.prototype.neg = numeric.Tunop(
        'return new numeric.T(neg(x.x));',
        'return new numeric.T(neg(x.x),neg(x.y));',
        'var neg = numeric.neg;');
numeric.T.prototype.sin = numeric.Tunop(
        'return new numeric.T(numeric.sin(x.x))',
        'return x.exp().sub(x.neg().exp()).div(new numeric.T(0,2));');
numeric.T.prototype.cos = numeric.Tunop(
        'return new numeric.T(numeric.cos(x.x))',
        'return x.exp().add(x.neg().exp()).div(2);');
numeric.T.prototype.abs = numeric.Tunop(
        'return new numeric.T(numeric.abs(x.x));',
        'return new numeric.T(numeric.sqrt(numeric.add(mul(x.x,x.x),(x.y,x.y))));',
        'var mul = numeric.mul;');
numeric.T.prototype.log = numeric.Tunop(
        'return new numeric.T(numeric.log(x.x));',
        'var theta = new numeric.T(numeric.atan2(x.y,x.x)), r = x.abs();\n'+
        'return new numeric.T(numeric.log(r.x),theta.x);');
numeric.T.prototype.norm2 = numeric.Tunop(
        'return numeric.norm2(x.x);',
        'var f = numeric.norm2Squared;\n'+
        'return Math.sqrt(f(x.x)+f(x.y));');
numeric.T.prototype.inv = function inv() {
    var A = this;
    if(typeof A.y === "undefined") { return new numeric.T(numeric.inv(A.x)); }
    var n = A.x.length, i, j, k;
    var Rx = numeric.identity(n),Ry = numeric.rep([n,n],0);
    var Ax = numeric.clone(A.x), Ay = numeric.clone(A.y);
    var Aix, Aiy, Ajx, Ajy, Rix, Riy, Rjx, Rjy;
    var i,j,k,d,d1,ax,ay,bx,by,temp;
    for(i=0;i<n;i++) {
        ax = Ax[i][i]; ay = Ay[i][i];
        d = ax*ax+ay*ay;
        k = i;
        for(j=i+1;j<n;j++) {
            ax = Ax[j][i]; ay = Ay[j][i];
            d1 = ax*ax+ay*ay;
            if(d1 > d) { k=j; d = d1; }
        }
        if(k!==i) {
            temp = Ax[i]; Ax[i] = Ax[k]; Ax[k] = temp;
            temp = Ay[i]; Ay[i] = Ay[k]; Ay[k] = temp;
            temp = Rx[i]; Rx[i] = Rx[k]; Rx[k] = temp;
            temp = Ry[i]; Ry[i] = Ry[k]; Ry[k] = temp;
        }
        Aix = Ax[i]; Aiy = Ay[i];
        Rix = Rx[i]; Riy = Ry[i];
        ax = Aix[i]; ay = Aiy[i];
        for(j=i+1;j<n;j++) {
            bx = Aix[j]; by = Aiy[j];
            Aix[j] = (bx*ax+by*ay)/d;
            Aiy[j] = (by*ax-bx*ay)/d;
        }
        for(j=0;j<n;j++) {
            bx = Rix[j]; by = Riy[j];
            Rix[j] = (bx*ax+by*ay)/d;
            Riy[j] = (by*ax-bx*ay)/d;
        }
        for(j=i+1;j<n;j++) {
            Ajx = Ax[j]; Ajy = Ay[j];
            Rjx = Rx[j]; Rjy = Ry[j];
            ax = Ajx[i]; ay = Ajy[i];
            for(k=i+1;k<n;k++) {
                bx = Aix[k]; by = Aiy[k];
                Ajx[k] -= bx*ax-by*ay;
                Ajy[k] -= by*ax+bx*ay;
            }
            for(k=0;k<n;k++) {
                bx = Rix[k]; by = Riy[k];
                Rjx[k] -= bx*ax-by*ay;
                Rjy[k] -= by*ax+bx*ay;
            }
        }
    }
    for(i=n-1;i>0;i--) {
        Rix = Rx[i]; Riy = Ry[i];
        for(j=i-1;j>=0;j--) {
            Rjx = Rx[j]; Rjy = Ry[j];
            ax = Ax[j][i]; ay = Ay[j][i];
            for(k=n-1;k>=0;k--) {
                bx = Rix[k]; by = Riy[k];
                Rjx[k] -= ax*bx - ay*by;
                Rjy[k] -= ax*by + ay*bx;
            }
        }
    }
    return new numeric.T(Rx,Ry);
}
numeric.T.prototype.get = function get(i) {
    var x = this.x, y = this.y, k = 0, ik, n = i.length;
    if(y) {
        while(k<n) {
            ik = i[k];
            x = x[ik];
            y = y[ik];
            k++;
        }
        return new numeric.T(x,y);
    }
    while(k<n) {
        ik = i[k];
        x = x[ik];
        k++;
    }
    return new numeric.T(x);
}
numeric.T.prototype.set = function set(i,v) {
    var x = this.x, y = this.y, k = 0, ik, n = i.length, vx = v.x, vy = v.y;
    if(n===0) {
        if(vy) { this.y = vy; }
        else if(y) { this.y = undefined; }
        this.x = x;
        return this;
    }
    if(vy) {
        if(y) { /* ok */ }
        else {
            y = numeric.rep(numeric.dim(x),0);
            this.y = y;
        }
        while(k<n-1) {
            ik = i[k];
            x = x[ik];
            y = y[ik];
            k++;
        }
        ik = i[k];
        x[ik] = vx;
        y[ik] = vy;
        return this;
    }
    if(y) {
        while(k<n-1) {
            ik = i[k];
            x = x[ik];
            y = y[ik];
            k++;
        }
        ik = i[k];
        x[ik] = vx;
        if(vx instanceof Array) y[ik] = numeric.rep(numeric.dim(vx),0);
        else y[ik] = 0;
        return this;
    }
    while(k<n-1) {
        ik = i[k];
        x = x[ik];
        k++;
    }
    ik = i[k];
    x[ik] = vx;
    return this;
}
numeric.T.prototype.getRows = function getRows(i0,i1) {
    var n = i1-i0+1, j;
    var rx = new Array(n), ry, x = this.x, y = this.y;
    for(j=i0;j<=i1;j++) { rx[j-i0] = x[j]; }
    if(y) {
        ry = new Array(n);
        for(j=i0;j<=i1;j++) { ry[j-i0] = y[j]; }
        return new numeric.T(rx,ry);
    }
    return new numeric.T(rx);
}
numeric.T.prototype.setRows = function setRows(i0,i1,A) {
    var j;
    var rx = this.x, ry = this.y, x = A.x, y = A.y;
    for(j=i0;j<=i1;j++) { rx[j] = x[j-i0]; }
    if(y) {
        if(!ry) { ry = numeric.rep(numeric.dim(rx),0); this.y = ry; }
        for(j=i0;j<=i1;j++) { ry[j] = y[j-i0]; }
    } else if(ry) {
        for(j=i0;j<=i1;j++) { ry[j] = numeric.rep([x[j-i0].length],0); }
    }
    return this;
}
numeric.T.prototype.getRow = function getRow(k) {
    var x = this.x, y = this.y;
    if(y) { return new numeric.T(x[k],y[k]); }
    return new numeric.T(x[k]);
}
numeric.T.prototype.setRow = function setRow(i,v) {
    var rx = this.x, ry = this.y, x = v.x, y = v.y;
    rx[i] = x;
    if(y) {
        if(!ry) { ry = numeric.rep(numeric.dim(rx),0); this.y = ry; }
        ry[i] = y;
    } else if(ry) {
        ry = numeric.rep([x.length],0);
    }
    return this;
}

numeric.T.prototype.getBlock = function getBlock(from,to) {
    var x = this.x, y = this.y, b = numeric.getBlock;
    if(y) { return new numeric.T(b(x,from,to),b(y,from,to)); }
    return new numeric.T(b(x,from,to));
}
numeric.T.prototype.setBlock = function setBlock(from,to,A) {
    if(!(A instanceof numeric.T)) A = new numeric.T(A);
    var x = this.x, y = this.y, b = numeric.setBlock, Ax = A.x, Ay = A.y;
    if(Ay) {
        if(!y) { this.y = numeric.rep(numeric.dim(this),0); y = this.y; }
        b(x,from,to,Ax);
        b(y,from,to,Ay);
        return this;
    }
    b(x,from,to,Ax);
    if(y) b(y,from,to,numeric.rep(numeric.dim(Ax),0));
}
numeric.T.rep = function rep(s,v) {
    var T = numeric.T;
    if(!(v instanceof T)) v = new T(v);
    var x = v.x, y = v.y, r = numeric.rep;
    if(y) return new T(r(s,x),r(s,y));
    return new T(r(s,x));
}
numeric.T.diag = function diag(d) {
    if(!(d instanceof numeric.T)) d = new numeric.T(d);
    var x = d.x, y = d.y, diag = numeric.diag;
    if(y) return new numeric.T(diag(x),diag(y));
    return new numeric.T(diag(x));
}
numeric.T.eig = function eig() {
    if(this.y) { throw new Error('eig: not implemented for complex matrices.'); }
    return numeric.eig(this.x);
}
numeric.T.identity = function identity(n) { return new numeric.T(numeric.identity(n)); }
numeric.T.prototype.getDiag = function getDiag() {
    var n = numeric;
    var x = this.x, y = this.y;
    if(y) { return new n.T(n.getDiag(x),n.getDiag(y)); }
    return new n.T(n.getDiag(x));
}

// 4. Eigenvalues of real matrices

numeric.house = function house(x) {
    var v = numeric.clone(x);
    var s = x[0] >= 0 ? 1 : -1;
    var alpha = s*numeric.norm2(x);
    v[0] += alpha;
    var foo = numeric.norm2(v);
    if(foo === 0) { /* this should not happen */ throw new Error('eig: internal error'); }
    return numeric.div(v,foo);
}

numeric.toUpperHessenberg = function toUpperHessenberg(me) {
    var s = numeric.dim(me);
    if(s.length !== 2 || s[0] !== s[1]) { throw new Error('numeric: toUpperHessenberg() only works on square matrices'); }
    var m = s[0], i,j,k,x,v,A = numeric.clone(me),B,C,Ai,Ci,Q = numeric.identity(m),Qi;
    for(j=0;j<m-2;j++) {
        x = new Array(m-j-1);
        for(i=j+1;i<m;i++) { x[i-j-1] = A[i][j]; }
        v = numeric.house(x);
        B = numeric.getBlock(A,[j+1,j],[m-1,m-1]);
        C = numeric.tensor(v,numeric.dot(v,B));
        for(i=j+1;i<m;i++) { Ai = A[i]; Ci = C[i-j-1]; for(k=j;k<m;k++) Ai[k] -= 2*Ci[k-j]; }
        B = numeric.getBlock(A,[0,j+1],[m-1,m-1]);
        C = numeric.tensor(numeric.dot(B,v),v);
        for(i=0;i<m;i++) { Ai = A[i]; Ci = C[i]; for(k=j+1;k<m;k++) Ai[k] -= 2*Ci[k-j-1]; }
        B = new Array(m-j-1);
        for(i=j+1;i<m;i++) B[i-j-1] = Q[i];
        C = numeric.tensor(v,numeric.dot(v,B));
        for(i=j+1;i<m;i++) { Qi = Q[i]; Ci = C[i-j-1]; for(k=0;k<m;k++) Qi[k] -= 2*Ci[k]; }
    }
    return {H:A, Q:Q};
}

numeric.epsilon = 2.220446049250313e-16;

numeric.QRFrancis = function(H,maxiter) {
    if(typeof maxiter === "undefined") { maxiter = 10000; }
    H = numeric.clone(H);
    var H0 = numeric.clone(H);
    var s = numeric.dim(H),m=s[0],x,v,a,b,c,d,det,tr, Hloc, Q = numeric.identity(m), Qi, Hi, B, C, Ci,i,j,k,iter;
    if(m<3) { return {Q:Q, B:[ [0,m-1] ]}; }
    var epsilon = numeric.epsilon;
    for(iter=0;iter<maxiter;iter++) {
        for(j=0;j<m-1;j++) {
            if(Math.abs(H[j+1][j]) < epsilon*(Math.abs(H[j][j])+Math.abs(H[j+1][j+1]))) {
                var QH1 = numeric.QRFrancis(numeric.getBlock(H,[0,0],[j,j]),maxiter);
                var QH2 = numeric.QRFrancis(numeric.getBlock(H,[j+1,j+1],[m-1,m-1]),maxiter);
                B = new Array(j+1);
                for(i=0;i<=j;i++) { B[i] = Q[i]; }
                C = numeric.dot(QH1.Q,B);
                for(i=0;i<=j;i++) { Q[i] = C[i]; }
                B = new Array(m-j-1);
                for(i=j+1;i<m;i++) { B[i-j-1] = Q[i]; }
                C = numeric.dot(QH2.Q,B);
                for(i=j+1;i<m;i++) { Q[i] = C[i-j-1]; }
                return {Q:Q,B:QH1.B.concat(numeric.add(QH2.B,j+1))};
            }
        }
        a = H[m-2][m-2]; b = H[m-2][m-1];
        c = H[m-1][m-2]; d = H[m-1][m-1];
        tr = a+d;
        det = (a*d-b*c);
        Hloc = numeric.getBlock(H, [0,0], [2,2]);
        if(tr*tr>=4*det) {
            var s1,s2;
            s1 = 0.5*(tr+Math.sqrt(tr*tr-4*det));
            s2 = 0.5*(tr-Math.sqrt(tr*tr-4*det));
            Hloc = numeric.add(numeric.sub(numeric.dot(Hloc,Hloc),
                                           numeric.mul(Hloc,s1+s2)),
                               numeric.diag(numeric.rep([3],s1*s2)));
        } else {
            Hloc = numeric.add(numeric.sub(numeric.dot(Hloc,Hloc),
                                           numeric.mul(Hloc,tr)),
                               numeric.diag(numeric.rep([3],det)));
        }
        x = [Hloc[0][0],Hloc[1][0],Hloc[2][0]];
        v = numeric.house(x);
        B = [H[0],H[1],H[2]];
        C = numeric.tensor(v,numeric.dot(v,B));
        for(i=0;i<3;i++) { Hi = H[i]; Ci = C[i]; for(k=0;k<m;k++) Hi[k] -= 2*Ci[k]; }
        B = numeric.getBlock(H, [0,0],[m-1,2]);
        C = numeric.tensor(numeric.dot(B,v),v);
        for(i=0;i<m;i++) { Hi = H[i]; Ci = C[i]; for(k=0;k<3;k++) Hi[k] -= 2*Ci[k]; }
        B = [Q[0],Q[1],Q[2]];
        C = numeric.tensor(v,numeric.dot(v,B));
        for(i=0;i<3;i++) { Qi = Q[i]; Ci = C[i]; for(k=0;k<m;k++) Qi[k] -= 2*Ci[k]; }
        var J;
        for(j=0;j<m-2;j++) {
            for(k=j;k<=j+1;k++) {
                if(Math.abs(H[k+1][k]) < epsilon*(Math.abs(H[k][k])+Math.abs(H[k+1][k+1]))) {
                    var QH1 = numeric.QRFrancis(numeric.getBlock(H,[0,0],[k,k]),maxiter);
                    var QH2 = numeric.QRFrancis(numeric.getBlock(H,[k+1,k+1],[m-1,m-1]),maxiter);
                    B = new Array(k+1);
                    for(i=0;i<=k;i++) { B[i] = Q[i]; }
                    C = numeric.dot(QH1.Q,B);
                    for(i=0;i<=k;i++) { Q[i] = C[i]; }
                    B = new Array(m-k-1);
                    for(i=k+1;i<m;i++) { B[i-k-1] = Q[i]; }
                    C = numeric.dot(QH2.Q,B);
                    for(i=k+1;i<m;i++) { Q[i] = C[i-k-1]; }
                    return {Q:Q,B:QH1.B.concat(numeric.add(QH2.B,k+1))};
                }
            }
            J = Math.min(m-1,j+3);
            x = new Array(J-j);
            for(i=j+1;i<=J;i++) { x[i-j-1] = H[i][j]; }
            v = numeric.house(x);
            B = numeric.getBlock(H, [j+1,j],[J,m-1]);
            C = numeric.tensor(v,numeric.dot(v,B));
            for(i=j+1;i<=J;i++) { Hi = H[i]; Ci = C[i-j-1]; for(k=j;k<m;k++) Hi[k] -= 2*Ci[k-j]; }
            B = numeric.getBlock(H, [0,j+1],[m-1,J]);
            C = numeric.tensor(numeric.dot(B,v),v);
            for(i=0;i<m;i++) { Hi = H[i]; Ci = C[i]; for(k=j+1;k<=J;k++) Hi[k] -= 2*Ci[k-j-1]; }
            B = new Array(J-j);
            for(i=j+1;i<=J;i++) B[i-j-1] = Q[i];
            C = numeric.tensor(v,numeric.dot(v,B));
            for(i=j+1;i<=J;i++) { Qi = Q[i]; Ci = C[i-j-1]; for(k=0;k<m;k++) Qi[k] -= 2*Ci[k]; }
        }
    }
    throw new Error('numeric: eigenvalue iteration does not converge -- increase maxiter?');
}

numeric.eig = function eig(A,maxiter) {
    var QH = numeric.toUpperHessenberg(A);
    var QB = numeric.QRFrancis(QH.H,maxiter);
    var T = numeric.T;
    var n = A.length,i,k,flag = false,B = QB.B,H = numeric.dot(QB.Q,numeric.dot(QH.H,numeric.transpose(QB.Q)));
    var Q = new T(numeric.dot(QB.Q,QH.Q)),Q0;
    var m = B.length,j;
    var a,b,c,d,p1,p2,disc,x,y,p,q,n1,n2;
    var sqrt = Math.sqrt;
    for(k=0;k<m;k++) {
        i = B[k][0];
        if(i === B[k][1]) {
            // nothing
        } else {
            j = i+1;
            a = H[i][i];
            b = H[i][j];
            c = H[j][i];
            d = H[j][j];
            p1 = -a-d;
            p2 = a*d-b*c;
            disc = p1*p1-4*p2;
            if(disc>=0) {
                if(p1<0) x = -0.5*(p1-sqrt(disc));
                else     x = -0.5*(p1+sqrt(disc));
                n1 = (a-x)*(a-x)+b*b;
                n2 = c*c+(d-x)*(d-x);
                if(n1>n2) {
                    n1 = sqrt(n1);
                    p = (a-x)/n1;
                    q = b/n1;
                } else {
                    n2 = sqrt(n2);
                    p = c/n2;
                    q = (d-x)/n2;
                }
                Q0 = new T([[q,-p],[p,q]]);
                Q.setRows(i,j,Q0.dot(Q.getRows(i,j)));
            } else {
                x = -0.5*p1;
                y = 0.5*sqrt(-disc);
                n1 = (a-x)*(a-x)+b*b;
                n2 = c*c+(d-x)*(d-x);
                if(n1>n2) {
                    n1 = sqrt(n1+y*y);
                    p = (a-x)/n1;
                    q = b/n1;
                    x = 0;
                    y /= n1;
                } else {
                    n2 = sqrt(n2+y*y);
                    p = c/n2;
                    q = (d-x)/n2;
                    x = y/n2;
                    y = 0;
                }
                Q0 = new T([[q,-p],[p,q]],[[x,y],[y,-x]]);
                Q.setRows(i,j,Q0.dot(Q.getRows(i,j)));
            }
        }
    }
    var R = Q.dot(A).dot(Q.transjugate()), n = A.length, E = numeric.T.identity(n);
    for(j=0;j<n;j++) {
        if(j>0) {
            for(k=j-1;k>=0;k--) {
                x = R.getRow(k).getBlock([k],[j-1]);
                y = E.getRow(j).getBlock([k],[j-1]);
                E.set([j,k],(R.get([k,j]).neg().sub(x.dot(y))).div(R.get([k,k]).sub(R.get([j,j]))));
            }
        }
    }
    for(j=0;j<n;j++) {
        x = E.getRow(j);
        E.setRow(j,x.div(x.norm2()));
    }
    E = E.transpose();
    E = Q.transjugate().dot(E);
    return { lambda:R.getDiag(), E:E };
};

// 5. Real sparse linear algebra

var sparse = {};

sparse.dim = function dim(A,ret,k) {
    if(typeof ret === "undefined") { ret = []; }
    if(typeof A !== "object") return ret;
    if(typeof k === "undefined") { k=0; }
    if(!(k in ret)) { ret[k] = 0; }
    if(A.length > ret[k]) ret[k] = A.length;
    var i;
    for(i in A) {
        dim(A[i],ret,k+1);
    }
    return ret;
};

sparse.clone = function clone(A,k,n) {
    if(typeof k === "undefined") { k=0; }
    if(typeof n === "undefined") { n = sparse.dim(A).length; }
    var i,ret = new Array(A.length);
    if(k === n-1) {
        for(i in A) { ret[i] = A[i]; }
        return ret;
    }
    for(i in A) {
        ret[i] = clone(A[i],k+1,n);
    }
    return ret;
}

sparse.diag = function diag(d) {
    var n = d.length,i,ret = new Array(n),i1,i2,i3;
    for(i=n-1;i>=3;i-=4) {
        i1 = i-1;
        i2 = i-2;
        i3 = i-3;
        ret[i] = []; ret[i][i] = d[i];
        ret[i1] = []; ret[i1][i1] = d[i1];
        ret[i2] = []; ret[i1][i2] = d[i2];
        ret[i3] = []; ret[i1][i3] = d[i3];
    }
    while(i>=0) { ret[i] = []; ret[i][i] = d[i]; i--; }
    return ret;
}

sparse.identity = function identity(n) { return sparse.diag(numeric.rep([n],1)); }

sparse.transpose = function transpose(A) {
    var ret = [], n = A.length, i,j,Ai;
    for(i in A) {
        Ai = A[i];
        for(j in Ai) {
            if(typeof ret[j] !== "object") { ret[j] = []; }
            ret[j][i] = Ai[j];
        }
    }
    return ret;
}

sparse.LUP = function LUP(A,tol) {
    if(typeof tol === "undefined") { tol = 1; }
    var n = A.length, i,j,k;
    var L = sparse.identity(n), U = sparse.clone(A), UT = sparse.transpose(U);
    var P = numeric.linspace(0,n-1),Q = numeric.linspace(0,n-1);
    var Ui, Uj, UTi, temp,alpha;
    var abs = Math.abs;
    for(i=0;i<n-1;i++) {
        UTi = UT[i];
        j = i;
        for(k in UTi) {
            k = Q[k];
            if(k<=i) continue;
            if(abs(U[k][i]) > abs(U[j][i])) { j = k; }
        }
        if(abs(U[i]) >= tol*abs(U[j])) { j = i; }
        if(j!==i) {
            temp = U[i]; U[i] = U[j]; U[j] = temp;
            temp = L[i]; L[i] = L[j]; L[j] = temp;
            temp = P[i]; P[i] = P[j]; P[j] = temp;
            Q = new Array(n);
            for(j=0;j<n;j++) { Q[P[j]] = j; }
        }
        Ui = U[i];
        for(j in UTi) {
            j = Q[j];
            if(j<=i) continue;
            Uj = U[j];
            alpha = Uj[i]/Ui[i];
            L[j][i] = alpha;
            for(k in Ui) {
                if(k > i) {
                    if(!(k in Uj)) { Uj[k] = 0; UT[k][j] = 0; }
                    Uj[k] -= alpha*Ui[k];
                } else {
                    delete Uj[k];
                }
            }
        }
    }
    return {L:L, U:U, P:P, Pinv:Q};
};

sparse.dotMM = function dotMM(A,B) {
    var p = A.length, q = B.length, BT = sparse.transpose(B), r = BT.length, Ai, BTk;
    var i,j,k,accum;
    var ret = new Array(p),reti;
    for(i=p-1;i>=0;i--) {
        reti = [];
        Ai = A[i];
        for(k=r-1;k>=0;k--) {
            accum = 0;
            BTk = BT[k];
            for(j in Ai) {
                if(j in BTk) { accum += Ai[j]*BTk[j]; }
            }
            if(accum) reti[k] = accum;
        }
        ret[i] = reti;
    }
    return ret;
}

sparse.dotMV = function dotMV(A,x) {
    var p = A.length, Ai, i,j;
    var ret = new Array(p), accum;
    for(i=p-1;i>=0;i--) {
        Ai = A[i];
        accum = 0;
        for(j in Ai) {
            if(j in x) accum += Ai[j]*x[j];
        }
        if(accum) ret[i] = accum;
    }
    return ret;
}

sparse.dotVM = function dotMV(x,A) {
    var i,j,Ai,alpha;
    var ret = [], accum;
    for(i in x) {
        Ai = A[i];
        alpha = x[i];
        for(j in Ai) {
            if(!(j in ret)) { ret[j] = 0; }
            ret[j] += alpha*Ai[j];
        }
    }
    return ret;
}

sparse.dotVV = function dotVV(x,y) {
    var i,ret=0;
    for(i in x) { if(i in y) ret+= x[i]*y[i]; }
    return ret;
}

sparse.dot = function dot(A,B) {
    var m = sparse.dim(A).length, n = sparse.dim(B).length;
    var k = m*1000+n;
    switch(k) {
    case 0: return A*B;
    case 1001: return sparse.dotVV(A,B);
    case 2001: return sparse.dotMV(A,B);
    case 1002: return sparse.dotVM(A,B);
    case 2002: return sparse.dotMM(A,B);
    default: throw new Error('sparse.dot not implemented for tensors of order '+m+' and '+n);
    }
}

sparse.LUPsolve = function LUPsolve(lup,b) {
    var L = lup.L, U = lup.U, P = lup.P;
    var n = L.length, i,j, ret = new Array(n), accum, Ai;
    for(i = 0;i<n;i++) {
        if(P[i] in b) accum = b[P[i]];
        else accum = 0;
        Ai = L[i];
        for(j in Ai) {
            if(j<i) { accum -= Ai[j]*ret[j]; }
        }
        ret[i] = accum;
    }
    for(i = n-1;i>=0;i--) {
        accum = ret[i];
        Ai = U[i];
        for(j in Ai) {
            if(j>i) { accum -= Ai[j]*ret[j]; }
        }
        ret[i] = accum/Ai[i];
    }
    return ret;
}

sparse.scatter = function scatter(V) {
    var i = V[0], j = V[1], x = V[2];
    var k,ret = [],ik,jk, reti;
    for(k=0;k<i.length;k++) {
        ik = i[k];
        jk = j[k];
        if(!(ik in ret)) { reti = []; ret[ik] = reti; }
        else { reti = ret[ik]; }
        if(!(jk in reti)) { reti[jk] = 0; }
        reti[jk] += x[k];
    }
    return ret;
}

sparse.gather = function gather(A) {
    var i = [], j = [], x = [];
    var p,q,Ap;
    for(p in A) {
        Ap = A[p];
        for(q in Ap) {
            i.push(parseInt(p));
            j.push(parseInt(q));
            x.push(Ap[q]);
        }
    }
    return [i,j,x];
}

// 6. Coordinate matrices
var coord = {};

coord.LU = function LU(A) {
    var I = A[0], J = A[1], V = A[2];
    var p = I.length, m=0, i,j,k,a,b,c;
    for(i=0;i<p;i++) if(I[i]>m) m=I[i];
    m++;
    var L = new Array(m), U = new Array(m), left = numeric.rep([m],Infinity), right = numeric.rep([m],-Infinity);
    var Ui, Uj,alpha;
    for(k=0;k<p;k++) {
        i = I[k];
        j = J[k];
        if(j<left[i]) left[i] = j;
        if(j>right[i]) right[i] = j;
    }
    for(i=0;i<m-1;i++) { if(right[i] > right[i+1]) right[i+1] = right[i]; }
    for(i=m-1;i>=1;i--) { if(left[i]<left[i-1]) left[i-1] = left[i]; }
    var countL = 0, countU = 0;
    for(i=0;i<m;i++) {
        U[i] = numeric.rep([right[i]-left[i]+1],0);
        L[i] = numeric.rep([i-left[i]],0);
        countL += i-left[i]+1;
        countU += right[i]-i+1;
    }
    for(k=0;k<p;k++) { i = I[k]; U[i][J[k]-left[i]] = V[k]; }
    for(i=0;i<m-1;i++) {
        a = i-left[i];
        Ui = U[i];
        for(j=i+1;left[j]<=i && j<m;j++) {
            b = i-left[j];
            c = right[i]-i;
            Uj = U[j];
            alpha = Uj[b]/Ui[a];
            if(alpha) {
                for(k=1;k<=c;k++) { Uj[k+b] -= alpha*Ui[k+a]; }
                L[j][i-left[j]] = alpha;
            }
        }
    }
    var Ui = [], Uj = [], Uv = [], Li = [], Lj = [], Lv = [];
    var p,q,foo;
    p=0; q=0;
    for(i=0;i<m;i++) {
        a = left[i];
        b = right[i];
        foo = U[i];
        for(j=i;j<=b;j++) {
            if(foo[j-a]) {
                Ui[p] = i;
                Uj[p] = j;
                Uv[p] = foo[j-a];
                p++;
            }
        }
        foo = L[i];
        for(j=a;j<i;j++) {
            if(foo[j-a]) {
                Li[q] = i;
                Lj[q] = j;
                Lv[q] = foo[j-a];
                q++;
            }
        }
        Li[q] = i;
        Lj[q] = i;
        Lv[q] = 1;
        q++;
    }
    return {U:[Ui,Uj,Uv], L:[Li,Lj,Lv]};
};

coord.LUsolve = function LUsolve(lu,b) {
    var L = lu.L, U = lu.U, ret = numeric.clone(b);
    var Li = L[0], Lj = L[1], Lv = L[2];
    var Ui = U[0], Uj = U[1], Uv = U[2];
    var p = Ui.length, q = Li.length;
    var m = ret.length,i,j,k;
    k = 0;
    for(i=0;i<m;i++) {
        while(Lj[k] < i) {
            ret[i] -= Lv[k]*ret[Lj[k]];
            k++;
        }
        k++;
    }
    k = p-1;
    for(i=m-1;i>=0;i--) {
        while(Uj[k] > i) {
            ret[i] -= Uv[k]*ret[Uj[k]];
            k--;
        }
        ret[i] /= Uv[k];
        k--;
    }
    return ret;
};

coord.grid = function grid(n,shape) {
    if(typeof n === "number") n = [n,n];
    var ret = numeric.rep(n,-1);
    var i,j,count;
    if(typeof shape !== "function") {
        switch(shape) {
        case 'L':
            shape = function(i,j) { return (i>=n[0]/2 || j<n[1]/2); }
            break;
        default:
            shape = function(i,j) { return true; };
            break;
        }
    }
    count=0;
    for(i=1;i<n[0]-1;i++) for(j=1;j<n[1]-1;j++) 
        if(shape(i,j)) {
            ret[i][j] = count;
            count++;
        }
    return ret;
}

coord.delsq = function delsq(g) {
    var dir = [[-1,0],[0,-1],[0,1],[1,0]];
    var s = numeric.dim(g), m = s[0], n = s[1], i,j,k,p,q;
    var Li = [], Lj = [], Lv = [];
    for(i=1;i<m-1;i++) for(j=1;j<n-1;j++) {
        if(g[i][j]<0) continue;
        for(k=0;k<4;k++) {
            p = i+dir[k][0];
            q = j+dir[k][1];
            if(g[p][q]<0) continue;
            Li.push(g[i][j]);
            Lj.push(g[p][q]);
            Lv.push(-1);
        }
        Li.push(g[i][j]);
        Lj.push(g[i][j]);
        Lv.push(4);
    }
    return [Li,Lj,Lv];
}

coord.dotMV = function dotMV(A,x) {
    var ret, Ai = A[0], Aj = A[1], Av = A[2],k,p=Ai.length,N;
    N=0;
    for(k=0;k<p;k++) { if(Ai[k]>N) N = Ai[k]; }
    N++;
    ret = numeric.rep([N],0);
    for(k=0;k<p;k++) { ret[Ai[k]]+=Av[k]*x[Aj[k]]; }
    return ret;
}
