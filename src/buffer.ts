export class BitBuffer {
  private _length = 0;
  get length() {
    return this._length;
  }
  private buffer: number[] = [];

  put(n: number, size: number) {
    for (let i = 0; i < size; i++) {
      const bit = ((n >> (size - i - 1)) & 1) == 1;
      this.putBit(bit);
    }
  }

  putBit(bit: boolean) {
    const { _length, buffer } = this;
    const bufIndex = (_length / 8) | 0;
    if (buffer.length <= bufIndex) {
      buffer.push(0);
    }
    if (bit) buffer[bufIndex] |= 0x80 >> _length % 8;
    this._length++;
  }

  get(index: number) {
    const bufIndex = (index / 8) | 0;
    return ((this.buffer[bufIndex] >> (7 - (index % 8))) & 1) == 1;
  }

  toString() {
    let r = [] as boolean[];
    for (let i = 0; i < this._length; i++) {
      r.push(this.get(i));
    }
    return r;
  }
  getByte(index: number) {
    return this.buffer[index];
  }
}
