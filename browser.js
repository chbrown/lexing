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
    return ArrayBufferSource;
})();
exports.ArrayBufferSource = ArrayBufferSource;
