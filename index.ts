/// <reference path="type_declarations/DefinitelyTyped/node/node.d.ts" />
import fs = require('fs');

//// export module lexing {

// #############################################################################
//                                 READERS

export interface Reader {
  /**
  Reads a single byte.
  */
  readByte(): number;
  /**
  Reads a series of bytes.
  */
  readBuffer(length: number): Buffer;
}

export interface BufferedReader extends Reader {
  peekByte(): number;
  peekBuffer(length: number): Buffer;
  skip(length: number): number;
}

export class BufferedBufferReader implements BufferedReader {
  constructor(private buffer: Buffer) { }

  peekByte(): number {
    return this.buffer[0];
  }

  peekBuffer(length: number): Buffer {
    return this.buffer.slice(0, length);
  }

  readByte(): number {
    var byte = this.peekByte();
    this.buffer = this.buffer.slice(1);
    return byte;
  }

  readBuffer(length: number): Buffer {
    var buffer = this.peekBuffer(length);
    this.buffer = this.buffer.slice(length);
    return buffer;
  }

  /**
  Skip over the next `length` characters, returning the number of skipped
  characters (which may be < `length` iff EOF has been reached).
  */
  skip(length: number): number {
    // we cannot skip more than `this.buffer.length` bytes
    var bytesSkipped = Math.min(length, this.buffer.length);
    this.buffer = this.buffer.slice(length);
    return bytesSkipped;
  }

  toString(): string {
    return this.buffer.toString();
  }
}

export class BufferedStringReader extends BufferedBufferReader {
  constructor(input: string, encoding?: string) {
    super(new Buffer(input, encoding))
  }
}

// #############################################################################
//                                FILE READERS

/**
Provide buffered (and Buffer-friendly) access to a file.
*/
export class BufferedFileReader implements BufferedReader {
  // when reading more data, pull in chunks of `BLOCK_SIZE` bytes.
  static BLOCK_SIZE = 1024;
  private buffer: Buffer = new Buffer(0);

  constructor(private fd: number, private file_position: number = 0) { }

  static open(filepath: string): BufferedFileReader {
    var fd = fs.openSync(filepath, 'r');
    return new BufferedFileReader(fd);
  }

  close(): void {
    fs.closeSync(this.fd);
  }

  /**
  Calls fs.readSync on the underlying file descriptor with pretty much the same
  argument signature.

  Returns `bytesRead`, the number of bytes that were read into the given Buffer.

  Node.js documentation for fs.read() / fs.readSync():
  > position is an integer specifying where to begin reading from in the file.
  > If position is null, data will be read from the current file position.
  */
  read(buffer: Buffer, offset: number, length: number, position: number): number {
    return fs.readSync(this.fd, buffer, offset, length, position);
  }

  /**
  Ensure that the available buffer is at least `length` bytes long.

  This may return without the condition being met of this.buffer.length >= length,
  if the end of the underlying file has been reached.
  */
  private ensureLength(length: number): void {
    while (length > this.buffer.length) {
      // all the action happens only if we need more bytes than are in the buffer
      var EOF = this.fillBuffer(BufferedFileReader.BLOCK_SIZE);
      if (EOF) {
        // exit regardless
        break;
      }
    }
  }

  /**
  Read data from the underlying file and append it to the buffer.

  Returns false iff EOF has been reached, otherwise returns true. */
  private fillBuffer(length: number): boolean {
    var buffer = new Buffer(length);
    // always read from the reader's current position
    var bytesRead = this.read(buffer, 0, length, this.file_position);
    // and update it accordingly
    this.file_position += bytesRead;
    // use the Buffer.concat totalLength argument to slice the fresh buffer if needed
    this.buffer = Buffer.concat([this.buffer, buffer], this.buffer.length + bytesRead);
    return bytesRead < length;
  }

  peekByte(): number {
    this.ensureLength(1);
    return this.buffer[0];
  }

  peekBuffer(length: number): Buffer {
    this.ensureLength(length);
    return this.buffer.slice(0, length);
  }

  readByte(): number {
    var byte = this.peekByte();
    this.buffer = this.buffer.slice(1);
    return byte;
  }

  readBuffer(length: number): Buffer {
    var buffer = this.peekBuffer(length);
    this.buffer = this.buffer.slice(length);
    return buffer;
  }

  /**
  Skip over the next `length` characters, returning the number of skipped
  characters (which may be < `length` iff EOF has been reached).
  */
  skip(length: number): number {
    this.ensureLength(length);
    // we cannot skip more than `this.buffer.length` bytes
    var bytesSkipped = Math.min(length, this.buffer.length);
    this.buffer = this.buffer.slice(length);
    return bytesSkipped;
  }

}

// #############################################################################
//                                  LEXERS

export interface RuleAction<T> { (match: RegExpMatchArray): [string, T]; }
export interface Rule<T> extends Array<RegExp | RuleAction<T>> { 0: RegExp; 1: RuleAction<T>; }

export class BufferedLexer<T> {
  reader: BufferedReader;
  states: string[];

  constructor(private default_rules: Rule<T>[], private state_rules: {[index: string]: Rule<T>[]}) {
    this.reset();
  }

  /**
  Reset the Lexer back to its initial state.
  */
  reset(): void {
    this.states = [];
  }

  /**
  Returns the next available pair from the input reader (usually [token, data]).

  If the matching rule's action returns null, this will return null.
  */
  read(): T {
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

    throw new Error(`Invalid language; could not find a match in input "${input}" while in state "${state}"`);
  }

  /**
  Returns the next available non-null token / symbol output from the input
  reader (usually a token_data: [string, any] tuple).

  This will never return null.
  */
  next(): T {
    var result;
    do {
      result = this.read();
    } while (result === null);
    return result;
  }
}

//// }
