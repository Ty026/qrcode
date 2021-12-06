import { BitBuffer } from "./buffer";
import { Bytes, Datum } from "./byte";
import { Polynomial } from "./polynomial";
import { getBlocks, Block } from "./block";
import {
  QRCodeMode,
  PAD0,
  PAD1,
  ErrorCorrectLevel as ECLevel,
} from "./constants";
import { isEven, gexp, isHexString } from "./util";
import { CanvasRender, TernimalRender } from "./render";
import { BitmapData, createBitmapData } from "./bitmapdata";

export class QRCode {
  readonly moduleCount: number = 0;
  private dataList: Datum[] = [];

  constructor(readonly version = 4, readonly ecLevel = ECLevel.L) {
    // range of version is 1-40
    if (version < 1 || version > 40)
      throw new Error("typeNumber should be between 1 and 40");

    // range of errorCorrectLevel is [0,3]
    if (ecLevel < 0 || ecLevel > 3)
      throw new Error("errorCorrectLevel should be between 0 and 3");
    this.moduleCount = version * 4 + 17;
  }

  _data: number[] | null = null;
  get data() {
    const { version, ecLevel, dataList } = this;
    return (this._data ??= createData(version, ecLevel, dataList));
  }

  _bmpd: BitmapData | null = null;
  get bitmap() {
    if (this._data === null) {
      this._bmpd = createBitmapData(this);
    }
    return (this._bmpd ??= createBitmapData(this));
  }

  addData(data: string) {
    this.dataList.push(Bytes.fromString(data));
    this._data = null;
  }

  addByteData(data: Uint8Array) {
    this.dataList.push(Bytes.fromBuffer(data));
    this._data = null;
  }

  // TODO: add kanji and alphanumeric mode

  renderToCanvas(canvas?: HTMLCanvasElement) {
    const render = new CanvasRender(canvas ?? null);
    return render.render(this);
  }

  renderToTerminal() {
    const render = new TernimalRender();
    render.render(this);
  }

  static fromString(data: string, version = 4, ecLevel = ECLevel.L) {
    const qr = new QRCode(version, ecLevel);
    qr.addData(data);
    return qr;
  }

  static fromBytes(data: Uint8Array, version = 4, ecLevel = ECLevel.L) {
    const qr = new QRCode(version, ecLevel);
    qr.addByteData(data);
    return qr;
  }

  static fromHex(hex: string, version = 4, ecLevel = ECLevel.L) {
    // if the passed in string is not a hex string, throw an error
    if (!isHexString(hex)) throw new Error(`${hex} is not a valid hex string`);

    // convert the hex string to a uint8 array
    const size = (hex.length / 2) | 0;
    const data = new Uint8Array(size);
    // TODO:
    // loop through the string and convert each two character to a byte
    // this is a little slow for large strings
    // may be there is a better way to do this?
    for (let i = 0; i < size; i++) {
      data[i] = parseInt(hex.substr(i * 2, 2), 16);
    }

    const qr = new QRCode(version, ecLevel);
    qr.addByteData(data);
    return qr;
  }
}

function createData(version: number, ecLevel: ECLevel, dataList: Datum[]) {
  const rsBlocks = getBlocks(version, ecLevel);
  const buffer = new BitBuffer();

  for (let i = 0; i < dataList.length; i++) {
    const data = dataList[i];
    buffer.put(data.mode, 4);

    buffer.put(data.length, bitLength(data.mode, version));
    data.write(buffer);
  }

  let totalDataCount = 0;
  for (let i = 0; i < rsBlocks.length; i++) {
    totalDataCount += rsBlocks[i].dataCount;
  }
  const totalByteCount = totalDataCount * 8;

  if (buffer.length > totalByteCount) {
    throw new Error(
      `code length overflow ${buffer.length} > ${totalByteCount}`
    );
  }

  if (buffer.length + 4 <= totalByteCount) {
    buffer.put(0, 4);
  }
  // padding
  while (buffer.length % 8 != 0) {
    buffer.putBit(false);
  }
  // padding
  const bitDataCount = totalDataCount * 8;
  let count = 0;
  while (true) {
    if (buffer.length >= bitDataCount) break;
    buffer.put(isEven(count++) ? PAD0 : PAD1, 8);
  }
  return createBytes(buffer, rsBlocks);
}

function createBytes(buffer: BitBuffer, blocks: Block[]) {
  let offset = 0;
  let maxDcCount = 0;
  let maxEcCount = 0;
  let dcData = [] as any[];
  let ecData = [] as any[];
  for (let r = 0; r < blocks.length; r++) {
    const dcCount = blocks[r].dataCount;
    const ecCount = blocks[r].totalCount - dcCount;
    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);
    const dcItem = (dcData[r] = new Uint8Array(dcCount));
    for (let i = 0; i < dcItem.length; i++) {
      dcItem[i] = 0xff & buffer.getByte(i + offset);
    }
    offset += dcCount;
    const rsPoly = errorCorrectPolynomial(ecCount);
    const rawPoly = new Polynomial(dcItem, rsPoly.length - 1);
    const modPoly = rawPoly.mod(rsPoly);
    const ecItem = (ecData[r] = new Uint8Array(rsPoly.length - 1));
    for (let i = 0; i < ecItem.length; i++) {
      const modIndex = i + modPoly.length - ecItem.length;
      ecItem[i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
  }
  const data = [] as number[];
  for (let i = 0; i < maxDcCount; i++) {
    for (let r = 0; r < blocks.length; r++) {
      if (i < dcData[r]!.length) {
        data.push(dcData[r]![i]);
      }
    }
  }
  for (let i = 0; i < maxEcCount; i++) {
    for (let r = 0; r < blocks.length; r++) {
      if (i < ecData[r]!.length) {
        data.push(ecData[r]![i]);
      }
    }
  }
  return data;
}

function bitLength(mode: number, type: number) {
  if (1 <= type && type < 10) {
    // 1 - 9
    switch (mode) {
      case QRCodeMode.Number:
        return 10;
      case QRCodeMode.AlphaNumeric:
        return 9;
      case QRCodeMode.Bit8:
        return 8;
      case QRCodeMode.Kanji:
        return 8;
      default:
        throw new Error(`mode:${mode}`);
    }
  } else if (type < 27) {
    // 10 - 26
    switch (mode) {
      case QRCodeMode.Number:
        return 12;
      case QRCodeMode.AlphaNumeric:
        return 11;
      case QRCodeMode.Bit8:
        return 16;
      case QRCodeMode.Kanji:
        return 10;
      default:
        throw new Error(`mode:${mode}`);
    }
  } else if (type < 41) {
    // 27 - 40
    switch (mode) {
      case QRCodeMode.Number:
        return 14;
      case QRCodeMode.AlphaNumeric:
        return 13;
      case QRCodeMode.Bit8:
        return 16;
      case QRCodeMode.Kanji:
        return 12;
      default:
        throw new Error(`mode:${mode}`);
    }
  } else {
    throw new Error(`type:${type}`);
  }
}

function errorCorrectPolynomial(ecLevel: number) {
  let poly = new Polynomial([1], 0);
  for (let i = 0; i < ecLevel; i++) {
    poly = poly.multiply(new Polynomial([1, gexp(i)], 0));
  }
  return poly;
}
