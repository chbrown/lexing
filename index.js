var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="type_declarations/DefinitelyTyped/node/node.d.ts" />
var fs = require('fs');
/**
Wraps a Buffer as a stateful iterable.
*/
var BufferIterator = (function () {
    function BufferIterator(_buffer, position) {
        if (position === void 0) { position = 0; }
        this._buffer = _buffer;
        this.position = position;
    }
    BufferIterator.fromString = function (str, encoding) {
        var buffer = new Buffer(str, encoding);
        return new BufferIterator(buffer);
    };
    Object.defineProperty(BufferIterator.prototype, "size", {
        /**
        Return the total length of the underlying Buffer.
        */
        get: function () {
            return this._buffer.length;
        },
        enumerable: true,
        configurable: true
    });
    /**
    Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
    EOF, without advancing our position within the Buffer. Returns a Buffer slice.
    */
    BufferIterator.prototype.peek = function (length) {
        return this._buffer.slice(this.position, this.position + length);
    };
    /**
    Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
    EOF, and advance our position within the Buffer. Returns a Buffer slice.
  
    Buffer#slice never returns entries beyond the end of the buffer:
  
        `new Buffer([1, 2, 3, 4]).slice(2, 10)` produces `<Buffer 03 04>`
    */
    BufferIterator.prototype.next = function (length) {
        var buffer = this._buffer.slice(this.position, this.position + length);
        this.position += buffer.length;
        return buffer;
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
  
    We do not allow skipping beyond the end of the buffer.
    */
    BufferIterator.prototype.skip = function (length) {
        var bytesSkipped = Math.min(length, this._buffer.length - this.position);
        this.position += bytesSkipped;
        return bytesSkipped;
    };
    return BufferIterator;
})();
exports.BufferIterator = BufferIterator;
/**
Wraps a string as a stateful iterable.
*/
var StringIterator = (function () {
    function StringIterator(_string, position) {
        if (position === void 0) { position = 0; }
        this._string = _string;
        this.position = position;
    }
    StringIterator.fromBuffer = function (buffer, encoding) {
        var str = buffer.toString(encoding);
        return new StringIterator(str);
    };
    Object.defineProperty(StringIterator.prototype, "size", {
        /**
        Return the total length of the underlying Buffer.
        */
        get: function () {
            return this._string.length;
        },
        enumerable: true,
        configurable: true
    });
    /**
    Read the next `length` characters from the underlying string, or fewer iff
    we reach EOF, without advancing our position within the string.
    */
    StringIterator.prototype.peek = function (length) {
        return this._string.slice(this.position, this.position + length);
    };
    /**
    Read the next `length` characters from the underlying string, or fewer iff
    we reach EOF, and advance our position within the string.
    */
    StringIterator.prototype.next = function (length) {
        var chunk = this._string.slice(this.position, this.position + length);
        this.position += chunk.length;
        return chunk;
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
  
    We do not allow skipping beyond the end of the string.
    */
    StringIterator.prototype.skip = function (length) {
        var charsSkipped = Math.min(length, this._string.length - this.position);
        this.position += charsSkipped;
        return charsSkipped;
    };
    return StringIterator;
})();
exports.StringIterator = StringIterator;
/**
Wrap an Array as an iterable.
*/
var ArrayIterator = (function () {
    function ArrayIterator(_array, position) {
        if (position === void 0) { position = 0; }
        this._array = _array;
        this.position = position;
    }
    Object.defineProperty(ArrayIterator.prototype, "size", {
        get: function () {
            return this._array.length;
        },
        enumerable: true,
        configurable: true
    });
    ArrayIterator.prototype.next = function () {
        return this._array[this.position++];
    };
    ArrayIterator.prototype.peek = function () {
        return this._array[this.position + 1];
    };
    ArrayIterator.prototype.skip = function () {
        if (this.position < this._array.length) {
            this.position++;
            return true;
        }
        return false;
    };
    return ArrayIterator;
})();
exports.ArrayIterator = ArrayIterator;
// #############################################################################
//                          SYNCHRONOUS FILE READER
/**
Provide iterative access to a file.

It is buffered, which means you can call `peek(same_number)` repeatedly without
triggering a `read(2)` system call on the underlying file each time. Likewise,
calling `read(small_number)` repeatedly will issue a `read(2)` system call only
when the buffer doesn't have enough data.

When calling `read()` on the underlying file, it will read batches of
`_block_size` (default: 1024) bytes.
*/
var BufferedFileReader = (function () {
    // when reading more data, pull in chunks of `_block_size` bytes.
    function BufferedFileReader(_fd, _position, _block_size) {
        if (_position === void 0) { _position = 0; }
        if (_block_size === void 0) { _block_size = 1024; }
        this._fd = _fd;
        this._position = _position;
        this._block_size = _block_size;
        this._buffer = new Buffer(0);
    }
    Object.defineProperty(BufferedFileReader.prototype, "position", {
        /**
        Return the position in the file that would be read from if we called
        read(...). This is different from the internally-held position, which
        points to the end of the currently held buffer.
        */
        get: function () {
            return this._position - this._buffer.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferedFileReader.prototype, "size", {
        /**
        Return the total size (in bytes) of the underlying file.
        */
        get: function () {
            return fs.fstatSync(this._fd).size;
        },
        enumerable: true,
        configurable: true
    });
    /**
    Read data from the underlying file and append it to the buffer.
  
    Returns false if the read operation reads fewer than the requested bytes,
    usually signifying that EOF has been reached.
    */
    BufferedFileReader.prototype._fillBuffer = function (length) {
        var buffer = new Buffer(length);
        // always read from the current position
        var bytesRead = fs.readSync(this._fd, buffer, 0, length, this._position);
        // and update it accordingly
        this._position += bytesRead;
        // use the Buffer.concat totalLength argument to slice the fresh buffer if needed
        this._buffer = Buffer.concat([this._buffer, buffer], this._buffer.length + bytesRead);
        return bytesRead < length;
    };
    /**
    Read from the underlying file, appending to the currently held buffer,
    until the given predicate function returns false. That function will be called
    repeatedly with no arguments. If it returns false the first time it is called,
    nothing will be read.
  
    This may return without the condition being met, if the end of the underlying
    file has been reached.
    */
    BufferedFileReader.prototype._readWhile = function (predicate) {
        while (predicate(this._buffer)) {
            var EOF = this._fillBuffer(this._block_size);
            if (EOF) {
                break;
            }
        }
    };
    return BufferedFileReader;
})();
exports.BufferedFileReader = BufferedFileReader;
var FileBufferIterator = (function (_super) {
    __extends(FileBufferIterator, _super);
    function FileBufferIterator(_fd, _position, _block_size) {
        if (_position === void 0) { _position = 0; }
        if (_block_size === void 0) { _block_size = 1024; }
        _super.call(this, _fd, _position, _block_size);
    }
    FileBufferIterator.prototype._ensureLength = function (length) {
        var _this = this;
        // all the action happens only if we need more bytes than are in the buffer
        this._readWhile(function () { return length > _this._buffer.length; });
    };
    FileBufferIterator.prototype.next = function (length) {
        this._ensureLength(length);
        var buffer = this._buffer.slice(0, length);
        this._buffer = this._buffer.slice(length);
        return buffer;
    };
    FileBufferIterator.prototype.peek = function (length) {
        this._ensureLength(length);
        return this._buffer.slice(0, length);
    };
    /**
    Skip over the next `length` bytes, returning the number of skipped
    bytes (which may be < `length` iff EOF has been reached).
    */
    FileBufferIterator.prototype.skip = function (length) {
        this._ensureLength(length);
        // we cannot skip more than `this.buffer.length` bytes
        var bytesSkipped = Math.min(length, this._buffer.length);
        this._buffer = this._buffer.slice(length);
        return bytesSkipped;
    };
    return FileBufferIterator;
})(BufferedFileReader);
exports.FileBufferIterator = FileBufferIterator;
var FileStringIterator = (function (_super) {
    __extends(FileStringIterator, _super);
    function FileStringIterator(_fd, _encoding, _position, _block_size) {
        if (_position === void 0) { _position = 0; }
        if (_block_size === void 0) { _block_size = 1024; }
        _super.call(this, _fd, _position, _block_size);
        this._encoding = _encoding;
    }
    FileStringIterator.prototype._ensureLength = function (length) {
        var _this = this;
        // TODO: count characters without reencoding
        this._readWhile(function () { return length > _this._buffer.toString(_this._encoding).length; });
    };
    FileStringIterator.prototype.next = function (length) {
        // TODO: don't re-encode the whole string and then only use a tiny bit of it
        this._ensureLength(length);
        var str = this._buffer.toString(this._encoding).slice(0, length);
        var byteLength = Buffer.byteLength(str, this._encoding);
        this._buffer = this._buffer.slice(byteLength);
        return str;
    };
    FileStringIterator.prototype.peek = function (length) {
        // TODO (see TODO in next())
        this._ensureLength(length);
        return this._buffer.toString(this._encoding).slice(0, length);
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
    */
    FileStringIterator.prototype.skip = function (length) {
        // TODO (see TODO in next())
        this._ensureLength(length);
        var consumed_string = this._buffer.toString(this._encoding).slice(0, length);
        var byteLength = Buffer.byteLength(consumed_string, this._encoding);
        // we cannot skip more than `this._buffer.length` bytes
        var bytesSkipped = Math.min(byteLength, this._buffer.length);
        this._buffer = this._buffer.slice(byteLength);
        return consumed_string.length;
    };
    /**
    Provide raw Buffer-level access, too.
    */
    FileStringIterator.prototype.nextBytes = function (length) {
        this._ensureLength(length);
        var buffer = this._buffer.slice(0, length);
        this._buffer = this._buffer.slice(length);
        return buffer;
    };
    FileStringIterator.prototype.peekBytes = function (length) {
        this._ensureLength(length);
        return this._buffer.slice(0, length);
    };
    FileStringIterator.prototype.skipBytes = function (length) {
        this._ensureLength(length);
        var bytesSkipped = Math.min(length, this._buffer.length);
        this._buffer = this._buffer.slice(length);
        return bytesSkipped;
    };
    return FileStringIterator;
})(BufferedFileReader);
exports.FileStringIterator = FileStringIterator;
function Token(name, value) {
    if (value === void 0) { value = null; }
    return { name: name, value: value };
}
exports.Token = Token;
/**
The type T is the type of each token value, usually `any` (the token name is
always a string).
*/
var Tokenizer = (function () {
    function Tokenizer(default_rules, state_rules) {
        if (state_rules === void 0) { state_rules = {}; }
        this.default_rules = default_rules;
        this.state_rules = state_rules;
    }
    Tokenizer.prototype.getRules = function (state_name) {
        return (state_name === undefined) ? this.default_rules : this.state_rules[state_name];
    };
    /**
    Create a closure around the iterable.
  
    Unfortunately, it seems that TypeScript doesn't like inline functions, so we
    use a helper class (TokenizerIterator).
    */
    Tokenizer.prototype.map = function (iterable, states) {
        if (states === void 0) { states = []; }
        return new TokenizerIterator(this, iterable, states);
    };
    return Tokenizer;
})();
exports.Tokenizer = Tokenizer;
var TokenizerIterator = (function () {
    function TokenizerIterator(tokenizer, iterable, states) {
        this.tokenizer = tokenizer;
        this.iterable = iterable;
        this.states = states;
    }
    /**
    Returns the next available Token from the input reader.
    If the matching rule's action returns null, this will return null.
  
    TODO: optimize string conversion; abstract out the peek + toString, back into the reader?
    */
    TokenizerIterator.prototype._next = function () {
        var state = this.states[this.states.length - 1];
        var rules = this.tokenizer.getRules(state);
        var input = this.iterable.peek(256);
        for (var i = 0, rule; (rule = rules[i]); i++) {
            var match = input.match(rule[0]);
            if (match) {
                this.iterable.skip(match[0].length);
                return rule[1].call(this, match);
            }
        }
        throw new Error("Invalid language; could not find a match in input \"" + input + "\" while in state \"" + state + "\"");
    };
    /**
    Returns the next available non-null token / symbol output from the input
    reader (usually a token_data: [string, any] tuple).
  
    This will never return null, but may return undefined if one of the rules
    returns undefined, which the rule should not do! It will never a Token with
    a null name.
    */
    TokenizerIterator.prototype.next = function () {
        while (1) {
            var token = this._next();
            if (token !== null && token.name !== null) {
                return token;
            }
        }
    };
    return TokenizerIterator;
})();
/**
Recombine a stream of tokens using a stack of lists, e.g.,

    WORD:BT START:STRING CHAR:A CHAR:b CHAR:c END:STRING WORD:ET

becomes:

    WORD:BT STRING:Abc WORD:ET

*/
var Combiner = (function () {
    function Combiner(rules) {
        this.rules = rules;
    }
    Combiner.prototype.findRule = function (name) {
        for (var i = 0, rule; (rule = this.rules[i]); i++) {
            if (rule[0] === name) {
                return rule;
            }
        }
        throw new Error("No combiner rule found with the name: " + name);
    };
    Combiner.prototype.map = function (iterable, stack) {
        if (stack === void 0) { stack = []; }
        return new CombinerIterator(this, iterable, stack);
    };
    return Combiner;
})();
exports.Combiner = Combiner;
var CombinerIterator = (function () {
    function CombinerIterator(combiner, iterable, stack) {
        this.combiner = combiner;
        this.iterable = iterable;
        this.stack = stack;
    }
    /**
    Returns the next available pair from the input reader (usually [token, data]).
  
    If the matching rule's action returns null, this will return null.
    */
    CombinerIterator.prototype.next = function () {
        var token = this.iterable.next();
        if (token.name == 'END') {
            // TODO: check that the preceding START token has the same value
            var tokens = this.stack.pop();
            // type hack with <any>
            var rule = this.combiner.findRule(token.value);
            // reduce into combined token
            token = rule[1](tokens);
        }
        if (token.name == 'START') {
            // TODO: store the START token's value somewhere so that we can verify the END token's value matches
            this.stack.push([]);
            return this.next();
        }
        else if (this.stack.length > 0) {
            // push it onto the list at the top of the stack
            this.stack[this.stack.length - 1].push(token);
            return this.next();
        }
        else {
            // tokens at root level pass through transparently
            return token;
        }
    };
    return CombinerIterator;
})();
//// }
