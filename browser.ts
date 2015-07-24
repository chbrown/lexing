import {Buffer as LexingBuffer, Source} from './index';

declare var Buffer: {
  new (size: number): LexingBuffer;
};

export class ArrayBufferSource implements Source {
  constructor(private arrayBuffer: ArrayBuffer) { }

  get size(): number {
    return this.arrayBuffer.byteLength;
  }

  read(buffer: LexingBuffer, offset: number, length: number, position: number): number {
    var byteArray = new Uint8Array(this.arrayBuffer, position, length);
    // copy the bytes over one by one
    for (var i = 0; i < length; i++) {
      buffer[offset + i] = byteArray[i];
    }
    return length;
  }

  /**
  Same as FileSystemSource#readBuffer
  */
  readBuffer(length: number, position: number): LexingBuffer {
    var buffer = new Buffer(length);
    var bytesRead = this.read(buffer, 0, length, position);
    if (bytesRead < length) {
      buffer = buffer.slice(0, bytesRead);
    }
    return buffer;
  }
}
