/**
Very trimmed-down version of Node's Buffer.
*/
export interface Buffer {
    toString(encoding?: string, start?: number, end?: number): string;
    slice(start?: number, end?: number): Buffer;
    length: number;
}
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
sequence type, like string[] or Buffer.
*/
export interface ChunkedIterable<T> {
    next(length: number): T;
}
export interface StatefulChunkedIterable<T> extends ChunkedIterable<T> {
    position: number;
    size: number;
    peek(length: number): T;
    skip(length: number): number;
}
/**
Commonly used special case.
*/
export interface BufferIterable extends StatefulChunkedIterable<Buffer> {
}
/**
Wraps a Buffer as a stateful iterable.
*/
export declare class BufferIterator implements BufferIterable {
    private _buffer;
    position: number;
    constructor(_buffer: Buffer, position?: number);
    static fromString(str: string, encoding?: string): BufferIterator;
    /**
    Return the total length of the underlying Buffer.
    */
    size: number;
    /**
    Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
    EOF, without advancing our position within the Buffer. Returns a Buffer slice.
    */
    peek(length: number): Buffer;
    /**
    Read the next `length` bytes from the underlying Buffer, or fewer iff we reach
    EOF, and advance our position within the Buffer. Returns a Buffer slice.
  
    Buffer#slice never returns entries beyond the end of the buffer:
  
        `new Buffer([1, 2, 3, 4]).slice(2, 10)` produces `<Buffer 03 04>`
    */
    next(length: number): Buffer;
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
  
    We do not allow skipping beyond the end of the buffer.
    */
    skip(length: number): number;
}
export interface StringIterable extends StatefulChunkedIterable<string> {
}
/**
Wraps a string as a stateful iterable.
*/
export declare class StringIterator implements StringIterable {
    private _string;
    position: number;
    constructor(_string: string, position?: number);
    static fromBuffer(buffer: Buffer, encoding?: string, start?: number, end?: number): StringIterator;
    /**
    Return the total length of the underlying Buffer.
    */
    size: number;
    /**
    Read the next `length` characters from the underlying string, or fewer iff
    we reach EOF, without advancing our position within the string.
    */
    peek(length: number): string;
    /**
    Read the next `length` characters from the underlying string, or fewer iff
    we reach EOF, and advance our position within the string.
    */
    next(length: number): string;
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
  
    We do not allow skipping beyond the end of the string.
    */
    skip(length: number): number;
}
/**
Wrap an Array as an iterable.
*/
export declare class ArrayIterator<T> implements StatefulIterable<T> {
    private _array;
    position: number;
    constructor(_array: Array<T>, position?: number);
    size: number;
    next(): T;
    peek(): T;
    skip(): boolean;
}
/**
Provide iterative access to a file.

It is buffered, which means you can call `peek(same_number)` repeatedly without
triggering a `read(2)` system call on the underlying file each time. Likewise,
calling `read(small_number)` repeatedly will issue a `read(2)` system call only
when the buffer doesn't have enough data.

When calling `read()` on the underlying file, it will read in batches of
`_block_size` (default: 1024) bytes.
*/
export declare class BufferedSourceReader {
    private _source;
    private _position;
    private _block_size;
    protected _buffer: Buffer;
    constructor(_source: Source, _position?: number, _block_size?: number);
    /**
    Return the position in the file that would be read from if we called
    read(...). This is different from the internally-held position, which
    points to the end of the currently held buffer.
    */
    position: number;
    /**
    Return the total size (in bytes) of the underlying file.
    */
    size: number;
    /**
    Read data from the underlying file and append it to the buffer.
  
    Returns false if the read operation reads fewer than the requested bytes,
    usually signifying that EOF has been reached.
    */
    private _fillBuffer(length);
    /**
    Read from the underlying file, appending to the currently held buffer,
    until the given predicate function returns false. That function will be called
    repeatedly with no arguments. If it returns false the first time it is called,
    nothing will be read.
  
    This may return without the condition being met, if the end of the underlying
    file has been reached.
    */
    protected _readWhile(predicate: (buffer: Buffer) => boolean): void;
}
export declare class SourceBufferIterator extends BufferedSourceReader implements BufferIterable {
    constructor(source: Source, position?: number, block_size?: number);
    private _ensureLength(length);
    next(length: number): Buffer;
    peek(length: number): Buffer;
    /**
    Skip over the next `length` bytes, returning the number of skipped
    bytes (which may be < `length` iff EOF has been reached).
    */
    skip(length: number): number;
}
export declare class SourceStringIterator extends BufferedSourceReader implements StringIterable {
    private _encoding;
    constructor(source: Source, _encoding: string, position?: number, block_size?: number);
    private _ensureLength(length);
    next(length: number): string;
    peek(length: number): string;
    /**
    Skip over the next `length` characters, returning the number of skipped
    characters (which may be < `length` iff EOF has been reached).
    */
    skip(length: number): number;
    /**
    Provide raw Buffer-level access, too.
    */
    nextBytes(length: number): Buffer;
    peekBytes(length: number): Buffer;
    skipBytes(length: number): number;
}
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
export interface TokenIterable<T> extends Iterable<Token<T>> {
}
export declare function Token<T>(name: string, value?: T): Token<T>;
export interface RegexAction<T> {
    (match: RegExpMatchArray): Token<T>;
}
export interface RegexRule<T> extends Array<RegExp | RegexAction<T>> {
    0: RegExp;
    1: RegexAction<T>;
}
/**
The type T is the type of each token value, usually `any` (the token name is
always a string).
*/
export declare class Tokenizer<T> {
    private default_rules;
    private state_rules;
    peek_length: number;
    constructor(default_rules: RegexRule<T>[], state_rules?: {
        [index: string]: RegexRule<T>[];
    }, peek_length?: number);
    getRules(state_name: string): RegexRule<T>[];
    /**
    Create a closure around the iterable.
  
    Unfortunately, it seems that TypeScript doesn't like inline functions, so we
    use a helper class (TokenizerIterator).
    */
    map(iterable: StringIterable, states?: string[]): TokenIterable<T>;
}
export interface CombinerAction<T, U> {
    (tokens: Token<T>[]): Token<U>;
}
export interface CombinerRule<T, U> extends Array<string | CombinerAction<T, U>> {
    0: string;
    1: CombinerAction<T, U>;
}
/**
Recombine a stream of tokens using a stack of lists, e.g.,

    WORD:BT START:STRING CHAR:A CHAR:b CHAR:c END:STRING WORD:ET

becomes:

    WORD:BT STRING:Abc WORD:ET

*/
export declare class Combiner<T> {
    private rules;
    constructor(rules: CombinerRule<T, T>[]);
    findRule(name: string): CombinerRule<T, T>;
    map(iterable: TokenIterable<T>, stack?: Array<Array<Token<T>>>): TokenIterable<T>;
}
export interface MachineCallback<T> {
    (match?: RegExpMatchArray): T;
}
export interface MachineRule<T> extends Array<RegExp | MachineCallback<T>> {
    0: RegExp;
    1: MachineCallback<T>;
}
export declare function MachineRule<T>(regexp: RegExp, callback: MachineCallback<T>): MachineRule<T>;
export interface MachineStateConstructor<T, I> {
    new (iterable: StringIterable, peek_length?: number): MachineState<T, I>;
}
/**
Every MachineState has:

* value: I
  An internal value, which is incrementally built based on the input.
* read(): T
  This derives a value of type T from the input.
* rules: MachineRule[]
  Each MachineRule maps a string pattern to an instance method, which returns
  a value of type T (or null). If a rule matches the input and the corresponding
  instance method returns a non-null value, we should exit (pop) this state by
  returning from read().

`T` is the result Type
`I` is the internal Type
*/
export declare class MachineState<T, I> {
    protected iterable: StringIterable;
    protected peek_length: number;
    protected value: I;
    protected rules: MachineRule<T>[];
    constructor(iterable: StringIterable, peek_length?: number);
    private name;
    pop(): T;
    ignore(): T;
    attachState<SubT, SubI>(SubState: MachineStateConstructor<SubT, SubI>): MachineState<SubT, SubI>;
    read(): T;
}