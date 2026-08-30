// test/ts-resolver.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const workspaceRoot = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return {
      url: "data:text/javascript,export const cookies = async () => ({ get: () => null, set: () => {}, delete: () => {} }); export const headers = async () => new Headers();",
      shortCircuit: true
    };
  }

  let targetPath = null;
  if (specifier.startsWith("@/")) {
    targetPath = path.resolve(workspaceRoot, "src", specifier.slice(2));
  } else if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const parentURL = context.parentURL;
    if (parentURL && parentURL.startsWith("file:")) {
      const parentPath = fileURLToPath(parentURL);
      targetPath = path.resolve(path.dirname(parentPath), specifier);
    }
  }

  if (targetPath) {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      return {
        url: pathToFileURL(targetPath).href,
        shortCircuit: true
      };
    }
    const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
    for (const ext of extensions) {
      const fullPath = targetPath.endsWith("/") ? targetPath.slice(0, -1) + ext : targetPath + ext;
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        return {
          url: pathToFileURL(fullPath).href,
          shortCircuit: true
        };
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:")) {
    const filePath = fileURLToPath(url);
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      const source = fs.readFileSync(filePath, "utf8");
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true
        },
        fileName: filePath
      });
      return {
        format: "module",
        shortCircuit: true,
        source: transpiled.outputText
      };
    }
  }
  return nextLoad(url, context);
}

