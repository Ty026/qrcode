const patternPositionTable = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

export function patternPosition(typeNumber: number) {
  return patternPositionTable[typeNumber - 1];
}

export function isEven(n: number) {
  return (n & 1) === 0;
}

export function isHexString(str: string) {
  if (str.length % 2 !== 0) return false;
  return /^[0-9a-fA-F]+$/.test(str);
}

const bchDigit = (data: number) => {
  let digit = 0;
  while (data != 0) {
    digit++;
    data >>= 1;
  }
  return digit;
};

const g15 =
  (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);

const g15Mask = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
const g18 =
  (1 << 12) |
  (1 << 11) |
  (1 << 10) |
  (1 << 9) |
  (1 << 8) |
  (1 << 5) |
  (1 << 2) |
  (1 << 0);

export function bchTypeInfo(data: number) {
  let d = data << 10;
  while (bchDigit(d) - bchDigit(g15) >= 0) {
    d ^= g15 << (bchDigit(d) - bchDigit(g15));
  }
  return ((data << 10) | d) ^ g15Mask;
}

export function bchTypeNumber(data: number) {
  let d = data << 12;
  while (bchDigit(d) - bchDigit(g18) >= 0) {
    d ^= g18 << (bchDigit(d) - bchDigit(g18));
  }
  return (data << 12) | d;
}

const expTable = createExpTable();
const logTable = createLogTable();

function createExpTable() {
  const list = new Uint8Array(256);
  for (let i = 0; i < 8; i++) list[i] = 1 << i;
  for (let i = 8; i < 256; i++)
    list[i] = list[i - 4] ^ list[i - 5] ^ list[i - 6] ^ list[i - 8];
  return list;
}

function createLogTable() {
  const list = new Uint8Array(256);
  for (let i = 0; i < 255; i++) list[expTable[i]] = i;
  return list;
}

export function glog(n: number) {
  if (n < 1) {
    throw Error(`glog(${n})`);
  }
  return logTable[n];
}

export function gexp(n: number) {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return expTable[n];
}
