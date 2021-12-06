# qclite

A QR code generator:

- Supports QR code versions 1 - 40.
- Generate QR code from binary data.

# Installation

```
yarn add qclite
```

# Getting started

import the dependency first:

```js
import { QRCode } from "qclite";
```

build your QR code:

```js
const qrcode = QRCode.fromString("hello");
const canvasElement = qrcode.renderToCanvas();
document.body.appendChild(canvasElement);
```

from hex string:

```js
document.body.appendChild(
  QRCode.fromHex("636465666768696a6b6c6d6e6f70").renderToCanvas()
);
```

from bytes:

```js
const bytes = new Uint8Array([0x63, 0x64, 0x65, 0x66]);
document.body.appendChild(QRCode.fromBytes(bytes).renderToCanvas());
```

you can specify the canvas which you want to render the QR code:

```js
const canvas = document.createElement("canvas");
[canvas.width, canvas.height] = [350, 350];
document.body.appendChild(canvas);
const qr2 = QRCode.fromString("hello");
qr2.renderToCanvas(canvas);
```

display QR code in terminal:

```js
const qr = QRCode.fromString("hello");
qr.renderToTerminal();
```

or if you want to draw custom graphics, you should do so as such:

```js
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
```

**⚠️⚠️⚠️** Please note:

The QR Code version range from 1 to 40, Higher version means more data can be stored, The default is 4, which can store up to 78 bytes of data.

```
// This may throw an error
QRcode.fromString(largeString, 1);
```
