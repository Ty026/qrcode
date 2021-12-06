import { ErrorCorrectLevel, Pattern } from "./constants";
import type { QRCode } from "./qrcode";
import { bchTypeInfo, bchTypeNumber, isEven, patternPosition } from "./util";

export abstract class BaseBitmapData {
  moduleCount!: number;
  version!: number;
  ecLevel!: ErrorCorrectLevel;
  maskPattern!: number;
  abstract isDark(row: number, col: number): boolean;
}

export class BitmapData implements BaseBitmapData {
  readonly moduleCount: number;
  readonly version: number;
  readonly ecLevel: ErrorCorrectLevel;
  readonly maskPattern: number;
  private modules: boolean[][];

  constructor(internal: InternalImpl) {
    this.moduleCount = internal.moduleCount;
    this.version = internal.version;
    this.ecLevel = internal.ecLevel;
    this.maskPattern = internal.maskPattern;
    this.modules = internal.modules as boolean[][];
  }

  isDark(row: number, col: number): boolean {
    const { moduleCount, modules } = this;
    if (row < 0 || moduleCount <= row || col < 0 || moduleCount <= col) {
      throw new Error("Bad row,col: " + row + "," + col);
    }
    return modules[row][col]!;
  }
}

export class InternalImpl implements BaseBitmapData {
  moduleCount: number;
  version: number;
  ecLevel: ErrorCorrectLevel;
  maskPattern!: number;

  modules = [] as (boolean | null)[][];

  /// Generates a bmpd with the best mask pattern encoding.
  constructor(
    typeNumber: number,
    errorCorrectLevel: ErrorCorrectLevel,
    moduleCount: number,
    maskPattern: number,
    qrCode: QRCode,
    isTest: boolean
  ) {
    this.version = typeNumber;
    this.ecLevel = errorCorrectLevel;
    this.moduleCount = moduleCount;
    this.maskPattern = maskPattern;

    this.makeImple(maskPattern, qrCode.data, isTest);
  }

  isDark(row: number, col: number): boolean {
    const { moduleCount, modules } = this;
    if (row < 0 || moduleCount <= row || col < 0 || moduleCount <= col) {
      throw new Error("Bad row,col: " + row + "," + col);
    }
    return modules[row][col]!;
  }

  resetModules() {
    this.modules = [];
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules.push(Array.from({ length: this.moduleCount }, () => null));
    }
  }

  setupPositionProbePattern(row: number, col: number) {
    const { moduleCount, modules } = this;
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || moduleCount <= col + c) continue;
        const isDark =
          (0 <= r && r <= 6 && (c == 0 || c == 6)) ||
          (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4);
        modules[row + r][col + c] = isDark;
      }
    }
  }

  setupPositionAdjustPattern() {
    const { modules } = this;
    const pos = patternPosition(this.version);
    const [width, height] = [pos.length, pos.length];
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const [row, col] = [pos[i], pos[j]];
        if (modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
              modules[row + r][col + c] = true;
            } else {
              modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  setupTimingPattern() {
    const { moduleCount, modules } = this;
    for (let r = 8; r < moduleCount - 8; r++) {
      if (modules[r][6] != null) continue;
      modules[r][6] = isEven(r);
    }

    let n = [] as number[];
    for (let c = 8; c < moduleCount - 8; c++) {
      if (modules[6][c] != null) continue;
      modules[6][c] = isEven(c);
      n.push(c);
    }
  }

  setupTypeInfo(maskPattern: number, test: boolean) {
    const { modules, ecLevel: errorCorrectLevel, moduleCount } = this;
    const data = (errorCorrectLevel << 3) | maskPattern;
    const bits = bchTypeInfo(data);
    let i = 0;
    let mod = false;
    // vertical
    for (i = 0; i < 15; i++) {
      mod = !test && ((bits >> i) & 1) == 1;

      if (i < 6) {
        modules[i][8] = mod;
      } else if (i < 8) {
        modules[i + 1][8] = mod;
      } else {
        modules[moduleCount - 15 + i][8] = mod;
      }
    }
    // horizontal
    for (i = 0; i < 15; i++) {
      mod = !test && ((bits >> i) & 1) == 1;
      if (i < 8) {
        modules[8][moduleCount - i - 1] = mod;
      } else if (i < 9) {
        modules[8][15 - i - 1 + 1] = mod;
      } else {
        modules[8][15 - i - 1] = mod;
      }
    }
    // fixed module
    modules[moduleCount - 8][8] = !test;
  }

  setupTypeNumber(test: boolean) {
    const { modules, moduleCount, version: typeNumber } = this;
    const bits = bchTypeNumber(typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      modules[(i / 3) | 0][(i % 3) + moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1;
      modules[(i % 3) + moduleCount - 8 - 3][(i / 3) | 0] = mod;
    }
  }

  mapData(data: number[], maskPattern: number) {
    const { moduleCount, modules } = this;
    let inc = -1;
    let row = moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--;
      for (;;) {
        for (let c = 0; c < 2; c++) {
          if (modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >> bitIndex) & 1) == 1;
            }
            const mask = this.mask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  mask(maskPattern: number, i: number, j: number) {
    switch (maskPattern) {
      case Pattern.P000:
        return isEven(i + j);
      case Pattern.P001:
        return isEven(i);
      case Pattern.P010:
        return j % 3 == 0;
      case Pattern.P011:
        return (i + j) % 3 == 0;
      case Pattern.P100:
        return isEven(((i / 2) | 0) + ((j / 3) | 0));
      case Pattern.P101:
        return ((i * j) % 2) + ((i * j) % 3) == 0;
      case Pattern.P110:
        return isEven(((i * j) % 2) + ((i * j) % 3));
      case Pattern.P111:
        return isEven(((i * j) % 3) + ((i + j) % 2));
      default:
        throw new Error(`bad maskPattern:${maskPattern}`);
    }
  }

  makeImple(maskPattern: number, data: number[], test: boolean) {
    const { moduleCount, version: typeNumber } = this;
    this.resetModules();
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(moduleCount - 7, 0);
    this.setupPositionProbePattern(0, moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(maskPattern, test);
    if (typeNumber >= 7) {
      this.setupTypeNumber(test);
    }
    this.mapData(data, maskPattern);
  }
}

export function createBitmapData(qrCode: QRCode) {
  const { version: v, ecLevel: ecl, moduleCount: count } = qrCode;
  let bestImage: BaseBitmapData;
  let minLostPoint = 0.0;
  for (let i = 0; i < 8; i++) {
    const testImage = new InternalImpl(v, ecl, count, i, qrCode, true);
    const lost = lostPoint(testImage);
    if (i == 0 || minLostPoint > lost) {
      minLostPoint = lost;
      bestImage = testImage;
    }
  }

  return new BitmapData(
    new InternalImpl(v, ecl, count, bestImage!.maskPattern, qrCode, false)
  );
}

function lostPoint(bmpd: BaseBitmapData) {
  const moduleCount = bmpd.moduleCount;

  let lostPoint = 0.0;
  let row = 0;
  let col = 0;

  // LEVEL1
  for (row = 0; row < moduleCount; row++) {
    for (col = 0; col < moduleCount; col++) {
      let sameCount = 0;
      const dark = bmpd.isDark(row, col);

      for (let r = -1; r <= 1; r++) {
        if (row + r < 0 || moduleCount <= row + r) {
          continue;
        }

        for (let c = -1; c <= 1; c++) {
          if (col + c < 0 || moduleCount <= col + c) {
            continue;
          }

          if (r == 0 && c == 0) {
            continue;
          }

          if (dark == bmpd.isDark(row + r, col + c)) {
            sameCount++;
          }
        }
      }

      if (sameCount > 5) {
        lostPoint += 3 + sameCount - 5;
      }
    }
  }

  // LEVEL2
  for (row = 0; row < moduleCount - 1; row++) {
    for (col = 0; col < moduleCount - 1; col++) {
      let count = 0;
      if (bmpd.isDark(row, col)) count++;
      if (bmpd.isDark(row + 1, col)) count++;
      if (bmpd.isDark(row, col + 1)) count++;
      if (bmpd.isDark(row + 1, col + 1)) count++;
      if (count == 0 || count == 4) {
        lostPoint += 3;
      }
    }
  }

  // LEVEL3
  for (row = 0; row < moduleCount; row++) {
    for (col = 0; col < moduleCount - 6; col++) {
      if (
        bmpd.isDark(row, col) &&
        !bmpd.isDark(row, col + 1) &&
        bmpd.isDark(row, col + 2) &&
        bmpd.isDark(row, col + 3) &&
        bmpd.isDark(row, col + 4) &&
        !bmpd.isDark(row, col + 5) &&
        bmpd.isDark(row, col + 6)
      ) {
        lostPoint += 40;
      }
    }
  }

  for (col = 0; col < moduleCount; col++) {
    for (row = 0; row < moduleCount - 6; row++) {
      if (
        bmpd.isDark(row, col) &&
        !bmpd.isDark(row + 1, col) &&
        bmpd.isDark(row + 2, col) &&
        bmpd.isDark(row + 3, col) &&
        bmpd.isDark(row + 4, col) &&
        !bmpd.isDark(row + 5, col) &&
        bmpd.isDark(row + 6, col)
      ) {
        lostPoint += 40;
      }
    }
  }

  // LEVEL4
  let darkCount = 0;

  for (col = 0; col < moduleCount; col++) {
    for (row = 0; row < moduleCount; row++) {
      if (bmpd.isDark(row, col)) {
        darkCount++;
      }
    }
  }

  const ratio =
    Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
  return lostPoint + ratio * 10;
}
