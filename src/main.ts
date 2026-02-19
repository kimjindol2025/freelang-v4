#!/usr/bin/env node
// FreeLang v4 — CLI Entry Point

import * as fs from "fs";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";
import { Compiler } from "./compiler";
import { VM } from "./vm";

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log("FreeLang v4 — AI-First Programming Language");
    console.log("Usage: freelang <file.fl> [options]");
    console.log("");
    console.log("Options:");
    console.log("  --no-check   타입 체크 건너뛰기");
    console.log("  --dump-bc    바이트코드 덤프");
    console.log("  --help       도움말");
    process.exit(0);
  }

  const file = args[0];
  const noCheck = args.includes("--no-check");
  const dumpBc = args.includes("--dump-bc");

  // 파일 읽기
  let source: string;
  try {
    source = fs.readFileSync(file, "utf-8");
  } catch {
    console.error(`error: cannot read file '${file}'`);
    process.exit(1);
  }

  // 1. Lexer
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) {
    for (const e of lexErrors) {
      console.error(`${file}:${e.line}: lex error: ${e.message}`);
    }
    process.exit(1);
  }

  // 2. Parser
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) {
    for (const e of parseErrors) {
      console.error(`${file}:${e.line}: parse error: ${e.message}`);
    }
    process.exit(1);
  }

  // 3. TypeChecker (optional)
  if (!noCheck) {
    const checkErrors = new TypeChecker().check(program);
    if (checkErrors.length > 0) {
      for (const e of checkErrors) {
        console.error(`${file}:${e.line}: type error: ${e.message}`);
      }
      process.exit(1);
    }
  }

  // 4. Compiler
  const chunk = new Compiler().compile(program);

  if (dumpBc) {
    console.log(`--- bytecode (${chunk.code.length} bytes, ${chunk.functions.length} functions) ---`);
    console.log(`constants: ${JSON.stringify(chunk.constants)}`);
    for (const fn of chunk.functions) {
      console.log(`fn ${fn.name}(arity=${fn.arity}) @ offset ${fn.offset}`);
    }
    process.exit(0);
  }

  // 5. VM 실행
  const { output, error } = new VM().run(chunk);

  for (const line of output) {
    console.log(line);
  }

  if (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
