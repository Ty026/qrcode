import { gexp, glog } from "./util";

export class Polynomial {
  values: Uint8Array;

  get length() {
    return this.values.length;
  }

  get(index: number) {
    return this.values[index];
  }

  constructor(thing: number[] | Uint8Array, shift: number = 0) {
    this.values = new Uint8Array(thing);
    let offset = 0;
    while (offset < thing.length && thing[offset] == 0) {
      offset++;
    }
    const values = new Uint8Array(thing.length - offset + shift);
    for (let i = 0; i < thing.length - offset; i++) {
      values[i] = thing[i + offset];
    }
    this.values = values;
  }

  multiply(poly: Polynomial) {
    const foo = new Uint8Array(this.length + poly.length - 1);
    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < poly.length; j++) {
        foo[i + j] ^= gexp(glog(this.get(i)) + glog(poly.get(j)));
      }
    }
    return new Polynomial(foo, 0);
  }

  mod(poly: Polynomial): Polynomial {
    const { length } = this;
    if (length - poly.length < 0) return this;
    const ratio = glog(this.get(0)) - glog(poly.get(0));
    const value = new Uint8Array(length);
    for (let i = 0; i < length; i++) value[i] = this.get(i);
    for (let i = 0; i < poly.length; i++) {
      value[i] ^= gexp(glog(poly.get(i)) + ratio);
    }
    // recursive call
    return new Polynomial(value, 0).mod(poly);
  }
}
