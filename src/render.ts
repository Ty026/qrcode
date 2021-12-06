import { createBitmapData } from "./bitmapdata";
import { QRCode } from "./qrcode";

export interface Render {
  render(qrcode: QRCode): void;
}

type CanvasRenderParameter = HTMLCanvasElement | null;

export class CanvasRender implements Render {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: CanvasRenderParameter) {
    this.canvas = canvas ?? document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
  }

  render(qrcode: QRCode): HTMLCanvasElement {
    const bmpd = qrcode.bitmap;
    const { moduleCount } = bmpd;
    const maxSize = Math.min(this.canvas.width, this.canvas.height);
    const tilesize = (maxSize / moduleCount) | 0;
    const realWidth = tilesize * moduleCount;
    const startX = (this.canvas.width - realWidth) >> 1;
    const startY = (this.canvas.height - realWidth) >> 1;
    for (let y = 0; y < moduleCount; y++) {
      for (let x = 0; x < moduleCount; x++) {
        if (bmpd.isDark(x, y)) {
          this.ctx.fillRect(
            x * tilesize + startX,
            y * tilesize + startY,
            tilesize,
            tilesize
          );
        }
      }
    }
    return this.canvas;
  }
}

export class TernimalRender implements Render {
  render(qrcode: QRCode): void {
    const black = "\x1b[40m  \x1b[0m";
    const white = "\x1b[47m  \x1b[0m";
    const bmpd = qrcode.bitmap;
    const { moduleCount } = bmpd;
    for (let x = 0; x < moduleCount + 2; x++) process.stdout.write(white);
    process.stdout.write("\n");
    for (let y = 0; y < moduleCount; y++) {
      process.stdout.write(white);
      for (let x = 0; x < moduleCount; x++) {
        if (bmpd.isDark(x, y)) {
          process.stdout.write(black);
        } else {
          process.stdout.write(white);
        }
      }
      process.stdout.write(white);
      process.stdout.write("\n");
    }
    for (let x = 0; x < moduleCount + 2; x++) process.stdout.write(white);
    process.stdout.write("\n");
  }
}
