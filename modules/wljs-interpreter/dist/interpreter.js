// DEFLATE is a complex format; to read this code, you should probably check the RFC first:
// https://tools.ietf.org/html/rfc1951
// You may also wish to take a look at the guide I made about this program:
// https://gist.github.com/101arrowz/253f31eb5abc3d9275ab943003ffecad
// Some of the following code is similar to that of UZIP.js:
// https://github.com/photopea/UZIP.js
// However, the vast majority of the codebase has diverged from UZIP.js to increase performance and reduce bundle size.
// Sometimes 0 will appear where -1 would be more appropriate. This is because using a uint
// is better for memory in most engines (I *think*).

// aliases for shorter compressed code (most minifers don't do this)
var u8 = Uint8Array, u16 = Uint16Array, i32 = Int32Array;
// fixed length extra bits
var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
// fixed distance extra bits
var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
// code length index map
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
// get base, reverse index map from extra bits
var freb = function (eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
        b[i] = start += 1 << eb[i - 1];
    }
    // numbers here are at max 18 bits
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
        for (var j = b[i]; j < b[i + 1]; ++j) {
            r[j] = ((j - b[i]) << 5) | i;
        }
    }
    return { b: b, r: r };
};
var _a = freb(fleb, 2), fl = _a.b, revfl = _a.r;
// we can ignore the fact that the other numbers are wrong; they never happen anyway
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b.b, revfd = _b.r;
// map of value to reverse (assuming 16 bits)
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
    // reverse table algorithm from SO
    var x = ((i & 0xAAAA) >> 1) | ((i & 0x5555) << 1);
    x = ((x & 0xCCCC) >> 2) | ((x & 0x3333) << 2);
    x = ((x & 0xF0F0) >> 4) | ((x & 0x0F0F) << 4);
    rev[i] = (((x & 0xFF00) >> 8) | ((x & 0x00FF) << 8)) >> 1;
}
// create huffman tree from u8 "map": index -> code length for code index
// mb (max bits) must be at most 15
// TODO: optimize/split up?
var hMap = (function (cd, mb, r) {
    var s = cd.length;
    // index
    var i = 0;
    // u16 "map": index -> # of codes with bit length = index
    var l = new u16(mb);
    // length of cd must be 288 (total # of codes)
    for (; i < s; ++i) {
        if (cd[i])
            ++l[cd[i] - 1];
    }
    // u16 "map": index -> minimum code for bit length = index
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
        le[i] = (le[i - 1] + l[i - 1]) << 1;
    }
    var co;
    if (r) {
        // u16 "map": index -> number of actual bits, symbol for code
        co = new u16(1 << mb);
        // bits to remove for reverser
        var rvb = 15 - mb;
        for (i = 0; i < s; ++i) {
            // ignore 0 lengths
            if (cd[i]) {
                // num encoding both symbol and bits read
                var sv = (i << 4) | cd[i];
                // free bits
                var r_1 = mb - cd[i];
                // start value
                var v = le[cd[i] - 1]++ << r_1;
                // m is end value
                for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
                    // every 16 bit value starting with the code yields the same result
                    co[rev[v] >> rvb] = sv;
                }
            }
        }
    }
    else {
        co = new u16(s);
        for (i = 0; i < s; ++i) {
            if (cd[i]) {
                co[i] = rev[le[cd[i] - 1]++] >> (15 - cd[i]);
            }
        }
    }
    return co;
});
// fixed length tree
var flt = new u8(288);
for (var i = 0; i < 144; ++i)
    flt[i] = 8;
for (var i = 144; i < 256; ++i)
    flt[i] = 9;
for (var i = 256; i < 280; ++i)
    flt[i] = 7;
for (var i = 280; i < 288; ++i)
    flt[i] = 8;
// fixed distance tree
var fdt = new u8(32);
for (var i = 0; i < 32; ++i)
    fdt[i] = 5;
// fixed length map
var flm = /*#__PURE__*/ hMap(flt, 9, 0), flrm = /*#__PURE__*/ hMap(flt, 9, 1);
// fixed distance map
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0), fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
// find max of array
var max = function (a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
        if (a[i] > m)
            m = a[i];
    }
    return m;
};
// read d, starting at bit p and mask with m
var bits = function (d, p, m) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
};
// read d, starting at bit p continuing for at least 16 bits
var bits16 = function (d, p) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
};
// get end of byte
var shft = function (p) { return ((p + 7) / 8) | 0; };
// typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice
var slc = function (v, s, e) {
    if (s == null || s < 0)
        s = 0;
    if (e == null || e > v.length)
        e = v.length;
    // can't use .constructor in case user-supplied
    return new u8(v.subarray(s, e));
};
// error codes
var ec = [
    'unexpected EOF',
    'invalid block type',
    'invalid length/literal',
    'invalid distance',
    'stream finished',
    'no stream handler',
    , // determined by compression function
    'no callback',
    'invalid UTF-8 data',
    'extra field too long',
    'date not in range 1980-2099',
    'filename too long',
    'stream finishing',
    'invalid zip data'
    // determined by unknown compression method
];
var err = function (ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
        Error.captureStackTrace(e, err);
    if (!nt)
        throw e;
    return e;
};
// expands raw DEFLATE data
var inflt = function (dat, st, buf, dict) {
    // source length       dict length
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
        return buf || new u8(0);
    var noBuf = !buf;
    // have to estimate size
    var resize = noBuf || st.i != 2;
    // no state
    var noSt = st.i;
    // Assumes roughly 33% compression ratio average
    if (noBuf)
        buf = new u8(sl * 3);
    // ensure buffer can fit at least l elements
    var cbuf = function (l) {
        var bl = buf.length;
        // need to increase size to fit
        if (l > bl) {
            // Double or set to necessary, whichever is greater
            var nbuf = new u8(Math.max(bl * 2, l));
            nbuf.set(buf);
            buf = nbuf;
        }
    };
    //  last chunk         bitpos           bytes
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    // total bits
    var tbts = sl * 8;
    do {
        if (!lm) {
            // BFINAL - this is only 1 when last chunk is next
            final = bits(dat, pos, 1);
            // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
            var type = bits(dat, pos + 1, 3);
            pos += 3;
            if (!type) {
                // go to end of byte boundary
                var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
                if (t > sl) {
                    if (noSt)
                        err(0);
                    break;
                }
                // ensure size
                if (resize)
                    cbuf(bt + l);
                // Copy over uncompressed data
                buf.set(dat.subarray(s, t), bt);
                // Get new bitpos, update byte count
                st.b = bt += l, st.p = pos = t * 8, st.f = final;
                continue;
            }
            else if (type == 1)
                lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
            else if (type == 2) {
                //  literal                            lengths
                var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
                var tl = hLit + bits(dat, pos + 5, 31) + 1;
                pos += 14;
                // length+distance tree
                var ldt = new u8(tl);
                // code length tree
                var clt = new u8(19);
                for (var i = 0; i < hcLen; ++i) {
                    // use index map to get real code
                    clt[clim[i]] = bits(dat, pos + i * 3, 7);
                }
                pos += hcLen * 3;
                // code lengths bits
                var clb = max(clt), clbmsk = (1 << clb) - 1;
                // code lengths map
                var clm = hMap(clt, clb, 1);
                for (var i = 0; i < tl;) {
                    var r = clm[bits(dat, pos, clbmsk)];
                    // bits read
                    pos += r & 15;
                    // symbol
                    var s = r >> 4;
                    // code length to copy
                    if (s < 16) {
                        ldt[i++] = s;
                    }
                    else {
                        //  copy   count
                        var c = 0, n = 0;
                        if (s == 16)
                            n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
                        else if (s == 17)
                            n = 3 + bits(dat, pos, 7), pos += 3;
                        else if (s == 18)
                            n = 11 + bits(dat, pos, 127), pos += 7;
                        while (n--)
                            ldt[i++] = c;
                    }
                }
                //    length tree                 distance tree
                var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
                // max length bits
                lbt = max(lt);
                // max dist bits
                dbt = max(dt);
                lm = hMap(lt, lbt, 1);
                dm = hMap(dt, dbt, 1);
            }
            else
                err(1);
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
        }
        // Make sure the buffer can hold this + the largest possible addition
        // Maximum chunk size (practically, theoretically infinite) is 2^17
        if (resize)
            cbuf(bt + 131072);
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (;; lpos = pos) {
            // bits read, code
            var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
            pos += c & 15;
            if (pos > tbts) {
                if (noSt)
                    err(0);
                break;
            }
            if (!c)
                err(2);
            if (sym < 256)
                buf[bt++] = sym;
            else if (sym == 256) {
                lpos = pos, lm = null;
                break;
            }
            else {
                var add = sym - 254;
                // no extra bits needed if less
                if (sym > 264) {
                    // index
                    var i = sym - 257, b = fleb[i];
                    add = bits(dat, pos, (1 << b) - 1) + fl[i];
                    pos += b;
                }
                // dist
                var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
                if (!d)
                    err(3);
                pos += d & 15;
                var dt = fd[dsym];
                if (dsym > 3) {
                    var b = fdeb[dsym];
                    dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
                }
                if (pos > tbts) {
                    if (noSt)
                        err(0);
                    break;
                }
                if (resize)
                    cbuf(bt + 131072);
                var end = bt + add;
                if (bt < dt) {
                    var shift = dl - dt, dend = Math.min(dt, end);
                    if (shift + bt < 0)
                        err(3);
                    for (; bt < dend; ++bt)
                        buf[bt] = dict[shift + bt];
                }
                for (; bt < end; ++bt)
                    buf[bt] = buf[bt - dt];
            }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
            final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    // don't reallocate for streams or user buffers
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
// starting at p, write the minimum number of bits that can hold v to d
var wbits = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
};
// starting at p, write the minimum number of bits (>8) that can hold v to d
var wbits16 = function (d, p, v) {
    v <<= p & 7;
    var o = (p / 8) | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
};
// creates code lengths from a frequency table
var hTree = function (d, mb) {
    // Need extra info to make a tree
    var t = [];
    for (var i = 0; i < d.length; ++i) {
        if (d[i])
            t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
        return { t: et, l: 0 };
    if (s == 1) {
        var v = new u8(t[0].s + 1);
        v[t[0].s] = 1;
        return { t: v, l: 1 };
    }
    t.sort(function (a, b) { return a.f - b.f; });
    // after i2 reaches last ind, will be stopped
    // freq must be greater than largest possible number of symbols
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l: l, r: r };
    // efficient algorithm from UZIP.js
    // i0 is lookbehind, i2 is lookahead - after processing two low-freq
    // symbols that combined have high freq, will start processing i2 (high-freq,
    // non-composite) symbols instead
    // see https://reddit.com/r/photopea/comments/ikekht/uzipjs_questions/
    while (i1 != s - 1) {
        l = t[t[i0].f < t[i2].f ? i0++ : i2++];
        r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
        t[i1++] = { s: -1, f: l.f + r.f, l: l, r: r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
        if (t2[i].s > maxSym)
            maxSym = t2[i].s;
    }
    // code lengths
    var tr = new u16(maxSym + 1);
    // max bits in tree
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
        // more algorithms from UZIP.js
        // TODO: find out how this code works (debt)
        //  ind    debt
        var i = 0, dt = 0;
        //    left            cost
        var lft = mbt - mb, cst = 1 << lft;
        t2.sort(function (a, b) { return tr[b.s] - tr[a.s] || a.f - b.f; });
        for (; i < s; ++i) {
            var i2_1 = t2[i].s;
            if (tr[i2_1] > mb) {
                dt += cst - (1 << (mbt - tr[i2_1]));
                tr[i2_1] = mb;
            }
            else
                break;
        }
        dt >>= lft;
        while (dt > 0) {
            var i2_2 = t2[i].s;
            if (tr[i2_2] < mb)
                dt -= 1 << (mb - tr[i2_2]++ - 1);
            else
                ++i;
        }
        for (; i >= 0 && dt; --i) {
            var i2_3 = t2[i].s;
            if (tr[i2_3] == mb) {
                --tr[i2_3];
                ++dt;
            }
        }
        mbt = mb;
    }
    return { t: new u8(tr), l: mbt };
};
// get the max length and assign length codes
var ln = function (n, l, d) {
    return n.s == -1
        ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1))
        : (l[n.s] = d);
};
// length codes generation
var lc = function (c) {
    var s = c.length;
    // Note that the semicolon was intentional
    while (s && !c[--s])
        ;
    var cl = new u16(++s);
    //  ind      num         streak
    var cli = 0, cln = c[0], cls = 1;
    var w = function (v) { cl[cli++] = v; };
    for (var i = 1; i <= s; ++i) {
        if (c[i] == cln && i != s)
            ++cls;
        else {
            if (!cln && cls > 2) {
                for (; cls > 138; cls -= 138)
                    w(32754);
                if (cls > 2) {
                    w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
                    cls = 0;
                }
            }
            else if (cls > 3) {
                w(cln), --cls;
                for (; cls > 6; cls -= 6)
                    w(8304);
                if (cls > 2)
                    w(((cls - 3) << 5) | 8208), cls = 0;
            }
            while (cls--)
                w(cln);
            cls = 1;
            cln = c[i];
        }
    }
    return { c: cl.subarray(0, cli), n: s };
};
// calculate the length of output from tree, code lengths
var clen = function (cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
        l += cf[i] * cl[i];
    return l;
};
// writes a fixed block
// returns the new bit pos
var wfblk = function (out, pos, dat) {
    // no need to write 00 as type: TypedArray defaults to 0
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
        out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
};
// writes a block
var wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a = hTree(lf, 15), dlt = _a.t, mlb = _a.l;
    var _b = hTree(df, 15), ddt = _b.t, mdb = _b.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
        ++lcfreq[lclt[i] & 31];
    for (var i = 0; i < lcdt.length; ++i)
        ++lcfreq[lcdt[i] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
        ;
    var flen = (bl + 5) << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
        return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
        lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
        var llm = hMap(lct, mlcb, 0);
        wbits(out, p, nlc - 257);
        wbits(out, p + 5, ndc - 1);
        wbits(out, p + 10, nlcc - 4);
        p += 14;
        for (var i = 0; i < nlcc; ++i)
            wbits(out, p + 3 * i, lct[clim[i]]);
        p += 3 * nlcc;
        var lcts = [lclt, lcdt];
        for (var it = 0; it < 2; ++it) {
            var clct = lcts[it];
            for (var i = 0; i < clct.length; ++i) {
                var len = clct[i] & 31;
                wbits(out, p, llm[len]), p += lct[len];
                if (len > 15)
                    wbits(out, p, (clct[i] >> 5) & 127), p += clct[i] >> 12;
            }
        }
    }
    else {
        lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
        var sym = syms[i];
        if (sym > 255) {
            var len = (sym >> 18) & 31;
            wbits16(out, p, lm[len + 257]), p += ll[len + 257];
            if (len > 7)
                wbits(out, p, (sym >> 23) & 31), p += fleb[len];
            var dst = sym & 31;
            wbits16(out, p, dm[dst]), p += dl[dst];
            if (dst > 3)
                wbits16(out, p, (sym >> 5) & 8191), p += fdeb[dst];
        }
        else {
            wbits16(out, p, lm[sym]), p += ll[sym];
        }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
};
// deflate options (nice << 13) | chain
var deo = /*#__PURE__*/ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
// empty
var et = /*#__PURE__*/ new u8(0);
// compresses data into a raw DEFLATE buffer
var dflt = function (dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
    // writing to this writes to the output buffer
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
        if (pos)
            w[0] = st.r >> 3;
        var opt = deo[lvl - 1];
        var n = opt >> 13, c = opt & 8191;
        var msk_1 = (1 << plvl) - 1;
        //    prev 2-byte val map    curr 2-byte val map
        var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
        var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
        var hsh = function (i) { return (dat[i] ^ (dat[i + 1] << bs1_1) ^ (dat[i + 2] << bs2_1)) & msk_1; };
        // 24576 is an arbitrary number of maximum symbols per block
        // 424 buffer for last block
        var syms = new i32(25000);
        // length/literal freq   distance freq
        var lf = new u16(288), df = new u16(32);
        //  l/lcnt  exbits  index          l/lind  waitdx          blkpos
        var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
        for (; i + 2 < s; ++i) {
            // hash value
            var hv = hsh(i);
            // index mod 32768    previous index mod
            var imod = i & 32767, pimod = head[hv];
            prev[imod] = pimod;
            head[hv] = imod;
            // We always should modify head and prev, but only add symbols if
            // this data is not yet processed ("wait" for wait index)
            if (wi <= i) {
                // bytes remaining
                var rem = s - i;
                if ((lc_1 > 7000 || li > 24576) && (rem > 423 || !lst)) {
                    pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
                    li = lc_1 = eb = 0, bs = i;
                    for (var j = 0; j < 286; ++j)
                        lf[j] = 0;
                    for (var j = 0; j < 30; ++j)
                        df[j] = 0;
                }
                //  len    dist   chain
                var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
                if (rem > 2 && hv == hsh(i - dif)) {
                    var maxn = Math.min(n, rem) - 1;
                    var maxd = Math.min(32767, i);
                    // max possible length
                    // not capped at dif because decompressors implement "rolling" index population
                    var ml = Math.min(258, rem);
                    while (dif <= maxd && --ch_1 && imod != pimod) {
                        if (dat[i + l] == dat[i + l - dif]) {
                            var nl = 0;
                            for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                                ;
                            if (nl > l) {
                                l = nl, d = dif;
                                // break out early when we reach "nice" (we are satisfied enough)
                                if (nl > maxn)
                                    break;
                                // now, find the rarest 2-byte sequence within this
                                // length of literals and search for that instead.
                                // Much faster than just using the start
                                var mmd = Math.min(dif, nl - 2);
                                var md = 0;
                                for (var j = 0; j < mmd; ++j) {
                                    var ti = i - dif + j & 32767;
                                    var pti = prev[ti];
                                    var cd = ti - pti & 32767;
                                    if (cd > md)
                                        md = cd, pimod = ti;
                                }
                            }
                        }
                        // check the previous match
                        imod = pimod, pimod = prev[imod];
                        dif += imod - pimod & 32767;
                    }
                }
                // d will be nonzero only when a match was found
                if (d) {
                    // store both dist and len data in one int32
                    // Make sure this is recognized as a len/dist with 28th bit (2^28)
                    syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
                    var lin = revfl[l] & 31, din = revfd[d] & 31;
                    eb += fleb[lin] + fdeb[din];
                    ++lf[257 + lin];
                    ++df[din];
                    wi = i + l;
                    ++lc_1;
                }
                else {
                    syms[li++] = dat[i];
                    ++lf[dat[i]];
                }
            }
        }
        for (i = Math.max(i, wi); i < s; ++i) {
            syms[li++] = dat[i];
            ++lf[dat[i]];
        }
        pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
        if (!lst) {
            st.r = (pos & 7) | w[(pos / 8) | 0] << 3;
            // shft(pos) now 1 less if pos & 7 != 0
            pos -= 7;
            st.h = head, st.p = prev, st.i = i, st.w = wi;
        }
    }
    else {
        for (var i = st.w || 0; i < s + lst; i += 65535) {
            // end
            var e = i + 65535;
            if (e >= s) {
                // write final block
                w[(pos / 8) | 0] = lst;
                e = s;
            }
            pos = wfblk(w, pos + 1, dat.subarray(i, e));
        }
        st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
};
// Adler32
var adler = function () {
    var a = 1, b = 0;
    return {
        p: function (d) {
            // closures have awful performance
            var n = a, m = b;
            var l = d.length | 0;
            for (var i = 0; i != l;) {
                var e = Math.min(i + 2655, l);
                for (; i < e; ++i)
                    m += n += d[i];
                n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
            }
            a = n, b = m;
        },
        d: function () {
            a %= 65521, b %= 65521;
            return (a & 255) << 24 | (a & 0xFF00) << 8 | (b & 255) << 8 | (b >> 8);
        }
    };
};
// deflate with opts
var dopt = function (dat, opt, pre, post, st) {
    if (!st) {
        st = { l: 1 };
        if (opt.dictionary) {
            var dict = opt.dictionary.subarray(-32768);
            var newDat = new u8(dict.length + dat.length);
            newDat.set(dict);
            newDat.set(dat, dict.length);
            dat = newDat;
            st.w = dict.length;
        }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? (st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20) : (12 + opt.mem), pre, post, st);
};
// write bytes
var wbytes = function (d, b, v) {
    for (; v; ++b)
        d[b] = v, v >>>= 8;
};
// zlib header
var zlh = function (c, o) {
    var lv = o.level, fl = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
    c[0] = 120, c[1] = (fl << 6) | (o.dictionary && 32);
    c[1] |= 31 - ((c[0] << 8) | c[1]) % 31;
    if (o.dictionary) {
        var h = adler();
        h.p(o.dictionary);
        wbytes(c, 2, h.d());
    }
};
// zlib start
var zls = function (d, dict) {
    if ((d[0] & 15) != 8 || (d[0] >> 4) > 7 || ((d[0] << 8 | d[1]) % 31))
        err(6, 'invalid zlib data');
    if ((d[1] >> 5 & 1) == +!dict)
        err(6, 'invalid zlib data: ' + (d[1] & 32 ? 'need' : 'unexpected') + ' dictionary');
    return (d[1] >> 3 & 4) + 2;
};
/**
 * Compress data with Zlib
 * @param data The data to compress
 * @param opts The compression options
 * @returns The zlib-compressed version of the data
 */
function zlibSync(data, opts) {
    if (!opts)
        opts = {};
    var a = adler();
    a.p(data);
    var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
    return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
function unzlibSync(data, opts) {
    return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
// text decoder
var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
// text decoder stream
var tds = 0;
try {
    td.decode(et, { stream: true });
    tds = 1;
}
catch (e) { }

const aflatten = (ary) => ary.flat(Infinity);


class Deferred {
  promise = {}
  reject = {}
  resolve = {}          

  constructor() {
    this.promise = new Promise((resolve, reject)=> {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}  

const chunkArray = (arr, size) => {
  if (size <= 0) throw new Error("Size must be greater than zero.");
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

class NumericArrayObject {
  dims;
  buffer;

  constructor(buffer, dims) {
    this.buffer = buffer;
    this.dims = dims;

    return this;
  }

  toJSON() {
    return this.normal()
  }

  normal() {
    let chunked = Array.from(this.buffer);
    
    for (let i = this.dims.length-1; i>0; --i) {
      chunked = chunkArray(chunked, this.dims[i]);
    }   
    
    return chunked;
  }

  static Q(obj) {
    return (obj instanceof NumericArrayObject)
  }
}

window.NumericArrayObject = NumericArrayObject;

class Complex {
  constructor(re, im) {
      this.re = re;
      this.im = im;
  }

  static isComplex(obj) {
    return (obj instanceof Complex)
  }

  add(complex) {
      return new Complex(this.re + complex.re, this.im + complex.im);
  }

  subtract(complex) {
      return new Complex(this.re - complex.re, this.im - complex.im);
  }

  multiply(complex) {
      const re = this.re * complex.re - this.im * complex.im;
      const im = this.re * complex.im + this.im * complex.re;
      return new Complex(re, im);
  }

  divide(complex) {
      const denominator = complex.re ** 2 + complex.im ** 2;
      const re = (this.re * complex.re + this.im * complex.im) / denominator;
      const im = (this.im * complex.re - this.re * complex.im) / denominator;
      return new Complex(re, im);
  }
}

function isNumeric(value) {
  return /^-?\d+$/.test(value);
}

const WLNumber = new RegExp(/^(-?\d+)(.?\d*)(\*\^)?(\d*)/);

window.Complex = Complex;
window.Deferred = Deferred;
window.aflatten = aflatten;

window.isNumeric = isNumeric;

var interpretate = (d, env = {}) => {        

  if (typeof d === 'undefined') {
    console.log('undefined object');
    return d;
  }

  const stringQ = typeof d === 'string';
  //console.log(d);
  //console.log(stringQ);
  //real string
  if (stringQ) {
    if (d.charAt(0) == "'") return d.slice(1, -1);
    if (isNumeric(d)) return parseInt(d); //for Integers
  
    if (WLNumber.test(d)) {

      //deconstruct the string
      let [begin, floatString, digits, man, power] = d.split(WLNumber);
    
      if (digits === '.')
        floatString += digits + '0';
      else
        floatString += digits;
    
      if (man)
        floatString += 'E' + power;


    
      return parseFloat(floatString);
    }

    //in safe mode just convert unknown symbols into a string
    //if (!env.unsafe) return d;
    //if not. it means this is a symbol
  }
  if (typeof d === 'number') {
    return d; 
  }

  //console.log('type '+String(typeof d)+' of '+JSON.stringify(d));

  //if not a JSON array, probably a promise object or a function
  if (!(d instanceof Array) && !stringQ) return d;


  //console.log(env);


  //reading the structure of Wolfram ExpressionJSON
  let name;
  let args;

  if (stringQ) {
    //symbol
    name = d;
    args = undefined;
  } else {
    //subvalue
    name = d[0];
    args = d.slice(1, d.length);
  }

  //console.log("interpreting...");
  //console.log(name);
  //console.log(name);

  //checking the scope
  if ('scope' in env) 
    if (name in env.scope) 
      return env.scope[name](args, env);



  //checking the context
  if ('context' in env) {
    if (Array.isArray(env.context)) {
      //go one by one
      for (let cc=0; cc<env.context.length; ++cc) {
        if (!(name in env.context[cc])) continue;
        
        if (env['method']) {
          if (!env.context[cc][name][env.method]) return console.error('method '+env['method']+' is not defined for '+name);
          return env.context[cc][name][env.method](args, env);
        }
  
        //fake frontendexecutable
        //to bring local vars and etc
        if ('virtual' in env.context[cc][name] && !(env.novirtual)) {
          const obj = new ExecutableObject('virtual-'+uuidv4(), env, d);
          let virtualenv = obj.assignScope();
          //console.log('virtual env');
          obj.firstName = name;
          //console.log(virtualenv);
          return env.context[cc][name](args, virtualenv);    
        }
  
        return env.context[cc][name](args, env);        
      }

    } else if (name in env.context) {
      //checking the method
      if (env['method']) {
        if (!env.context[name][env.method]) return console.error('method '+env['method']+' is not defined for '+name);
        return env.context[name][env.method](args, env);
      }

      //fake frontendexecutable
      //to bring local vars and etc
      if ('virtual' in env.context[name] && !(env.novirtual)) {
        const obj = new ExecutableObject('virtual-'+uuidv4(), env, d);
        let virtualenv = obj.assignScope();
        //console.log('virtual env');
        obj.firstName = name;
        //console.log(virtualenv);
        return env.context[name](args, virtualenv);    
      }

      return env.context[name](args, env);
    }
  }

  //just go over all contextes defined to find the symbol
  const c = interpretate.contextes;

  for (let i = 0; i < c.length; ++i) {
    if (name in c[i]) {
      //console.log('symbol '+name+' was found in '+c[i].name);

      if (env['method']) {
        if (!c[i][name][env.method]) return console.error('method '+env['method']+' is not defined for '+name);
        return c[i][name][env.method](args, env);
      }

      //fake frontendexecutable
      //to bring local vars and etc
      if ('virtual' in c[i][name] && !(env.novirtual)) {
        const obj = new ExecutableObject('virtual-'+uuidv4(), env, d);
        let virtualenv = obj.assignScope();
        //console.log('virtual env');

        obj.firstName = name;
        //console.log(virtualenv);        
        return c[i][name](args, virtualenv);    
      }     

      return c[i][name](args, env);    
    }
  }
  return (interpretate.anonymous(d, env));          
};

const hashCode2 = function (s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
};

// Small helper to mix two 32-bit ints
const mix = (acc, value) => {
  // a tiny avalanche-ish mixer
  acc = (acc ^ value) | 0;
  acc = Math.imul(acc, 0x45d9f3b) | 0;
  acc = (acc ^ (acc >>> 16)) | 0;
  return acc;
};

interpretate.hashv2 = (d) => {
  if (typeof d === 'undefined') {
    console.log('undefined object');
    return hashCode2('undefined');
  }

  const stringQ = typeof d === 'string';

  // real string
  if (stringQ) {
    if (d.charAt(0) == "'") return hashCode2(d.slice(1, -1));
    if (isNumeric(d)) return hashCode2(String(parseInt(d))); // for Integers

    if (WLNumber.test(d)) {
      let [begin, floatString, digits, man, power] = d.split(WLNumber);

      if (digits === '.')
        floatString += digits + '0';
      else
        floatString += digits;

      if (man)
        floatString += 'E' + power;

      return hashCode2(String(parseFloat(floatString)));
    }

    // symbol or normal string
    return hashCode2(d);
  }

  if (typeof d === 'number') {
    return hashCode2(String(d));
  }

  if (typeof d === 'boolean') {
    return d ? hashCode2('true') : hashCode2('false');
  }

  if (d === null) {
    return hashCode2('null');
  }

  // if not a JSON array, probably a promise object or a function
  if (!(d instanceof Array)) return hashCode2(String(d));

  // Array hashing (order-sensitive + tagged)
  // Start with a tag + length to reduce structural collisions
  let h = mix(hashCode2('Array'), d.length | 0);

  for (let i = 0; i < d.length; i++) {
    const eh = interpretate.hashv2(d[i]);
    // incorporate index so equal elements in different positions differ
    h = mix(h, (Math.imul(31, eh) + i) | 0);
  }

  return h | 0;
};


const hashCode = function(s) {
  return s.split("").reduce(function(a, b) {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
};

interpretate.hash = (d) => {
  if (typeof d === 'undefined') {
    console.log('undefined object');
    return hashCode('undefined');
  }

  const stringQ = typeof d === 'string';

  //real string
  if (stringQ) {
    if (d.charAt(0) == "'") return hashCode(d.slice(1, -1));
    if (isNumeric(d)) return hashCode(String(parseInt(d))); //for Integers
  
    if (WLNumber.test(d)) {
      
      //deconstruct the string
      let [begin, floatString, digits, man, power] = d.split(WLNumber);
    
      if (digits === '.')
        floatString += digits + '0';
      else
        floatString += digits;
    
      if (man)
        floatString += 'E' + power;


    
      return hashCode(String(parseFloat(floatString)));
    }
  }
  if (typeof d === 'number') {
    return hashCode(String(d)); 
  }

  //console.log('type '+String(typeof d)+' of '+JSON.stringify(d));

  //if not a JSON array, probably a promise object or a function
  if (!(d instanceof Array) && !stringQ) return hashCode(String(d));


  //console.log(env);


  //reading the structure of Wolfram ExpressionJSON

  if (stringQ) {
    //symbol
    return hashCode(d);
  } else {
    //subvalue
    return d.map((e) => interpretate.hash(e)).reduce((accumulator, currentValue) => {
  return accumulator + currentValue
},0);
  }
};

interpretate.cnt = 0;

//contexes, so symbols names might be duplicated, therefore one can specify the propority context in env variable
interpretate.contextes = [];
//add new context
interpretate.contextExpand = (context) => {
  console.log(context.name + ' was added to the contextes of the interpreter');
  interpretate.contextes.push(context);
};

//shared libraries
interpretate.shared = {};
interpretate.shared = class {
  constructor (key, loader) {
    this.key = key;
    const self = this;

    self.load = async () => {
      await loader(self);
      self.load = async () => {console.log('Already loaded!');};
    };

    interpretate.shared[key] = this;
  }
};

interpretate.handleMessage = (event) => {
  const uid = Math.floor(Math.random() * 100);
  const global = {call: uid};
  interpretate(JSON.parse(event.data), {global: global});
};

interpretate.unzlibSync = (args) => unzlibSync(args);
interpretate.unzlib64String = async (input) => {
    const decoded = atob(input);
    return new TextDecoder().decode(unzlibSync(Uint8Array.from(decoded, c => c.charCodeAt(0))));
};


interpretate.zlib64String = async (input) => {
    const encoded = zlibSync(new TextEncoder().encode(input));

    // Convert Uint8Array to binary string without exceeding stack
    let binary = '';
    for (let i = 0; i < encoded.length; i++) {
        binary += String.fromCharCode(encoded[i]);
    }

    return btoa(binary);
};


interpretate.anonymous = async (d, org) => {
  throw('Unknown symbol '+ JSON.stringify(d));
};


var InstancesHashMap = {};

window.InstancesHashMap = InstancesHashMap;



//instance of FrontEndExecutable object
class ExecutableObject {
  env = {}          

  //uid (not unique) (global)
  uid = ''
  //uid (unique) (internal)
  instance = ''    
  
  _proxies = new Set()

  dead = false
  virtual = false

  //local scope
  local = {}

  assignScope() {
    this.env.local = this.local;
    return this.env;
  }

  //run the code inside
  /*async execute() {
    console.log('executing manually '+this.uid+'....');
    //console.log(this.virtual);
    return interpretate(this.virtual, this.env);
  }*/

  async execute(props) {
    //console.log('executing manually '+this.uid+'....');
    //console.log(this.virtual);
    if (!props)
      return interpretate(this.virtual, this.env);
    else  
      return interpretate(this.virtual, {...this.env, ...props});
  }  

  //dispose the object 
  //direction: NONE
  dispose() {
    if (this.dead) return;
    this.dead = true;

   // console.log('DESTORY: ' + this.uid);
    if (this.static) {
      delete InstancesHashMap[this.instance];
      return;
    }
    //change the mathod of interpreting
    this.env.method = 'destroy';

    //if (this.virtual) console.log('virtual type was disposed'); else console.log('normal container was destoryed');

    //unregister from the storage class
    //if (!this.virtual) this.storage.dropref(this);

    //no need of this since we can destory them unsing env.global.stack
    let content = this.virtual;
    //if (!this.virtual) content = this.storage.get(this.uid); else content = this.virtual;

    //pass local scope
    this.env.local = this.local;    
    //the link between objects will be dead automatically

    //evaluate destructor
    interpretate(content, this.env);

    delete InstancesHashMap[this.instance];
  }         

  //update the state of it and recompute all objects inside
  //direction: BOTTOM -> TOP
  update(top) {
    //console.log('updating frontend object...'+this.uid);
    //bubble up by 1
    if (this.parent instanceof ExecutableObject && !(this.child instanceof ExecutableObject)) return this.parent.update(); 

    //change the method of interpreting 
    this.env.method = 'update';
    //pass local scope
    this.env.local = this.local;
    //console.log('interprete...'+this.uid);

    let content;
    if (!this.virtual) 
      content = this.storage.get(this.uid); else content = this.virtual;

    return interpretate(content, this.env);
  }

  constructor(uid, env, virtual = false, s = false) {
    //console.log('constructing the instance of '+uid+'...');

    this.static = s; // defines if object is a static one (works as storage)
    this.uid = uid;
    this.env = {...env, exposed: env};

    this.instance = uuidv4();

    this.env.element = this.env.element || 'body';
    //global scope
    //making a stack-call only for executable objects
    this.env.global.stack = this.env.global.stack || {};
    this.env.global.stack[uid] = this;

    this.env.root = this.env.root || {};

    //middleware handler (identity)
    this.local.middleware = (a) => a;

    //for virtual functions
    if (virtual) {
      //console.log('virtual object detected!');
      //console.log('local storage is enabled');
      //console.log(virtual);
      this.virtual = virtual;
    } else {
      if (uid in ObjectHashMap) this.storage = ObjectHashMap[uid]; else this.storage = new ObjectStorage(uid);
      this.storage.assign(this);
    }

    //if the root one is an executable & it is allowed to have non static
    if (this.env.root instanceof ExecutableObject && !this.env.static) {
      //connecting together
      //console.log('connection between two: '+this.env.root.uid + ' and a link to '+this.uid);
      if (!this.env.root.static) { //reject static one
        const root = this.env.root;

        if (typeof virtual == "string") { //most probably a proxy or dynamic symbol
          if (!(root._proxies.has(virtual))) {
            root._proxies.add(virtual);
            this.parent = this.env.root;
            this.env.root.child = this; 
          }          
        } else {
          this.parent = this.env.root;
          this.env.root.child = this; 
        }
      }
    }

    this.env.root = this;

    InstancesHashMap[this.instance] = this;

    //global hook-functions
    if (this.env.global.hooks) {
      const obj = this;
      this.env.global.hooks.forEach((hook) => {
        hook(obj);
      });
    }

    return this;
  }           
}
window.ExecutableObject = ExecutableObject;



function uuidv4() { 
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

window.uuidv4 = uuidv4;

function downloadByURL(url, name) {
  var link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', name);
  link.click();
  link.remove();
}

window.downloadByURL = downloadByURL;

var setInnerHTML = function(elm, html) {
  elm.innerHTML = html;
  Array.from(elm.querySelectorAll("script")).forEach( oldScript => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes)
      .forEach( attr => newScript.setAttribute(attr.name, attr.value) );
    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
  
  return elm;         
};

var setInnerHTMLAsync = async function(elm, html) {
  elm.innerHTML = html;
  Array.from(elm.querySelectorAll("script")).forEach( oldScript => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes)
      .forEach( attr => newScript.setAttribute(attr.name, attr.value) );
    if (!newScript.src && newScript.type == 'module') {
      newScript.removeAttribute('type');
      newScript.appendChild(document.createTextNode('{\n'+oldScript.innerHTML+'\n}'));
    } else {
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    }
    
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
  
  return elm;         
};

window.setInnerHTML = setInnerHTML;
window.setInnerHTMLAsync = setInnerHTMLAsync;

function openawindow(url, target='_self') {
  const fake = document.createElement('a');
  fake.target = target;
  fake.href = url;
  fake.click();
}

window.openawindow = openawindow;

interpretate.throttle = 30;

// Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
function throttle(cb, delay = () => interpretate.throttle) {
    let shouldWait = false;
    let waitingArgs;
    const timeoutFunc = () => {
      if (waitingArgs == null) {
        shouldWait = false;
      } else {
        cb(...waitingArgs);
        waitingArgs = null;
        setTimeout(timeoutFunc, delay());
      }
    };         

    return (...args) => {
      if (shouldWait) {
        waitingArgs = args;
        return
      }         

      cb(...args);
      shouldWait = true;
      setTimeout(timeoutFunc, delay());
    }
}

interpretate.alert = (msg) => {
  if (!window.electronAPI) {
    alert(msg);
    return;
  }
  electronAPI.showMessageBox({type:'info', message:String(msg)}, console.log);
};

interpretate.confirm = (msg, cbk) => interpretate.confirmAsync(msg).then((r) => cbk(r == true));

interpretate.confirmAsync = async (msg) => {
  if (!window.electronAPI) return confirm(msg);
  const p = Deferred();
  electronAPI.showMessageBox({type:'question', noLink:true,message:String(msg), buttons:['Cancel', 'OK']}, (r)=>{p.resolve(r.response == 1);});
  return p.promise;
};

window.throttle = throttle;
window.interpretate = interpretate;
