export enum ErrorCorrectLevel {
  // these are in order of lowest to highest quality...I think
  // all I know for sure: you can create longer messages w/ item N than N+1
  // I assume this correcsponds to more error correction for N+1
  L = 1,
  M = 0,
  Q = 3,
  H = 2,
}

export enum QRCodeMode {
  Number = 1 << 0,
  AlphaNumeric = 1 << 1,
  Bit8 = 1 << 2,
  Kanji = 1 << 3,
}

export enum Pattern {
  P000 = 0,
  P001 = 1,
  P010 = 2,
  P011 = 3,
  P100 = 4,
  P101 = 5,
  P110 = 6,
  P111 = 7,
}

export const PAD0 = 0xec;
export const PAD1 = 0x11;
