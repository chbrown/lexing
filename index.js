var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="type_declarations/DefinitelyTyped/node/node.d.ts" />
var fs = require('fs');
var BufferedBufferReader = (function () {
    function BufferedBufferReader(buffer) {
        this.buffer = buffer;
    }
    BufferedBufferReader.prototype.peekByte = function () {
        return this.buffer[0];
    };
    BufferedBufferReader.prototype.peekBuffer = function (length) {
        return this.buffer.slice(0, length);
    };
    BufferedBufferReader.prototype.readByte = function () {
        var byte = this.peekByte();
        this.buffer = this.buffer.slice(1);
        return byte;
    };
    BufferedBufferReader.prototype.readBuffer = function (length) {
        var buffer = this.peekBuffer(length);
        this.buffer = this.buffer.slice(length);
        return buffer;
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
    */
    BufferedBufferReader.prototype.skip = function (length) {
        // we cannot skip more than `this.buffer.length` bytes
        var bytesSkipped = Math.min(length, this.buffer.length);
        this.buffer = this.buffer.slice(length);
        return bytesSkipped;
    };
    BufferedBufferReader.prototype.toString = function () {
        return this.buffer.toString();
    };
    return BufferedBufferReader;
})();
exports.BufferedBufferReader = BufferedBufferReader;
var BufferedStringReader = (function (_super) {
    __extends(BufferedStringReader, _super);
    function BufferedStringReader(input, encoding) {
        _super.call(this, new Buffer(input, encoding));
    }
    return BufferedStringReader;
})(BufferedBufferReader);
exports.BufferedStringReader = BufferedStringReader;
// #############################################################################
//                                FILE READERS
/**
Provide buffered (and Buffer-friendly) access to a file.
*/
var BufferedFileReader = (function () {
    function BufferedFileReader(fd, file_position) {
        if (file_position === void 0) { file_position = 0; }
        this.fd = fd;
        this.file_position = file_position;
        this.buffer = new Buffer(0);
    }
    BufferedFileReader.open = function (filepath) {
        var fd = fs.openSync(filepath, 'r');
        return new BufferedFileReader(fd);
    };
    BufferedFileReader.prototype.close = function () {
        fs.closeSync(this.fd);
    };
    /**
    Calls fs.readSync on the underlying file descriptor with pretty much the same
    argument signature.
  
    Returns `bytesRead`, the number of bytes that were read into the given Buffer.
  
    Node.js documentation for fs.read() / fs.readSync():
    > position is an integer specifying where to begin reading from in the file.
    > If position is null, data will be read from the current file position.
    */
    BufferedFileReader.prototype.read = function (buffer, offset, length, position) {
        return fs.readSync(this.fd, buffer, offset, length, position);
    };
    /**
    Ensure that the available buffer is at least `length` bytes long.
  
    This may return without the condition being met of this.buffer.length >= length,
    if the end of the underlying file has been reached.
    */
    BufferedFileReader.prototype.ensureLength = function (length) {
        while (length > this.buffer.length) {
            // all the action happens only if we need more bytes than are in the buffer
            var EOF = this.fillBuffer(BufferedFileReader.BLOCK_SIZE);
            if (EOF) {
                break;
            }
        }
    };
    /**
    Read data from the underlying file and append it to the buffer.
  
    Returns false iff EOF has been reached, otherwise returns true. */
    BufferedFileReader.prototype.fillBuffer = function (length) {
        var buffer = new Buffer(length);
        // always read from the reader's current position
        var bytesRead = this.read(buffer, 0, length, this.file_position);
        // and update it accordingly
        this.file_position += bytesRead;
        // use the Buffer.concat totalLength argument to slice the fresh buffer if needed
        this.buffer = Buffer.concat([this.buffer, buffer], this.buffer.length + bytesRead);
        return bytesRead < length;
    };
    BufferedFileReader.prototype.peekByte = function () {
        this.ensureLength(1);
        return this.buffer[0];
    };
    BufferedFileReader.prototype.peekBuffer = function (length) {
        this.ensureLength(length);
        return this.buffer.slice(0, length);
    };
    BufferedFileReader.prototype.readByte = function () {
        var byte = this.peekByte();
        this.buffer = this.buffer.slice(1);
        return byte;
    };
    BufferedFileReader.prototype.readBuffer = function (length) {
        var buffer = this.peekBuffer(length);
        this.buffer = this.buffer.slice(length);
        return buffer;
    };
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
    */
    BufferedFileReader.prototype.skip = function (length) {
        this.ensureLength(length);
        // we cannot skip more than `this.buffer.length` bytes
        var bytesSkipped = Math.min(length, this.buffer.length);
        this.buffer = this.buffer.slice(length);
        return bytesSkipped;
    };
    // when reading more data, pull in chunks of `BLOCK_SIZE` bytes.
    BufferedFileReader.BLOCK_SIZE = 1024;
    return BufferedFileReader;
})();
exports.BufferedFileReader = BufferedFileReader;
var BufferedLexer = (function () {
    function BufferedLexer(default_rules, state_rules) {
        this.default_rules = default_rules;
        this.state_rules = state_rules;
        this.reset();
    }
    /**
    Reset the Lexer back to its initial state.
    */
    BufferedLexer.prototype.reset = function () {
        this.states = [];
    };
    /**
    Returns the next available pair from the input reader (usually [token, data]).
  
    If the matching rule's action returns null, this will return null.
    */
    BufferedLexer.prototype.read = function () {
        // TODO: abstract out the peekBuffer + toString, back into the reader?
        //   optimize string conversion
        var input = this.reader.peekBuffer(256).toString('utf8');
        var state = this.states[this.states.length - 1];
        var rules = state ? this.state_rules[state] : this.default_rules;
        for (var i = 0, rule; (rule = rules[i]); i++) {
            var match = input.match(rule[0]);
            if (match) {
                var byteLength = Buffer.byteLength(match[0], 'utf8');
                this.reader.skip(byteLength);
                return rule[1].call(this, match);
            }
        }
        throw new Error("Invalid language; could not find a match in input \"" + input + "\" while in state \"" + state + "\"");
    };
    /**
    Returns the next available non-null token / symbol output from the input
    reader (usually a token_data: [string, any] tuple).
  
    This will never return null.
    */
    BufferedLexer.prototype.next = function () {
        var result;
        do {
            result = this.read();
        } while (result === null);
        return result;
    };
    return BufferedLexer;
})();
exports.BufferedLexer = BufferedLexer;
//// }
