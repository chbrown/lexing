import {Buffer, Source} from './index';

export class ArrayBufferSource implements Source {
  constructor(private arrayBuffer: ArrayBuffer) { }

  get size(): number {
    return this.arrayBuffer.byteLength;
  }

  read(buffer: Buffer, offset: number, length: number, position: number): number {
    var byteArray = new Uint8Array(this.arrayBuffer, position, length);
    // copy the bytes over one by one
    for (var i = 0; i < length; i++) {
      buffer[offset + i] = byteArray[i];
    }
    return length;
  }
}
