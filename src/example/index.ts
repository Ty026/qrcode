import { QRCode } from "../qrcode";

async function bootstrap() {
  const qrcode = QRCode.fromString("hello worldaaaaaa", 1);
  const canvasElement = qrcode.renderToCanvas();
  document.body.appendChild(canvasElement);

  document.body.appendChild(
    QRCode.fromHex("636465666768696a6b6c6d6e6f70").renderToCanvas()
  );

  const bytes = new Uint8Array([
    0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e,
    0x6f, 0x70,
  ]);
  document.body.appendChild(QRCode.fromBytes(bytes).renderToCanvas());

  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = [350, 350];
  document.body.appendChild(canvas);
  const qr2 = QRCode.fromString("hello");
  qr2.renderToCanvas(canvas);

  function renderToTerminal() {
    const qr = QRCode.fromString("hello");
    qr.renderToTerminal();
  }

  const qr = QRCode.fromString("hello");
  const bmpd = qr.bitmap;
  const table = document.createElement("table");
  table.style.borderSpacing = "0";
  document.body.appendChild(table);

  for (let y = 0; y < bmpd.moduleCount; y++) {
    const row = document.createElement("tr");
    table.appendChild(row);
    for (let x = 0; x < bmpd.moduleCount; x++) {
      const td = document.createElement("td");
      td.style.width = td.style.height = "5px";
      if (bmpd.isDark(y, x)) td.style.backgroundColor = "#000";
      else td.style.backgroundColor = "#fff";
      row.appendChild(td);
    }
  }
}
bootstrap();
