import { BitBuffer } from "./buffer";
import { QRCodeMode } from "./constants";

export interface Datum {
  readonly mode: number;
  readonly length: number;
  write(buffer: BitBuffer): void;
}

const isUint8Array = (value: any): value is Uint8Array =>
  Object.prototype.toString.call(value) === "[object Uint8Array]";

function textEncode(text: string) {
  if ("TextEncoder" in globalThis) {
    return new TextEncoder().encode(text);
    // Browser
  } else if ("Buffer" in globalThis) {
    return new Uint8Array(Buffer.from(text, "utf8").buffer);
  } else {
    throw new Error("Unsupported environment");
  }
}

export class Bytes implements Datum {
  readonly mode = QRCodeMode.Bit8;
  get length() {
    return this.data.length;
  }

  private constructor(private readonly data: Uint8Array) {}

  write(buffer: BitBuffer): void {
    this.data.forEach((n) => buffer.put(n, 8));
  }

  static fromString(input: string): Bytes {
    return new Bytes(textEncode(input));
  }

  static fromBuffer(input: Uint8Array): Bytes {
    if (!isUint8Array(input)) throw new Error("input must be a Uint8Array.");
    return new Bytes(input);
  }
}
