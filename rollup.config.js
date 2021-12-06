import simpleTs from "@rollup/plugin-typescript";
import { promises as fsp } from "fs";
import del from "del";

const isProduction = !!process.env.production;
export default async function ({ watch }) {
  await del("dist");
  const tsInstance = simpleTs();
  const dir = "dist";
  const config = {
    input: {
      example: "src/example/index.ts",
    },
    output: {
      dir,
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    plugins: [tsInstance, writeFile(dir + "/index.html")],
  };
  if (isProduction) {
    config.input = {
      qrcode: "src/qrcode.ts",
    };
    config.output.dir = "dist";
    config.output.format = "cjs";
  }
  return config;
}

function writeFile(path) {
  return {
    name: "run-script",
    async writeBundle() {
      const template = `<!DOCTYPE html>
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          canvas {
            min-width: 350px;
          }
        </style>
      </head>
      <body></body>
      <script type="module">import "./example.js";</script>
    </html>`;
      await fsp.writeFile(path, template, "utf8");
    },
  };
}
