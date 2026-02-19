// FreeLang v4 — Parser 테스트

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Stmt, Expr } from "./ast";

function parse(source: string): { stmts: Stmt[]; errors: string[] } {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex error: ${lexErrors[0].message}`);
  const { program, errors } = new Parser(tokens).parse();
  return { stmts: program.stmts, errors: errors.map((e) => e.message) };
}

function parseOk(source: string): Stmt[] {
  const { stmts, errors } = parse(source);
  if (errors.length > 0) throw new Error(`Parse errors: ${errors.join(", ")}`);
  return stmts;
}

function parseExpr(source: string): Expr {
  const stmts = parseOk(source);
  if (stmts.length !== 1 || stmts[0].kind !== "expr_stmt") {
    throw new Error("expected single expr_stmt");
  }
  return (stmts[0] as any).expr;
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

// ============================================================
// 1. 변수 선언 (var/let/const)
// ============================================================

console.log("=== 변수 선언 ===");

{
  const [s] = parseOk("var x: i32 = 42");
  assert(s.kind === "var_decl", "var_decl kind");
  assert((s as any).name === "x", "name = x");
  assert((s as any).mutable === true, "var is mutable");
  assert((s as any).type?.kind === "i32", "type = i32");
  assert((s as any).init.kind === "int_lit", "init = int_lit");
  console.log("  ✅ var x: i32 = 42");
}

{
  const [s] = parseOk('let name = "hello"');
  assert(s.kind === "var_decl", "let → var_decl");
  assert((s as any).mutable === false, "let is immutable");
  assert((s as any).type === null, "type inferred");
  console.log("  ✅ let name = \"hello\"");
}

{
  const [s] = parseOk("const PI: f64 = 3.14");
  assert(s.kind === "var_decl", "const → var_decl");
  assert((s as any).mutable === false, "const is immutable");
  assert((s as any).type?.kind === "f64", "type = f64");
  console.log("  ✅ const PI: f64 = 3.14");
}

// ============================================================
// 2. 함수 선언
// ============================================================

console.log("=== 함수 선언 ===");

{
  const [s] = parseOk("fn add(a: i32, b: i32): i32 { return a + b }");
  assert(s.kind === "fn_decl", "fn_decl kind");
  const f = s as any;
  assert(f.name === "add", "name = add");
  assert(f.params.length === 2, "2 params");
  assert(f.params[0].name === "a", "param a");
  assert(f.params[0].type.kind === "i32", "param a: i32");
  assert(f.returnType.kind === "i32", "return i32");
  assert(f.body.length === 1, "1 stmt in body");
  assert(f.body[0].kind === "return_stmt", "return stmt");
  console.log("  ✅ fn add(a: i32, b: i32): i32");
}

{
  const [s] = parseOk("fn noop(): void { }");
  const f = s as any;
  assert(f.name === "noop", "name = noop");
  assert(f.params.length === 0, "0 params");
  assert(f.returnType.kind === "void", "return void");
  console.log("  ✅ fn noop(): void");
}

// ============================================================
// 3. 식 — 리터럴
// ============================================================

console.log("=== 리터럴 ===");

{
  const e = parseExpr("42");
  assert(e.kind === "int_lit" && (e as any).value === 42, "42");
  console.log("  ✅ 42");
}

{
  const e = parseExpr("3.14");
  assert(e.kind === "float_lit" && (e as any).value === 3.14, "3.14");
  console.log("  ✅ 3.14");
}

{
  const e = parseExpr('"hello"');
  assert(e.kind === "string_lit" && (e as any).value === "hello", '"hello"');
  console.log('  ✅ "hello"');
}

{
  const e = parseExpr("true");
  assert(e.kind === "bool_lit" && (e as any).value === true, "true");
  console.log("  ✅ true");
}

{
  const e = parseExpr("false");
  assert(e.kind === "bool_lit" && (e as any).value === false, "false");
  console.log("  ✅ false");
}

// ============================================================
// 4. 식 — 이항 연산 + 우선순위
// ============================================================

console.log("=== 이항 연산 ===");

{
  // 1 + 2 * 3 → +(1, *(2, 3))
  const e = parseExpr("1 + 2 * 3") as any;
  assert(e.kind === "binary" && e.op === "+", "top = +");
  assert(e.left.kind === "int_lit" && e.left.value === 1, "left = 1");
  assert(e.right.kind === "binary" && e.right.op === "*", "right = *");
  assert(e.right.left.value === 2, "2 * 3 left");
  assert(e.right.right.value === 3, "2 * 3 right");
  console.log("  ✅ 1 + 2 * 3 → +(1, *(2, 3))");
}

{
  // a && b || c → ||(&&(a, b), c)
  const e = parseExpr("a && b || c") as any;
  assert(e.kind === "binary" && e.op === "||", "top = ||");
  assert(e.left.op === "&&", "left = &&");
  console.log("  ✅ a && b || c → ||(&&(a, b), c)");
}

{
  // x == 1 && y != 2
  const e = parseExpr("x == 1 && y != 2") as any;
  assert(e.op === "&&", "top = &&");
  assert(e.left.op === "==", "left = ==");
  assert(e.right.op === "!=", "right = !=");
  console.log("  ✅ x == 1 && y != 2");
}

// ============================================================
// 5. 식 — 단항 연산
// ============================================================

console.log("=== 단항 연산 ===");

{
  const e = parseExpr("-42") as any;
  assert(e.kind === "unary" && e.op === "-", "unary -");
  assert(e.operand.value === 42, "operand 42");
  console.log("  ✅ -42");
}

{
  const e = parseExpr("!flag") as any;
  assert(e.kind === "unary" && e.op === "!", "unary !");
  assert(e.operand.name === "flag", "operand flag");
  console.log("  ✅ !flag");
}

// ============================================================
// 6. 식 — 함수 호출
// ============================================================

console.log("=== 함수 호출 ===");

{
  const e = parseExpr("add(1, 2)") as any;
  assert(e.kind === "call", "call");
  assert(e.callee.name === "add", "callee = add");
  assert(e.args.length === 2, "2 args");
  console.log("  ✅ add(1, 2)");
}

{
  const e = parseExpr("println()") as any;
  assert(e.kind === "call" && e.args.length === 0, "0 args");
  console.log("  ✅ println()");
}

// 체이닝: foo.bar(1)
{
  const e = parseExpr("foo.bar(1)") as any;
  assert(e.kind === "call", "call");
  assert(e.callee.kind === "field_access", "callee = field_access");
  assert(e.callee.field === "bar", "field = bar");
  console.log("  ✅ foo.bar(1)");
}

// ============================================================
// 7. 식 — 인덱스, 필드 접근
// ============================================================

console.log("=== 인덱스 & 필드 접근 ===");

{
  const e = parseExpr("arr[0]") as any;
  assert(e.kind === "index", "index");
  assert(e.object.name === "arr", "object = arr");
  assert(e.index.value === 0, "index = 0");
  console.log("  ✅ arr[0]");
}

{
  const e = parseExpr("point.x") as any;
  assert(e.kind === "field_access", "field_access");
  assert(e.field === "x", "field = x");
  console.log("  ✅ point.x");
}

// ============================================================
// 8. 식 — try 연산자 (?)
// ============================================================

console.log("=== try 연산자 ===");

{
  const e = parseExpr("getValue()") as any;
  assert(e.kind === "call", "call");
  console.log("  ✅ getValue()");
}

// ch.recv()? 형태 테스트 — 함수 내 return 문으로 테스트
{
  const stmts = parseOk("fn f(): Result<i32, string> { return ch.recv()? }");
  const ret = (stmts[0] as any).body[0];
  assert(ret.kind === "return_stmt", "return_stmt");
  assert(ret.value.kind === "try", "try op");
  assert(ret.value.operand.kind === "call", "call inside try");
  console.log("  ✅ ch.recv()?");
}

// ============================================================
// 9. 식 — 배열/구조체 리터럴
// ============================================================

console.log("=== 배열 & 구조체 리터럴 ===");

{
  const e = parseExpr("[1, 2, 3]") as any;
  assert(e.kind === "array_lit", "array_lit");
  assert(e.elements.length === 3, "3 elements");
  console.log("  ✅ [1, 2, 3]");
}

{
  const stmts = parseOk('var p = { x: 1, y: 2 }');
  const init = (stmts[0] as any).init;
  assert(init.kind === "struct_lit", "struct_lit");
  assert(init.fields.length === 2, "2 fields");
  assert(init.fields[0].name === "x", "field x");
  assert(init.fields[1].name === "y", "field y");
  console.log("  ✅ { x: 1, y: 2 }");
}

// ============================================================
// 10. if 문
// ============================================================

console.log("=== if 문 ===");

{
  const [s] = parseOk('if x > 0 { println("pos") }');
  assert(s.kind === "if_stmt", "if_stmt");
  const i = s as any;
  assert(i.condition.op === ">", "condition >");
  assert(i.then.length === 1, "then 1 stmt");
  assert(i.else_ === null, "no else");
  console.log("  ✅ if x > 0 { ... }");
}

{
  const [s] = parseOk('if x > 0 { println("pos") } else { println("neg") }');
  const i = s as any;
  assert(i.else_ !== null, "has else");
  assert(i.else_.length === 1, "else 1 stmt");
  console.log("  ✅ if ... else ...");
}

// else if 체인
{
  const [s] = parseOk('if x > 0 { println("pos") } else if x == 0 { println("zero") } else { println("neg") }');
  const i = s as any;
  assert(i.else_.length === 1, "else branch = 1 if_stmt");
  assert(i.else_[0].kind === "if_stmt", "else if chain");
  console.log("  ✅ if ... else if ... else ...");
}

// ============================================================
// 11. for 문
// ============================================================

console.log("=== for 문 ===");

{
  const [s] = parseOk("for item in items { println(item) }");
  assert(s.kind === "for_stmt", "for_stmt");
  const f = s as any;
  assert(f.variable === "item", "variable = item");
  assert(f.iterable.name === "items", "iterable = items");
  assert(f.body.length === 1, "1 stmt in body");
  console.log("  ✅ for item in items { ... }");
}

// range 패턴
{
  const [s] = parseOk("for i in range(0, 10) { println(i) }");
  const f = s as any;
  assert(f.iterable.kind === "call", "iterable = call");
  assert(f.iterable.callee.name === "range", "callee = range");
  console.log("  ✅ for i in range(0, 10) { ... }");
}

// ============================================================
// 12. match 문
// ============================================================

console.log("=== match 문 ===");

{
  const [s] = parseOk(`match x {
    0 => println("zero")
    1 => println("one")
    _ => println("other")
  }`);
  assert(s.kind === "match_stmt", "match_stmt");
  const m = s as any;
  assert(m.arms.length === 3, "3 arms");
  assert(m.arms[0].pattern.kind === "literal", "arm 0 literal");
  assert(m.arms[2].pattern.kind === "wildcard", "arm 2 wildcard");
  console.log("  ✅ match x { 0 => ..., 1 => ..., _ => ... }");
}

{
  const [s] = parseOk(`match result {
    Ok(v) => v
    Err(e) => 0
  }`);
  const m = s as any;
  assert(m.arms[0].pattern.kind === "ok", "Ok pattern");
  assert(m.arms[0].pattern.inner.kind === "ident", "Ok inner = ident");
  assert(m.arms[1].pattern.kind === "err", "Err pattern");
  console.log("  ✅ match result { Ok(v) => ..., Err(e) => ... }");
}

{
  const [s] = parseOk(`match opt {
    Some(v) => v
    None => 0
  }`);
  const m = s as any;
  assert(m.arms[0].pattern.kind === "some", "Some pattern");
  assert(m.arms[1].pattern.kind === "none", "None pattern");
  console.log("  ✅ match opt { Some(v) => ..., None => ... }");
}

// ============================================================
// 13. spawn 문
// ============================================================

console.log("=== spawn 문 ===");

{
  const [s] = parseOk('spawn { println("actor") }');
  assert(s.kind === "spawn_stmt", "spawn_stmt");
  assert((s as any).body.length === 1, "1 stmt");
  console.log("  ✅ spawn { ... }");
}

// ============================================================
// 14. return 문
// ============================================================

console.log("=== return 문 ===");

{
  const stmts = parseOk("fn f(): i32 { return 42 }");
  const body = (stmts[0] as any).body;
  assert(body[0].kind === "return_stmt", "return_stmt");
  assert(body[0].value.value === 42, "return 42");
  console.log("  ✅ return 42");
}

{
  const stmts = parseOk("fn f(): void { return }");
  const body = (stmts[0] as any).body;
  assert(body[0].kind === "return_stmt", "return_stmt");
  assert(body[0].value === null, "return void");
  console.log("  ✅ return (void)");
}

// ============================================================
// 15. 할당
// ============================================================

console.log("=== 할당 ===");

{
  const [s] = parseOk("x = 42");
  assert(s.kind === "expr_stmt", "expr_stmt");
  const e = (s as any).expr;
  assert(e.kind === "assign", "assign");
  assert(e.target.name === "x", "target = x");
  assert(e.value.value === 42, "value = 42");
  console.log("  ✅ x = 42");
}

{
  const [s] = parseOk("arr[0] = 10");
  const e = (s as any).expr;
  assert(e.kind === "assign", "assign");
  assert(e.target.kind === "index", "target = index");
  console.log("  ✅ arr[0] = 10");
}

// ============================================================
// 16. 타입 파싱
// ============================================================

console.log("=== 타입 파싱 ===");

{
  const [s] = parseOk("var x: [i32] = [1, 2, 3]");
  assert((s as any).type.kind === "array", "array type");
  assert((s as any).type.element.kind === "i32", "element = i32");
  console.log("  ✅ [i32]");
}

{
  const [s] = parseOk("var ch: channel<i32> = channel(0)");
  assert((s as any).type.kind === "channel", "channel type");
  console.log("  ✅ channel<i32>");
}

{
  const [s] = parseOk("var opt: Option<string> = None");
  assert((s as any).type.kind === "option", "option type");
  console.log("  ✅ Option<string>");
}

{
  const [s] = parseOk("var res: Result<i32, string> = Ok(42)");
  assert((s as any).type.kind === "result", "result type");
  assert((s as any).type.ok.kind === "i32", "ok = i32");
  assert((s as any).type.err.kind === "string", "err = string");
  console.log("  ✅ Result<i32, string>");
}

// ============================================================
// 17. 통합 테스트 — SPEC_05 Q10 테스트 프로그램
// ============================================================

console.log("=== 통합 테스트 ===");

// 테스트 1: var + 함수 호출
{
  const stmts = parseOk(`var result = add(1, 2 * 3)
println(result)`);
  assert(stmts.length === 2, "2 stmts");
  assert(stmts[0].kind === "var_decl", "var_decl");
  assert(stmts[1].kind === "expr_stmt", "expr_stmt");
  console.log("  ✅ 통합 1: var + call");
}

// 테스트 2: match + 필드 접근
{
  const stmts = parseOk(`match ch.recv() {
  Ok(v) => v + 1,
  Err(e) => 0,
}`);
  assert(stmts[0].kind === "match_stmt", "match_stmt");
  const m = stmts[0] as any;
  assert(m.subject.kind === "call", "subject = call");
  assert(m.arms.length === 2, "2 arms");
  console.log("  ✅ 통합 2: match ch.recv()");
}

// 테스트 3: 중첩 함수
{
  const stmts = parseOk(`fn factorial(n: i32): i32 {
  if n <= 1 {
    return 1
  }
  return n * factorial(n + -1)
}`);
  assert(stmts[0].kind === "fn_decl", "fn_decl");
  const f = stmts[0] as any;
  assert(f.name === "factorial", "name = factorial");
  assert(f.body.length === 2, "2 stmts in body");
  console.log("  ✅ 통합 3: factorial");
}

// 테스트 4: for + match
{
  const stmts = parseOk(`for item in items {
  match item {
    0 => println("zero"),
    _ => println("other"),
  }
}`);
  assert(stmts[0].kind === "for_stmt", "for_stmt");
  const forBody = (stmts[0] as any).body;
  assert(forBody[0].kind === "match_stmt", "nested match");
  console.log("  ✅ 통합 4: for + match");
}

// ============================================================
// 결과
// ============================================================

console.log(`\n=== 결과: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
