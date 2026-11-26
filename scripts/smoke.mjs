import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(import.meta.dirname, "../dist");
const required = ["index.html", "favicon.svg"];
for (const name of required) {
  const path = resolve(dist, name);
  if (!existsSync(path)) {
    console.error(`smoke: missing ${name}`);
    process.exit(1);
  }
}
const html = readFileSync(resolve(dist, "index.html"), "utf8");
for (const needle of ["Chairmemo", "root", ".js", ".css"]) {
  if (!html.includes(needle)) {
    console.error(`smoke: index.html missing ${needle}`);
    process.exit(1);
  }
}
console.log("smoke: ok");
