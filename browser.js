var ArrayBufferSource = (function () {
    function ArrayBufferSource(arrayBuffer) {
        this.arrayBuffer = arrayBuffer;
    }
    Object.defineProperty(ArrayBufferSource.prototype, "size", {
        get: function () {
            return this.arrayBuffer.byteLength;
        },
        enumerable: true,
        configurable: true
    });
    ArrayBufferSource.prototype.read = function (buffer, offset, length, position) {
        var byteArray = new Uint8Array(this.arrayBuffer, position, length);
        // copy the bytes over one by one
        for (var i = 0; i < length; i++) {
            buffer[offset + i] = byteArray[i];
        }
        return length;
    };
    /**
    Same as FileSystemSource#readBuffer
    */
    ArrayBufferSource.prototype.readBuffer = function (length, position) {
        var buffer = new Buffer(length);
        var bytesRead = this.read(buffer, 0, length, position);
        if (bytesRead < length) {
            buffer = buffer.slice(0, bytesRead);
        }
        return buffer;
    };
    return ArrayBufferSource;
})();
exports.ArrayBufferSource = ArrayBufferSource;
