/// <reference path="../../type_declarations/DefinitelyTyped/node/node.d.ts" />
declare module "lexing" {
    /**
    Any sort of sequence can implement Iterable<T>. It's a lot like Array<T>, but
    read-only, and without random access.
    */
    interface Iterable<T> {
        next(): T;
    }
    interface StatefulIterable<T> extends Iterable<T> {
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
    interface ChunkedIterable<T> {
        next(length: number): T;
    }
    interface StatefulChunkedIterable<T> extends ChunkedIterable<T> {
        position: number;
        size: number;
        peek(length: number): T;
        skip(length: number): number;
    }
    /**
    Wraps a Buffer as a stateful iterable.
    */
    class BufferIterator implements StatefulChunkedIterable<Buffer> {
        private _buffer;
        private _position;
        constructor(_buffer: Buffer, _position?: number);
        static fromString(str: string, encoding?: string): BufferIterator;
        /**
        Return the current position within the underlying Buffer.
        */
        position: number;
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
    /**
    Wrap an Array as an iterable.
    */
    class ArrayIterator<T> implements StatefulIterable<T> {
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
    
    When calling `read()` on the underlying file, it will read batches of
    `_block_size` (default: 1024) bytes.
    */
    class FileIterator implements StatefulChunkedIterable<Buffer> {
        private _fd;
        private _position;
        private _block_size;
        private _buffer;
        constructor(_fd: number, _position?: number, _block_size?: number);
        static open(filepath: string): FileIterator;
        close(): void;
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
        Ensure that the available buffer is at least `length` bytes long.
      
        This may return without the condition being met (this.buffer.length >= length),
        if the end of the underlying file has been reached.
      
        TODO: pull _fillBuffer into the loop, with the Buffer declaration outside.
        */
        private _ensureLength(length);
        /**
        Read data from the underlying file and append it to the buffer.
      
        Returns false iff EOF has been reached, otherwise returns true. */
        private _fillBuffer(length);
        next(length: number): Buffer;
        peek(length: number): Buffer;
        /**
        Skip over the next `length` characters, returning the number of skipped
        characters (which may be < `length` iff EOF has been reached).
        */
        skip(length: number): number;
    }
    /**
    Commonly used special case.
    */
    interface BufferIterable extends StatefulChunkedIterable<Buffer> {
    }
    /**
    Tokenizer#map() and Combiner#map() both return Token iterators.
    
    Tokens with a null name and null Tokens should be treated the same way (as
    insignificant / ignorable objects that should be skipped).
    
    Tokens with an undefined name and undefined Tokens are always errors.
    */
    interface Token<T> {
        name: string;
        value: T;
    }
    /**
    Another generic but frequently used alias.
    */
    interface TokenIterable<T> extends Iterable<Token<T>> {
    }
    function Token<T>(name: string, value?: T): Token<T>;
    interface RegexAction<T> {
        (match: RegExpMatchArray): Token<T>;
    }
    interface RegexRule<T> extends Array<RegExp | RegexAction<T>> {
        0: RegExp;
        1: RegexAction<T>;
    }
    /**
    The type T is the type of each token value, usually `any` (the token name is
    always a string).
    
    BufferIterable
    */
    class Tokenizer<T> {
        private default_rules;
        private state_rules;
        constructor(default_rules: RegexRule<T>[], state_rules?: {
            [index: string]: RegexRule<T>[];
        });
        getRules(state_name: string): RegexRule<T>[];
        /**
        Create a closure around the iterable.
      
        Unfortunately, it seems that TypeScript doesn't like inline functions, so we
        use a helper class (TokenizerIterator).
        */
        map(iterable: BufferIterable, states?: string[]): TokenIterable<T>;
    }
    interface CombinerAction<T, U> {
        (tokens: Token<T>[]): Token<U>;
    }
    interface CombinerRule<T, U> extends Array<string | CombinerAction<T, U>> {
        0: string;
        1: CombinerAction<T, U>;
    }
    /**
    Recombine a stream of tokens using a stack of lists, e.g.,
    
        WORD:BT START:STRING CHAR:A CHAR:b CHAR:c END:STRING WORD:ET
    
    becomes:
    
        WORD:BT STRING:Abc WORD:ET
    
    */
    class Combiner<T> {
        private rules;
        constructor(rules: CombinerRule<T, T>[]);
        findRule(name: string): CombinerRule<T, T>;
        map(iterable: TokenIterable<T>, stack?: Array<Array<Token<T>>>): TokenIterable<T>;
    }
}
