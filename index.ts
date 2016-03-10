export interface Source {
  /**
  Read `length` bytes from the underlying source starting from `position`,
  into the given `buffer` starting at `offset`, returning the number of bytes
  read.
  */
  read(buffer: Buffer, offset: number, length: number, position: number): number;
  /**
  Read `length` bytes of the underlying file as a Buffer. May return a
  Buffer shorter than `length` iff EOF has been reached.
  */
  readBuffer(length: number, position: number): Buffer;
  /**
  Return the total number of bytes in the underlying source.
  */
  size: number;
}

// #############################################################################
//                                 ITERABLES

/**
Any sort of sequence can implement Iterable<T>. It's a lot like Array<T>, but
read-only, and without random access.
*/
export interface Iterable<T> {
  next(): T;
}
export interface StatefulIterable<T> extends Iterable<T> {
  position: number;
  size: number;
  peek(): T;
  skip(): boolean;
}

/**
In some cases, it makes more sense to iterate in batches, or chunks, through an
iterable of a particular type. The T in ChunkedIterable<T> should itself be a
sequence type, like string[] or Buffer (which effectively extends number[]).
*/
export interface ChunkedIterable<T> {
  /** Read the next {length} items from the underlying resource, and advance
  the cursor accordingly. The returned chunk may be shorter than {length} if
  EOF is reached. */
  next(length: number): T;
}
export interface StatefulChunkedIterable<T> extends ChunkedIterable<T> {
  /** The cursor, i.e., the current position within the underlying resource. */
  position: number;
  /** The total size of the underlying resource. */
  size: number;
  /** Return the next {length} items from the underlying resource but do not
  advance the cursor. */
  peek(length: number): T;
  /** Advance the cursor over the next {length} items in the underlying
  resource, returning the number of items actually passed over (which may be
  less than {length} if the end of the resource has been reached). */
  skip(length: number): number;
}

// #############################################################################
//                           BASIC BUFFER READER

// Commonly used special case.
/**
A stateful representation of some resource that produces Buffer chunks.
*/
export type BufferIterable = StatefulChunkedIterable<Buffer>;

/**
Wraps a Buffer as a stateful iterable.
*/
export class BufferIterator implements BufferIterable {
  constructor(private _buffer: Buffer, public position = 0) { }

  static fromString(str: string, encoding?: string): BufferIterator {
    var buffer = new Buffer(str, encoding);
    return new BufferIterator(buffer);
  }

  /**
  Return the total length of the underlying Buffer.
  */
  get size(): number {
    return this._buffer.length;
  }

  /**
  Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
  EOF, without advancing our position within the Buffer. Returns a Buffer slice.
  */
  peek(length: number): Buffer {
    return this._buffer.slice(this.position, this.position + length);
  }

  /**
  Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
  EOF, and advance our position within the Buffer. Returns a Buffer slice.

  Buffer#slice never returns entries beyond the end of the buffer:

      `new Buffer([1, 2, 3, 4]).slice(2, 10)` produces `<Buffer 03 04>`
  */
  next(length: number): Buffer {
    var buffer = this._buffer.slice(this.position, this.position + length);
    this.position += buffer.length;
    return buffer;
  }

  /**
  Skip over the next `length` characters, returning the number of skipped
  characters (which may be < `length` iff EOF has been reached).

  We do not allow skipping beyond the end of the buffer.
  */
  skip(length: number): number {
    var bytesSkipped = Math.min(length, this._buffer.length - this.position);
    this.position += bytesSkipped;
    return bytesSkipped;
  }
}

export interface StringIterable extends StatefulChunkedIterable<string> { }

/**
Wraps a string as a stateful iterable.
*/
export class StringIterator implements StringIterable {
  constructor(private _string: string, public position = 0) { }

  static fromBuffer(buffer: Buffer, encoding?: string, start?: number, end?: number): StringIterator {
    var str = buffer.toString(encoding, start, end);
    return new StringIterator(str);
  }

  /**
  Return the total length of the underlying Buffer.
  */
  get size(): number {
    return this._string.length;
  }

  /**
  Read the next `length` characters from the underlying string, or fewer iff
  we reach EOF, without advancing our position within the string.
  */
  peek(length: number): string {
    return this._string.slice(this.position, this.position + length);
  }

  /**
  Read the next `length` characters from the underlying string, or fewer iff
  we reach EOF, and advance our position within the string.
  */
  next(length: number): string {
    var chunk = this._string.slice(this.position, this.position + length);
    this.position += chunk.length;
    return chunk;
  }

  /**
  Skip over the next `length` characters, returning the number of skipped
  characters (which may be < `length` iff EOF has been reached).

  We do not allow skipping beyond the end of the string.
  */
  skip(length: number): number {
    var charsSkipped = Math.min(length, this._string.length - this.position);
    this.position += charsSkipped;
    return charsSkipped;
  }
}

/**
Wrap an Array as an iterable.
*/
export class ArrayIterator<T> implements StatefulIterable<T> {
  constructor(private _array: Array<T>, public position = 0) { }

  get size(): number {
    return this._array.length;
  }

  next(): T {
    return this._array[this.position++];
  }

  peek(): T {
    return this._array[this.position + 1];
  }

  skip(): boolean {
    if (this.position < this._array.length) {
      this.position++;
      return true;
    }
    return false;
  }
}

/**
Provide buffered access to a stream of bytes, e.g., a file.

It is buffered, which means you can call `peek(same_number)` repeatedly without
triggering a `read(2)` system call on the underlying file each time. Likewise,
calling `read(small_number)` repeatedly will issue a `read(2)` system call only
when the buffer doesn't have enough data.

When calling `read()` on the underlying file, it will read in batches of
`_block_size` (default: 1024) bytes.
*/
export class BufferedSourceReader {
  protected _buffer: Buffer = new Buffer(0);

  // when reading more data, pull in chunks of `block_size` bytes.
  constructor(private _source: Source,
              private _position = 0,
              private _block_size = 1024) { }

  /**
  @returns {number} The position (byte offset) in the file that would be read from if we called read(...). This is different from the internally-held position, which points to the end of the currently held buffer.
  */
  get position(): number {
    return this._position - this._buffer.length;
  }

  /**
  @returns {number} The total size (in bytes) of the underlying file.
  */
  get size(): number {
    return this._source.size;
  }

  /**
  Read data from the underlying file and append it to the buffer.

  @param {number} length The number of bytes to consume and append to the buffer.
  @returns {boolean} If the read operation reads fewer than the requested bytes, returns false, usually signifying that EOF has been reached. Returns true if it seems that there is more available data.
  */
  private _fillBuffer(length: number): boolean {
    var buffer = new Buffer(length);
    // always read from the current position
    var bytesRead = this._source.read(buffer, 0, length, this._position);
    // and update it accordingly
    this._position += bytesRead;
    // use the Buffer.concat totalLength argument to slice the fresh buffer if needed
    this._buffer = Buffer.concat([this._buffer, buffer], this._buffer.length + bytesRead);
    return bytesRead < length;
  }

  /**
  Read from the underlying file, appending to the currently held buffer,
  until the given predicate function returns false. That function will be called
  repeatedly with no arguments. If it returns false the first time it is called,
  nothing will be read.

  @param {Function} predicate A function that takes a Buffer and returns true if it's long enough.
  @returns {void} This may return without the condition being met, if the end of the underlying file has been reached.
  */
  protected _readWhile(predicate: (buffer: Buffer) => boolean): void {
    while (predicate(this._buffer)) {
      var EOF = this._fillBuffer(this._block_size);
      if (EOF) {
        // exit regardless
        break;
      }
    }
  }

  /**
  Read from the underlying source until we have at least `length` bytes in the buffer.

  @param {number} length The number of bytes to return without consuming. This is an upper bound, since the underlying source may contain fewer than the desired bytes.
  */
  protected _peekBytes(length: number): Buffer {
    this._readWhile(() => length > this._buffer.length);
    return this._buffer.slice(0, length);
  }

  /**
  Like _peekBytes(length), but consumes the bytes, so that subsequent calls return subsequent chunks.

  @param {number} length The number of bytes to return (upper bound).
  */
  protected _nextBytes(length: number): Buffer {
    var buffer = this._peekBytes(length);
    this._buffer = this._buffer.slice(length);
    return buffer;
  }

  /**
  Like _nextBytes(length), but doesn't ever slice off a buffer to hold the skipped bytes.

  @param {number} length The number of bytes that were skipped (consumed without returning), which may be fewer than `length` iff EOF has been reached.
  */
  protected _skipBytes(length: number): number {
    this._readWhile(() => length > this._buffer.length);
    // we cannot skip more than `this._buffer.length` bytes
    var bytesSkipped = Math.min(length, this._buffer.length);
    this._buffer = this._buffer.slice(length);
    return bytesSkipped;
  }
}

export class SourceBufferIterator extends BufferedSourceReader implements BufferIterable {
  constructor(source: Source, position = 0, block_size = 1024) {
    super(source, position, block_size);
  }

  next = this._nextBytes;
  peek = this._peekBytes;
  skip = this._skipBytes;
}

export class SourceStringIterator extends BufferedSourceReader implements StringIterable {
  constructor(source: Source, private _encoding: string, position = 0, block_size = 1024) {
    super(source, position, block_size);
  }

  peek(length: number): string {
    // TODO: don't re-encode the whole string and then only use a tiny bit of it
    // ensure that our subsequent call to toString() will
    // return a string that is at least `length` long.
    this._readWhile(() => length > this._buffer.toString(this._encoding).length);
    return this._buffer.toString(this._encoding).slice(0, length);
  }

  next(length: number): string {
    // TODO (see TODO in peek())
    var str = this.peek(length);
    // even though we know we consumed (at least) `length` number of characters,
    // we also need to know exactly how long that string is in bytes, in order
    // to advance the underlying buffer appropriately
    var byteLength = Buffer.byteLength(str, this._encoding);
    // we cannot skip more than `this._buffer.length` bytes
    // var bytesSkipped = Math.min(byteLength, this._buffer.length); // is this necessary?
    this._buffer = this._buffer.slice(byteLength);
    return str;
  }

  /**
  Skip over the next `length` characters, returning the number of skipped
  characters (which may be < `length` iff EOF has been reached).
  */
  skip(length: number): number {
    // TODO (see TODO in next())
    var consumed_string = this.next(length);
    return consumed_string.length;
  }

  // Provide raw Buffer-level access, too, beyond/outside the StringIterable interface.
  nextBytes = this._nextBytes;
  peekBytes = this._peekBytes;
  skipBytes = this._skipBytes;
}

// #############################################################################
//                                  LEXERS
//                             (the good stuff)

/**
Tokenizer#map() and Combiner#map() both return Token iterators.

Tokens with a null name and null Tokens should be treated the same way (as
insignificant / ignorable objects that should be skipped).

Tokens with an undefined name and undefined Tokens are always errors.
*/
export interface Token<T> {
  name: string;
  value: T;
}

/**
Another generic but frequently used alias.
*/
export interface TokenIterable<T> extends Iterable<Token<T>> { }

export function Token<T>(name: string, value: T = null): Token<T> {
  return {name: name, value: value};
}

// -----------------------------------------------------------------------------
//                               TOKENIZER

export interface RegexAction<T> { (match: RegExpMatchArray): Token<T>; }
export interface RegexRule<T> extends Array<RegExp | RegexAction<T>> { 0: RegExp; 1: RegexAction<T>; }

/**
The type T is the type of each token value, usually `any` (the token name is
always a string).
*/
export class Tokenizer<T> {
  constructor(private default_rules: RegexRule<T>[],
              private state_rules: {[index: string]: RegexRule<T>[]} = {},
              public peek_length: number = 256) { }

  getRules(state_name: string): RegexRule<T>[] {
    return (state_name === undefined) ? this.default_rules : this.state_rules[state_name];
  }

  /**
  Create a closure around the iterable.

  Unfortunately, it seems that TypeScript doesn't like inline functions, so we
  use a helper class (TokenizerIterator).
  */
  map(iterable: StringIterable, states: string[] = []): TokenIterable<T> {
    return new TokenizerIterator(this, iterable, states);
  }
}

class TokenizerIterator<T> implements TokenIterable<T> {
  constructor(private tokenizer: Tokenizer<T>,
              public iterable: StringIterable,
              public states: string[]) { }

  /**
  Returns the next available Token from the input reader.
  If the matching rule's action returns null, this will return null.

  TODO: optimize string conversion; abstract out the peek + toString, back into the reader?
  */
  private _next(): Token<T> {
    var state = this.states[this.states.length - 1];
    var rules = this.tokenizer.getRules(state);
    var input = this.iterable.peek(this.tokenizer.peek_length);
    for (var i = 0, rule; (rule = rules[i]); i++) {
      var match = input.match(rule[0]);
      if (match) {
        this.iterable.skip(match[0].length);
        return rule[1].call(this, match);
      }
    }

    var state_description = (state === undefined) ? 'the default state' : `state "${state}"`;
    throw new Error(`Invalid language; could not find a match in input "${input}" while in ${state_description}`);
  }

  /**
  Returns the next available non-null token / symbol output from the input
  reader (usually a token_data: [string, any] tuple).

  This will never return null, but may return undefined if one of the rules
  returns undefined, which the rule should not do! It will never a Token with
  a null name.
  */
  public next(): Token<T> {
    while (1) {
      var token = this._next();
      if (token !== null && token.name !== null) {
        return token;
      }
    }
  }
}

// -----------------------------------------------------------------------------
//                                COMBINER

export interface CombinerAction<T, U> { (tokens: Token<T>[]): Token<U>; }
export interface CombinerRule<T, U> extends Array<string | CombinerAction<T, U>> { 0: string; 1: CombinerAction<T, U>; }

/**
Recombine a stream of tokens using a stack of lists, e.g.,

    WORD:BT START:STRING CHAR:A CHAR:b CHAR:c END:STRING WORD:ET

becomes:

    WORD:BT STRING:Abc WORD:ET

*/
export class Combiner<T> {
  constructor(private rules: CombinerRule<T, T>[]) { }

  findRule(name: string): CombinerRule<T, T> {
    for (var i = 0, rule; (rule = this.rules[i]); i++) {
      if (rule[0] === name) {
        return rule;
      }
    }
    throw new Error(`No combiner rule found with the name: ${name}`);
  }

  map(iterable: TokenIterable<T>, stack: Array<Array<Token<T>>> = []): TokenIterable<T> {
    return new CombinerIterator(this, iterable, stack);
  }
}

class CombinerIterator<T> implements TokenIterable<T> {
  constructor(private combiner: Combiner<T>,
              public iterable: TokenIterable<T>,
              public stack: Array<Array<Token<T>>>) { }

  /**
  Returns the next available pair from the input reader (usually [token, data]).

  If the matching rule's action returns null, this will return null.
  */
  next(): Token<T> {
    var token = this.iterable.next();

    if (token.name == 'END') {
      // TODO: check that the preceding START token has the same value
      var tokens = this.stack.pop();
      // type hack with <any>
      var rule = this.combiner.findRule(<any>token.value);
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
  }
}

// -----------------------------------------------------------------------------
//                 Object-oriented Stack-driven State Machine

export interface MachineCallback<T> { (match?: RegExpMatchArray): T }
export type MachineRule<T> = [RegExp, MachineCallback<T>];
export function MachineRule<T>(regexp: RegExp, callback: MachineCallback<T>): MachineRule<T> {
  return [regexp, callback];
}
export interface MachineStateConstructor<T, I> {
  new(iterable: StringIterable, peek_length?: number): MachineState<T, I>;
}

/**
Every MachineState should declare a list of rules, at least one of which should
call this.pop() or return a value.

`T` is the result Type
`I` is the internal Type
*/
export class MachineState<T, I> {
  /** An internal value, which is incrementally built based on the input. */
  protected value: I;
  /**
  Each MachineRule maps a string pattern to an instance method, which returns
  a value of type T (or null). If a rule matches the input and the corresponding
  instance method returns a non-null value, we should exit (pop) this state by
  returning from read().
  */
  protected rules: MachineRule<T>[];
  constructor(protected iterable: StringIterable,
              protected peek_length: number = 256) { }

  private get name(): string {
    return this.constructor['name'];
  }

  /**
  pop() returns the value of this state. When used as a rule's callback, this
  consumes nothing from the input iterable, but triggers the end of this state
  by returning a value.
  */
  pop(): T {
    return <any>this.value;
  }
  /**
  ignore() returns undefined, which instructs the state to keep parsing.
  */
  ignore(): T {
    return undefined;
  }

  attachState<SubT, SubI>(SubState: MachineStateConstructor<SubT, SubI>): MachineState<SubT, SubI> {
    return new SubState(this.iterable, this.peek_length);
  }

  /**
  This derives a value of type T from the input, terminating with the first rule
  that returns a value.
  */
  read(): T {
    while (1) {
      var input = this.iterable.peek(this.peek_length);
      var match: RegExpMatchArray;
      for (var i = 0, rule: MachineRule<T>; (rule = this.rules[i]); i++) {
        // rule[0] is the RegExp; rule[1] is the instance method to call on success
        match = input.match(rule[0]);
        if (match !== null) {
          // advance the input tape over the matched input
          this.iterable.skip(match[0].length);
          // apply the matched transition
          var result = rule[1].call(this, match);
          if (result !== undefined) {
            return result;
          }
          if (input.length === 0) {
            throw new Error(`EOF reached without termination; cannot continue`);
          }
          // break out of the for loop while match is still defined
          break;
        }
      }

      // If at some point in the input iterable we run through all the patterns
      // and none of them match, we cannot proceed further.
      if (match === null) {
        var clean_input = input.slice(0, 128).replace(/\r\n|\r/g, '\n').replace(/\t|\v|\f/g, ' ').replace(/\0|\b/g, '');
        throw new Error(`Invalid language; could not find a match in input "${clean_input}" for state "${this.name}"`);
      }
    }
  }
}
