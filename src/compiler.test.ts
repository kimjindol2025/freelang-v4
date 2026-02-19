// FreeLang v4 — Compiler 테스트

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Compiler, Chunk, Op } from "./compiler";

function compile(source: string): Chunk {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex: ${lexErrors[0].message}`);
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) throw new Error(`Parse: ${parseErrors[0].message}`);
  return new Compiler().compile(program);
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

function findOp(chunk: Chunk, op: Op): boolean {
  return chunk.code.includes(op);
}

function countOp(chunk: Chunk, op: Op): number {
  return chunk.code.filter((b) => b === op).length;
}

// ============================================================
// 1. 상수 로드
// ============================================================

console.log("=== 상수 로드 ===");

{
  const c = compile("42");
  assert(findOp(c, Op.PUSH_I32), "PUSH_I32 존재");
  assert(findOp(c, Op.HALT), "HALT 존재");
  console.log("  ✅ 정수 리터럴");
}

{
  const c = compile("3.14");
  assert(findOp(c, Op.PUSH_F64), "PUSH_F64 존재");
  console.log("  ✅ 부동소수점 리터럴");
}

{
  const c = compile('"hello"');
  assert(findOp(c, Op.PUSH_STR), "PUSH_STR 존재");
  assert(c.constants.includes("hello"), "상수 테이블에 hello");
  console.log("  ✅ 문자열 리터럴");
}

{
  const c = compile("true");
  assert(findOp(c, Op.PUSH_TRUE), "PUSH_TRUE 존재");
  console.log("  ✅ true");
}

{
  const c = compile("false");
  assert(findOp(c, Op.PUSH_FALSE), "PUSH_FALSE 존재");
  console.log("  ✅ false");
}

// ============================================================
// 2. 산술 연산
// ============================================================

console.log("=== 산술 연산 ===");

{
  const c = compile("1 + 2");
  assert(findOp(c, Op.ADD_I32), "ADD_I32 존재");
  console.log("  ✅ 1 + 2");
}

{
  const c = compile("3 - 1");
  assert(findOp(c, Op.SUB_I32), "SUB_I32 존재");
  console.log("  ✅ 3 - 1");
}

{
  const c = compile("2 * 3");
  assert(findOp(c, Op.MUL_I32), "MUL_I32 존재");
  console.log("  ✅ 2 * 3");
}

{
  const c = compile("6 / 2");
  assert(findOp(c, Op.DIV_I32), "DIV_I32 존재");
  console.log("  ✅ 6 / 2");
}

{
  const c = compile("7 % 3");
  assert(findOp(c, Op.MOD_I32), "MOD_I32 존재");
  console.log("  ✅ 7 % 3");
}

// ============================================================
// 3. 비교 + 논리
// ============================================================

console.log("=== 비교 + 논리 ===");

{
  const c = compile("1 == 2");
  assert(findOp(c, Op.EQ), "EQ 존재");
  console.log("  ✅ ==");
}

{
  const c = compile("1 != 2");
  assert(findOp(c, Op.NEQ), "NEQ 존재");
  console.log("  ✅ !=");
}

{
  const c = compile("1 < 2");
  assert(findOp(c, Op.LT), "LT 존재");
  console.log("  ✅ <");
}

{
  const c = compile("true && false");
  assert(findOp(c, Op.AND), "AND 존재");
  console.log("  ✅ &&");
}

{
  const c = compile("true || false");
  assert(findOp(c, Op.OR), "OR 존재");
  console.log("  ✅ ||");
}

// ============================================================
// 4. 단항 연산
// ============================================================

console.log("=== 단항 연산 ===");

{
  const c = compile("-42");
  assert(findOp(c, Op.NEG_I32), "NEG_I32 존재");
  console.log("  ✅ -42");
}

{
  const c = compile("!true");
  assert(findOp(c, Op.NOT), "NOT 존재");
  console.log("  ✅ !true");
}

// ============================================================
// 5. 변수
// ============================================================

console.log("=== 변수 ===");

{
  const c = compile("var x = 42");
  assert(findOp(c, Op.PUSH_I32), "PUSH_I32");
  assert(findOp(c, Op.STORE_LOCAL), "STORE_LOCAL");
  console.log("  ✅ var x = 42");
}

{
  const c = compile("var x = 42\nx");
  assert(findOp(c, Op.LOAD_LOCAL), "LOAD_LOCAL");
  console.log("  ✅ var x = 42; x (load)");
}

{
  const c = compile("var x = 1\nx = 2");
  assert(countOp(c, Op.STORE_LOCAL) >= 2, "STORE_LOCAL 2번 이상");
  console.log("  ✅ x = 2 (assign)");
}

// ============================================================
// 6. 함수
// ============================================================

console.log("=== 함수 ===");

{
  const c = compile("fn add(a: i32, b: i32): i32 { return a + b }");
  assert(c.functions.length === 1, "함수 1개 등록");
  assert(c.functions[0].name === "add", "name = add");
  assert(c.functions[0].arity === 2, "arity = 2");
  assert(c.functions[0].offset > 0, "offset > 0");
  console.log("  ✅ fn add 등록");
}

{
  const c = compile(`fn add(a: i32, b: i32): i32 { return a + b }
add(1, 2)`);
  assert(findOp(c, Op.CALL), "CALL 존재");
  assert(findOp(c, Op.RETURN), "RETURN 존재");
  console.log("  ✅ fn add + call");
}

// ============================================================
// 7. 내장 함수
// ============================================================

console.log("=== 내장 함수 ===");

{
  const c = compile('println("hello")');
  assert(findOp(c, Op.CALL_BUILTIN), "CALL_BUILTIN 존재");
  assert(c.constants.includes("println"), "상수에 println");
  console.log("  ✅ println → CALL_BUILTIN");
}

{
  const c = compile("range(0, 10)");
  assert(findOp(c, Op.CALL_BUILTIN), "CALL_BUILTIN");
  assert(c.constants.includes("range"), "상수에 range");
  console.log("  ✅ range → CALL_BUILTIN");
}

// ============================================================
// 8. if 문
// ============================================================

console.log("=== if 문 ===");

{
  const c = compile('if true { println("yes") }');
  assert(findOp(c, Op.JUMP_IF_FALSE), "JUMP_IF_FALSE 존재");
  console.log("  ✅ if → JUMP_IF_FALSE");
}

{
  const c = compile('if true { println("yes") } else { println("no") }');
  assert(findOp(c, Op.JUMP_IF_FALSE), "JUMP_IF_FALSE");
  assert(findOp(c, Op.JUMP), "JUMP");
  console.log("  ✅ if...else → JUMP_IF_FALSE + JUMP");
}

// ============================================================
// 9. for 문
// ============================================================

console.log("=== for 문 ===");

{
  const c = compile("for x in [1, 2, 3] { println(str(x)) }");
  assert(findOp(c, Op.ARRAY_NEW), "ARRAY_NEW");
  assert(findOp(c, Op.ARRAY_GET), "ARRAY_GET");
  assert(findOp(c, Op.JUMP), "JUMP (loop back)");
  assert(findOp(c, Op.JUMP_IF_FALSE), "JUMP_IF_FALSE (exit)");
  console.log("  ✅ for...in → loop 구조");
}

// ============================================================
// 10. 배열
// ============================================================

console.log("=== 배열 ===");

{
  const c = compile("[1, 2, 3]");
  assert(findOp(c, Op.ARRAY_NEW), "ARRAY_NEW");
  console.log("  ✅ [1, 2, 3] → ARRAY_NEW");
}

// ============================================================
// 11. 구조체
// ============================================================

console.log("=== 구조체 ===");

{
  const c = compile("var p = { x: 1, y: 2 }");
  assert(findOp(c, Op.STRUCT_NEW), "STRUCT_NEW");
  console.log("  ✅ { x: 1, y: 2 } → STRUCT_NEW");
}

// ============================================================
// 12. return
// ============================================================

console.log("=== return ===");

{
  const c = compile("fn f(): i32 { return 42 }");
  assert(findOp(c, Op.RETURN), "RETURN 존재");
  console.log("  ✅ return 42 → RETURN");
}

// ============================================================
// 13. spawn
// ============================================================

console.log("=== spawn ===");

{
  const c = compile('spawn { println("actor") }');
  assert(findOp(c, Op.SPAWN), "SPAWN 존재");
  console.log("  ✅ spawn → SPAWN");
}

// ============================================================
// 14. match
// ============================================================

console.log("=== match ===");

{
  const c = compile(`match 42 {
  0 => println("zero")
  _ => println("other")
}`);
  assert(findOp(c, Op.DUP), "DUP 존재 (subject 복제)");
  assert(findOp(c, Op.JUMP_IF_FALSE), "JUMP_IF_FALSE (pattern miss)");
  console.log("  ✅ match → DUP + pattern test");
}

// ============================================================
// 15. 통합 — HALT
// ============================================================

console.log("=== 통합 ===");

{
  const c = compile(`fn factorial(n: i32): i32 {
  if n <= 1 {
    return 1
  }
  return n * factorial(n + -1)
}
var result = factorial(5)
println(str(result))`);
  assert(findOp(c, Op.HALT), "HALT");
  assert(findOp(c, Op.CALL), "CALL (factorial)");
  assert(findOp(c, Op.CALL_BUILTIN), "CALL_BUILTIN (println)");
  assert(c.functions.length === 1, "1 function");
  console.log("  ✅ factorial 통합");
}

{
  const c = compile(`fn sum(arr: [i32]): i32 {
  var total: i32 = 0
  for x in arr {
    total = total + x
  }
  return total
}
var nums = [1, 2, 3, 4, 5]
println(str(sum(nums)))`);
  assert(findOp(c, Op.HALT), "HALT");
  assert(c.functions.length === 1, "1 function");
  console.log("  ✅ sum 통합");
}

// 코드 크기 확인
{
  const c = compile('println("hello")');
  assert(c.code.length > 0, "코드 생성됨");
  assert(c.code.length < 100, "단순 코드 < 100 바이트");
  console.log(`  ✅ println 바이트코드 크기: ${c.code.length} bytes`);
}

// ============================================================
// 결과
// ============================================================

console.log(`\n=== 결과: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
