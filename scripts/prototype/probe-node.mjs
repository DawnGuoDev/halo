import { readFileSync } from "node:fs";

const { engines } = JSON.parse(readFileSync("package.json", "utf8"));
const minimum = engines.node.match(/>=\s*(\d+\.\d+\.\d+)/)?.[1];
if (!minimum) {
  throw new Error("ui/package.json must declare a minimum Node.js version");
}
const parse = (value) => value.replace(/^v/, "").split(".").map(Number);
const current = parse(process.version);
const required = parse(minimum);
for (let index = 0; index < 3; index += 1) {
  if (current[index] > required[index]) {
    console.log(process.version);
    process.exit(0);
  }
  if (current[index] < required[index]) {
    console.error(`Node.js ${minimum} or newer is required; found ${process.version}`);
    process.exit(1);
  }
}
console.log(process.version);
