/// <reference path="type_declarations/DefinitelyTyped/node/node.d.ts" />
var fs_1 = require('fs');
var FileSystemSource = (function () {
    /**
    `fd` refers to an open file descriptor available to the current process.
    */
    function FileSystemSource(fd) {
        this.fd = fd;
    }
    FileSystemSource.open = function (path) {
        var fd = fs_1.openSync(path, 'r');
        return new FileSystemSource(fd);
    };
    Object.defineProperty(FileSystemSource.prototype, "size", {
        get: function () {
            return fs_1.fstatSync(this.fd).size;
        },
        enumerable: true,
        configurable: true
    });
    /**
    Calls fs.readSync on the underlying file descriptor with pretty much the same
    argument signature.
  
    Returns `bytesRead`, the number of bytes that were read into the given Buffer.
  
    Node.js documentation for fs.read() / fs.readSync():
    > position is an integer specifying where to begin reading from in the file.
    > If position is null, data will be read from the current file position.
    */
    FileSystemSource.prototype.read = function (buffer, offset, length, position) {
        return fs_1.readSync(this.fd, buffer, offset, length, position);
    };
    /**
    Read a `length` bytes of the underlying file as a Buffer. May return a
    Buffer shorter than `length` iff EOF has been reached.
    */
    FileSystemSource.prototype.readBuffer = function (length, position) {
        var buffer = new Buffer(length);
        var bytesRead = this.read(buffer, 0, length, position);
        if (bytesRead < length) {
            buffer = buffer.slice(0, bytesRead);
        }
        return buffer;
    };
    FileSystemSource.prototype.close = function () {
        fs_1.closeSync(this.fd);
    };
    return FileSystemSource;
})();
exports.FileSystemSource = FileSystemSource;
