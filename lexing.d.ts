/// <reference path="../../type_declarations/DefinitelyTyped/node/node.d.ts" />
declare module "lexing" {
    interface Reader {
        /**
        Reads a single byte.
        */
        readByte(): number;
        /**
        Reads a series of bytes.
        */
        readBuffer(length: number): Buffer;
    }
    interface BufferedReader extends Reader {
        peekByte(): number;
        peekBuffer(length: number): Buffer;
        skip(length: number): number;
    }
    class BufferedBufferReader implements BufferedReader {
        private buffer;
        constructor(buffer: Buffer);
        peekByte(): number;
        peekBuffer(length: number): Buffer;
        readByte(): number;
        readBuffer(length: number): Buffer;
        /**
        Skip over the next `length` characters, returning the number of skipped
        characters (which may be < `length` iff EOF has been reached).
        */
        skip(length: number): number;
        toString(): string;
    }
    class BufferedStringReader extends BufferedBufferReader {
        constructor(input: string, encoding?: string);
    }
    /**
    Provide buffered (and Buffer-friendly) access to a file.
    */
    class BufferedFileReader implements BufferedReader {
        private fd;
        private file_position;
        static BLOCK_SIZE: number;
        private buffer;
        constructor(fd: number, file_position?: number);
        static open(filepath: string): BufferedFileReader;
        close(): void;
        /**
        Return the position in the file that would be read from if we called
        readBuffer(...). This is different from the internally-held position, which
        points to the end of the currently held buffer.
        */
        position: number;
        /**
        Calls fs.readSync on the underlying file descriptor with pretty much the same
        argument signature.
      
        Returns `bytesRead`, the number of bytes that were read into the given Buffer.
      
        Node.js documentation for fs.read() / fs.readSync():
        > position is an integer specifying where to begin reading from in the file.
        > If position is null, data will be read from the current file position.
        */
        read(buffer: Buffer, offset: number, length: number, position: number): number;
        /**
        Ensure that the available buffer is at least `length` bytes long.
      
        This may return without the condition being met of this.buffer.length >= length,
        if the end of the underlying file has been reached.
        */
        private ensureLength(length);
        /**
        Read data from the underlying file and append it to the buffer.
      
        Returns false iff EOF has been reached, otherwise returns true. */
        private fillBuffer(length);
        peekByte(): number;
        peekBuffer(length: number): Buffer;
        readByte(): number;
        readBuffer(length: number): Buffer;
        /**
        Skip over the next `length` characters, returning the number of skipped
        characters (which may be < `length` iff EOF has been reached).
        */
        skip(length: number): number;
    }
    interface RuleAction<T> {
        (match: RegExpMatchArray): [string, T];
    }
    interface Rule<T> extends Array<RegExp | RuleAction<T>> {
        0: RegExp;
        1: RuleAction<T>;
    }
    class BufferedLexer<T> {
        private default_rules;
        private state_rules;
        reader: BufferedReader;
        states: string[];
        constructor(default_rules: Rule<T>[], state_rules: {
            [index: string]: Rule<T>[];
        });
        /**
        Reset the Lexer back to its initial state.
        */
        reset(): void;
        /**
        Returns the next available pair from the input reader (usually [token, data]).
      
        If the matching rule's action returns null, this will return null.
        */
        read(): T;
        /**
        Returns the next available non-null token / symbol output from the input
        reader (usually a token_data: [string, any] tuple).
      
        This will never return null.
        */
        next(): T;
    }
}
