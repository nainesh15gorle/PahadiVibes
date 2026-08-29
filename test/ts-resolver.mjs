// test/ts-resolver.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const parentURL = context.parentURL;
    if (parentURL && parentURL.startsWith("file:")) {
      const parentPath = fileURLToPath(parentURL);
      const targetPath = path.resolve(path.dirname(parentPath), specifier);

      if (fs.existsSync(targetPath + ".ts")) {
        return {
          url: pathToFileURL(targetPath + ".ts").href,
          shortCircuit: true
        };
      }
      if (fs.existsSync(path.join(targetPath, "index.ts"))) {
        return {
          url: pathToFileURL(path.join(targetPath, "index.ts")).href,
          shortCircuit: true
        };
      }
    }
  }
  return nextResolve(specifier, context);
}
