// This file includes several utility functions, classes that represent
// Mathematica's core data types, a decoder for the internal "!boR" format
// and an implementation of Mathematica's Decompress[] function.

const unzlibSync = interpretate.unzlibSync;

export let Mma = {};
Mma.Util = {};
Mma.Decode = {};

// Utility functions to deal with error logging.
Mma.Messages = [];
Mma.Log = function (text) {
    Mma.Messages.push(["I", text]);
    console.log("Mma.js INFO: ", text);
}
Mma.Warn = function (text) {
    Mma.Messages.push(["W", text]);
    console.log("Mma.js WARNING: ", text);
}
Mma.Fail = function (text, val) {
    Mma.Messages.push(["E", text]);
    console.error("Mma.js ERROR: " + text + ", but got " + JSON.stringify(val));
}

// Decode a Base64-encoded string, storing it in a Uint8Array.
// Taken from https://jsperf.com/base64-to-uint8array/19
Mma.Util.Base64Decode = function (encoded) {
    var binary = atob(encoded);
    var length = binary.length >>> 0;
    var array = new Uint8Array(length);
    for (var i=0; i < length; i++)
        array[i] = binary.charCodeAt(i);
    return array;
}

// Convert a Uint8Array of character codes into a string.
// Taken from http://stackoverflow.com/questions/12710001
Mma.Util.U8ArrayToString = function (array) {
    const chunkSize = 0x8000;
    var substrings = [];
    for (var i=0; i < array.length; i += chunkSize) {
        substrings.push(String.fromCharCode.apply(
            null, array.subarray(i, i+chunkSize)));
    }
    return substrings.join("");
}

Mma.Util.UnescapeMmaUnicode = function (str) {
    return str.replace(/\\:([0-9A-Fa-f]{4})/g, function (_, hex) {
        return String.fromCodePoint(parseInt(hex, 16));
    });
}

Mma.Util.StripDefaultSymbolContext = function (name) {
    if (name.startsWith("System`") || name.startsWith("Global`"))
        return name.slice(7);
    return name;
}

// Delete a character at a specific position from a string.
Mma.Util.DeleteCharAt = function (string, pos) {
    return string.substr(0, pos) + string.substr(pos + 1);
}

// The following section includes classes for the seven core types needed to
// represent Mathematica expressions:
// - IntegerMP is a machine-precision (32-bit) integer.
// - IntegerAP is an arbitrary-precision integer stored as a string.
// - RealMP is a machine-precision (64-bit) IEEE 754 float.
// - RealAP is an arbitrary-precision real number stored as a formatted string.
// - Symbol is an atomic, immutable string-like thing.
// - String is an ASCII string with Mathematica-style escapes for Unicode.
// - Expression is a container that has a head and 0 or more other parts.

// Convenient list of type names and content locations:
// Mma.IntegerMP   .n
// Mma.IntegerAP   .nstring
// Mma.RealMP      .n
// Mma.RealAP      .nstring
// Mma.Symbol      .name
// Mma.String      .str
// Mma.Expression  .head .parts

Mma.IntegerMP = function (input) {
    if (typeof input === "number" && Number.isInteger(input))
        this.n = input;
    else if (input === undefined)
        this.n = undefined;
    else
        Mma.Fail("IntegerMP: invalid input");
}
Mma.IntegerAP = function (input) {
    if (typeof input === "string") {
        for (var i=0; i < input.length; i++)
            if (Number(input[i]) === NaN)
                Mma.Fail("IntegerAP: invalid input, contains non-digit: " +
                    String(input));
        if (input.length > 1 && input[0] === 0)
            Mma.Fail("IntegerAP: input starts with 0: " + String(input));
        this.nstring = input;
    } else if (input === undefined) {
        this.nstring = undefined;
    } else {
        Mma.Fail("Integer: invalid input: " + String(input));
    }
}
Mma.RealMP = function (input) {
    if (typeof input === "number")
        this.n = input;
    else if (input === undefined)
        this.n = undefined;
    else
        Mma.Fail("RealMP: invalid input");
}
Mma.RealAP = function (input) {
    if (typeof input === "string") {
        if (input.length > 1 && input[0] === 0)
            Mma.Fail("RealAP: input starts with 0: " + String(input));
        this.nstring = input;
    } else if (input === undefined) {
        this.nstring = undefined;
    } else {
        Mma.Fail("RealAP: invalid input: " + String(input));
    }
}
Mma.Symbol = function (name) {
    if (typeof name === "string")
        this.name = name;
    else if (name === undefined)
        this.name = undefined;
    else
        Mma.Fail("Symbol: invalid input: " + String(name));
}
Mma.String = function (str) {
    if (typeof str === "string")
        this.str = str;
    else if (str === undefined)
        this.str = undefined;
    else
        Mma.Fail("String: invalid input: " + String(str));
}
Mma.Expression = function (head, parts) {
    if (! (head instanceof Mma.Symbol) && ! (head instanceof Mma.Expression)) {
        Mma.Fail("Expression: uncovered case of subsvalues: head must be an Mma.Symbol", head);
        Mma.Warn("We will try to fix it");
    }
    if (! (parts instanceof Array)) {
        Mma.Fail("Expression: parts must be an Array");
    }
    this.head = head;
    this.parts = parts;
}

// The following section includes functions that can decode the simple binary
// encodings used by the !boR format for integers, reals and strings.

// Get the little-endian 32-bit integer value at offset.
Mma.Decode.Int32 = function (bits, offset) {
    try {
        var dataview = new DataView(bits.buffer);
        return dataview.getInt32(offset, true);
    } catch (e) {
        return 0;
    }
}

// Get the little-endian IEEE 754 binary64 float at the offset.
Mma.Decode.Float64 = function (bits, offset) {
    try {
        var dataview = new DataView(bits.buffer);
        return dataview.getFloat64(offset, true);
    } catch (e) {
        return 0;
    }
}

// Get and decode the Mathematica-escaped (?) ASCII string at offset.
Mma.Decode.String = function (bits, offset, length) {
    if (offset === undefined)
        offset = 0;
    if (length === undefined)
        length = bits.length;
    return Mma.Util.U8ArrayToString(bits.slice(offset, offset + length));
}

// Decode the string entry (length + data) at offset. Returns multiple fields.
Mma.Decode.StringEntry = function (bits, offset) {
    if (offset === undefined)
        offset = 0;
    var length = Mma.Decode.Int32(bits, offset);
    var string = Mma.Decode.String(bits, offset+4, length);
    return {
        length: length,
        string: string,
        bytesRead: length + 4,
    }
}

// The main function that reads in serialized data and outputs so-called parts.
// Can be set to read a specific number of parts (used for expressions).
// Returns the read parts as an Array and the number of bytes read.
Mma.Decode.Any = function (bits, offset, maxParts) {
    if (offset === undefined)
        offset = 0;
    if (maxParts === undefined)
        maxParts = Infinity;

    var originalOffset = offset;

    const READY = 0;
    const INTEGER_MP = 1;
    const INTEGER_AP = 2;
    const REAL_MP = 3;
    const REAL_AP = 4;
    const SYMBOL = 5;
    const STRING = 6;
    const EXPRESSION = 7;
    const REAL_MATRIX = 8;
    
    var state = READY;
    var done = false;
    var parts = [];

    while (!done && offset < bits.length && parts.length < maxParts ) {
        switch (state) {
        
        // If the state is READY, look for the next type indicator
        case READY:
            var next_type = bits[offset];
            switch (String.fromCharCode(next_type)) {
            case "i":
                state = INTEGER_MP;
                break;
            case "I":
                state = INTEGER_AP;
                break;
            case "r":
                state = REAL_MP;
                break;
            case "R":
                state = REAL_AP;
                break;
            case "s":
                state = SYMBOL;
                break;
            case "S":
                state = STRING;
                break;
            case "f":
                state = EXPRESSION;
                break;
            case "e":
                state = REAL_MATRIX;
                break;
            default:
                Mma.Warn("Decode.Any (READY): byte " + String(next_type) +
                    " (" + String.fromCharCode(next_type) + ") at offset " +
                    String(offset) + " is not a known type signature");
            }
            offset += 1;
            break;

        // Machine-precision integers: just consume the next 4 bytes and send
        // them on to Mma.Decode.Int32
        case INTEGER_MP:
            var int = Mma.Decode.Int32(bits, offset);
            parts.push(new Mma.IntegerMP(int));
            offset += 4;
            state = READY;
            break;

        // Arbitrary-precision integers are just strings.
        case INTEGER_AP:
            var se = Mma.Decode.StringEntry(bits, offset);
            parts.push(new Mma.IntegerAP(se.string));
            offset += se.bytesRead;
            state = READY;
            break;

        // Machine-precision reals: consume the next 8 bytes.
        case REAL_MP:
            var float = Mma.Decode.Float64(bits, offset);
            parts.push(new Mma.RealMP(float));
            offset += 8;
            state = READY;
            break;

        // Arbitrary-precision reals are just strings.
        case REAL_AP:
            var se = Mma.Decode.StringEntry(bits, offset);
            parts.push(new Mma.RealAP(se.string));
            offset += se.bytesRead;
            state = READY;
            break;

        // Symbols are also just strings.
        case SYMBOL:
            var se = Mma.Decode.StringEntry(bits, offset);
            var symbolName = Mma.Util.UnescapeMmaUnicode(se.string);
            parts.push(new Mma.Symbol(
                Mma.Util.StripDefaultSymbolContext(symbolName)));
            offset += se.bytesRead;
            state = READY;
            break;

        // Strings are, surprisingly, just strings.
        case STRING:
            var se = Mma.Decode.StringEntry(bits, offset);
            parts.push(new Mma.String(Mma.Util.UnescapeMmaUnicode(se.string)));
            offset += se.bytesRead;
            state = READY;
            break;

        // Expressions are where it gets interesting. They contain a head,
        // which is usually (always?) a symbol - it has a header, so we don't
        // really care - and a number of parts. The number of parts is given to
        // us in the first four bytes as an integer value.
        // Now, the expression header doesn't tell us how many *bytes* the
        // thing takes up - just how many parts it has. Which is why we'll use
        // this function recursively, specifying a maxParts argument, to read
        // them.
        case EXPRESSION:
            var exprPartCount = Mma.Decode.Int32(bits, offset);
            offset += 4;
            // Use Decode.Any to get both the head and the parts in one go.
            var exprDec = Mma.Decode.Any(bits, offset, exprPartCount + 1);
            offset += exprDec.bytesRead;
            var exprHead = exprDec.parts[0];
            var exprParts = exprDec.parts.slice(1);
            parts.push(new Mma.Expression(exprHead, exprParts));
            state = READY;
            break;

        // Real matrices have an n number (the number of dimensions), n sizes
        // and size1*size2*... elements.
        // The highest-numbered size is for the innermost lists.
        case REAL_MATRIX:
            var n = Mma.Decode.Int32(bits, offset);
            offset += 4;
            var sizes = [];
            for (var s = 0; s < n; s++) {
                sizes[s] = Mma.Decode.Int32(bits, offset);
                offset += 4;
            }
            // We'll use a recursive function for this one.
            // Start at the highest level (n-1) and go down to 0.
            var ParseMatrixAtLevel = function (bits, offset, sizes, level) {
                var list = [];
                var originalOffset = offset;

                if (level === 0) {
                    for (var i = 0; i < sizes[sizes.length - 1]; i++) {
                        var float = Mma.Decode.Float64(bits, offset);
                        list.push(new Mma.RealMP(float));
                        offset += 8;
                    }
                } else {
                    for (var i = 0; i < sizes[sizes.length - level - 1]; i++) {
                        var p = ParseMatrixAtLevel(bits, offset, sizes,
                            level - 1);
                        offset += p.bytesRead;
                        list.push(p.expr);
                    }
                }

                return {
                    expr: new Mma.Expression(
                        new Mma.Symbol("List"),
                        list),
                    bytesRead: offset - originalOffset,
                };
            }
            var parsedMatrix = ParseMatrixAtLevel(bits, offset, sizes, n-1);
            offset += parsedMatrix.bytesRead;
            parts.push(parsedMatrix.expr);
            state = READY;
            break;
        }
    }

    return {
        parts: parts,
        bytesRead: offset - originalOffset,
    }
}

// The actual Uncompress[] implementation, unhelpfully called Decompress.
// Might want to look into renaming it.
Mma.Decompress = function (compressedString) {
    // See http://mathematica.stackexchange.com/questions/104660
    // Copying from Mathematica may produce a string with quotes, newlines
    // and/or backslashes embedded in - we need to get rid of these.
    for (var i=0; i < compressedString.length; i++) {
        if (compressedString[i] == "\\" ||
            compressedString[i] == "\n" ||
            compressedString[i] == "\"") {
            compressedString = Mma.Util.DeleteCharAt(compressedString, i);
            i--;
        }
    }
    var b64EncodedData = compressedString.trim().slice(2);
    var bitsCompressed = Mma.Util.Base64Decode(b64EncodedData);
    var bits = unzlibSync(bitsCompressed);
    var headerString = Mma.Util.U8ArrayToString(bits.slice(0,4))
    if (headerString !== "!boR") {
        Mma.Warn("Decompress: unknown header string " + headerString +
            " (expected !boR)");
    }
    return bits.slice(4);
}

// A helper function to decompress and then decode.
Mma.DecompressDecode = function (compressedString) {
    return Mma.Decode.Any(Mma.Decompress(compressedString));
}

Mma.toArray = function (obj) {
    
    var text = [];

    function print (str) {
        text.push(str);
    }

    if (obj instanceof Mma.IntegerMP || obj instanceof Mma.RealMP) {
        return(obj.n);
    } else if (obj instanceof Mma.IntegerAP || obj instanceof Mma.RealAP) {
        return(obj.nstring);
    } else if (obj instanceof Mma.Symbol) {
        return(obj.name);
    } else if (obj instanceof Mma.String) {
        return("'" + obj.str + "'");
    } else if (obj instanceof Mma.Expression) {
        if (obj.head instanceof Mma.Expression) {
            text.push(Mma.toArray(obj.head) )
        } else {
            print(obj.head.name);
        }
        
        for (var i=0; i < obj.parts.length; i++) {
            text.push(Mma.toArray(obj.parts[i]));
        }
   
    } else {
     
    }
    return text;
}
