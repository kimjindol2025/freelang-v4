// FreeLang v4 — TypeChecker 테스트

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker, CheckError } from "./checker";

function check(source: string): CheckError[] {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex: ${lexErrors[0].message}`);
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) throw new Error(`Parse: ${parseErrors[0].message}`);
  return new TypeChecker().check(program);
}

function expectNoErrors(source: string, label: string) {
  const errors = check(source);
  if (errors.length > 0) {
    console.error(`  ❌ ${label}: ${errors.map((e) => e.message).join(", ")}`);
    failed++;
  } else {
    console.log(`  ✅ ${label}`);
    passed++;
  }
}

function expectError(source: string, pattern: string, label: string) {
  const errors = check(source);
  const found = errors.some((e) => e.message.includes(pattern));
  if (found) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}: expected error "${pattern}", got [${errors.map((e) => e.message).join(", ")}]`);
    failed++;
  }
}

let passed = 0;
let failed = 0;

// ============================================================
// 1. 기본 타입 추론 (SPEC_06 Q3)
// ============================================================

console.log("=== 타입 추론 ===");

expectNoErrors("var x = 42", "var x = 42 (i32 추론)");
expectNoErrors("var x = 3.14", "var x = 3.14 (f64 추론)");
expectNoErrors('var x = "hello"', 'var x = "hello" (string 추론)');
expectNoErrors("var x = true", "var x = true (bool 추론)");

// 명시 타입 일치
expectNoErrors("var x: i32 = 42", "var x: i32 = 42");
expectNoErrors("var x: f64 = 3.14", "var x: f64 = 3.14");

// 명시 타입 불일치
expectError('var x: i32 = "hello"', "type mismatch", "i32 = string 불일치");
expectError("var x: bool = 42", "type mismatch", "bool = i32 불일치");

// ============================================================
// 2. void 변수 금지 (SPEC_06 Q9)
// ============================================================

console.log("=== void 제약 ===");

expectError("var x: void = println()", "void", "void 변수 금지");

// ============================================================
// 3. 산술 연산 타입 검사
// ============================================================

console.log("=== 산술 연산 ===");

expectNoErrors("fn f(): i32 { return 1 + 2 }", "i32 + i32");
expectNoErrors("fn f(): f64 { return 1.0 + 2.0 }", "f64 + f64");
expectError("fn f(): i32 { return 1 + 1.0 }", "type mismatch", "i32 + f64 불일치");

// 문자열 + 문자열 (SPEC_06)
expectNoErrors('fn f(): string { return "a" + "b" }', "string + string");

// ============================================================
// 4. 비교 연산 → bool
// ============================================================

console.log("=== 비교 연산 ===");

expectNoErrors("fn f(): bool { return 1 == 2 }", "== → bool");
expectNoErrors("fn f(): bool { return 1 < 2 }", "< → bool");

// ============================================================
// 5. 논리 연산 — bool 필요
// ============================================================

console.log("=== 논리 연산 ===");

expectNoErrors("fn f(): bool { return true && false }", "&& bool");
expectError("fn f(): bool { return 1 && 2 }", "requires bool", "&& 에 i32 사용");

// ============================================================
// 6. 단항 연산
// ============================================================

console.log("=== 단항 연산 ===");

expectNoErrors("fn f(): i32 { return -42 }", "unary -");
expectNoErrors("fn f(): bool { return !true }", "unary !");
expectError("fn f(): bool { return !42 }", "requires bool", "! 에 i32 사용");

// ============================================================
// 7. 함수 검사
// ============================================================

console.log("=== 함수 검사 ===");

// 반환 타입 불일치
expectError('fn f(): i32 { return "hello" }', "return type mismatch", "반환 타입 불일치");

// 인자 수 불일치
expectError(`fn add(a: i32, b: i32): i32 { return a + b }
add(1)`, "expects 2 arguments", "인자 수 부족");

// 인자 타입 불일치
expectError(`fn add(a: i32, b: i32): i32 { return a + b }
add(1, "two")`, "argument 2 type mismatch", "인자 타입 불일치");

// 전방참조 (SPEC_08 Q5)
expectNoErrors(`
fn main(): void { println(str(add(1, 2))) }
fn add(a: i32, b: i32): i32 { return a + b }
`, "함수 전방참조");

// 중복 함수 선언
expectError(`fn f(): void { }
fn f(): void { }`, "already declared", "함수 중복 선언");

// ============================================================
// 8. 변수 immutability (SPEC_07)
// ============================================================

console.log("=== 불변성 ===");

expectNoErrors("var x = 1\nx = 2", "var 재할당 허용");
expectError("let x = 1\nx = 2", "immutable", "let 재할당 금지");

// ============================================================
// 9. Move semantics (SPEC_07)
// ============================================================

console.log("=== Move ===");

// Move 타입 사용 후 재사용 — 함수 인자 전달
expectError(`
fn consume(arr: [i32]): void { }
var items: [i32] = [1, 2, 3]
consume(items)
println(length(items))
`, "moved value", "Move 후 사용 금지");

// 재할당으로 Move 복구 (SPEC_07 Q7)
expectNoErrors(`
fn consume(arr: [i32]): void { }
var items: [i32] = [1, 2, 3]
consume(items)
items = [4, 5, 6]
println(length(items))
`, "Move 후 재할당 복구");

// Copy 타입은 Move 안 됨
expectNoErrors(`
fn use_num(n: i32): void { }
var x = 42
use_num(x)
println(str(x))
`, "Copy 타입 이동 없음");

// ============================================================
// 10. 스코프 (SPEC_08)
// ============================================================

console.log("=== 스코프 ===");

// 미정의 변수
expectError("println(str(x))", "undefined variable", "미정의 변수");

// 섀도잉 (SPEC_08 Q4)
expectNoErrors(`var x = 42
var x = "hello"`, "섀도잉 허용");

// ============================================================
// 11. if 조건 — bool 필수
// ============================================================

console.log("=== if 조건 ===");

expectError("if 42 { }", "must be bool", "if 조건 non-bool");
expectNoErrors('if true { println("yes") }', "if true");

// ============================================================
// 12. for...in — array 필수
// ============================================================

console.log("=== for...in ===");

expectNoErrors("for x in [1, 2, 3] { println(str(x)) }", "for in array");
expectError("for x in 42 { }", "requires array", "for in non-array");

// ============================================================
// 13. 배열 원소 타입 일관성
// ============================================================

console.log("=== 배열 ===");

expectNoErrors("var arr = [1, 2, 3]", "동종 배열");
expectError('var arr = [1, "two", 3]', "array element type mismatch", "이종 배열");

// ============================================================
// 14. 구조체 (구조적 타입)
// ============================================================

console.log("=== 구조체 ===");

expectNoErrors('var p = { x: 1, y: 2 }', "구조체 리터럴");

// ============================================================
// 15. 내장 함수
// ============================================================

console.log("=== 내장 함수 ===");

expectNoErrors('println("hello")', "println");
expectNoErrors("var r = range(0, 10)", "range → [i32]");
expectNoErrors("var n = length([1, 2, 3])", "length → i32");

// ============================================================
// 16. return 밖에서 사용
// ============================================================

console.log("=== return 제약 ===");

expectError("return 42", "return outside function", "함수 밖 return");

// void 함수에서 return value
expectError("fn f(): void { return 42 }", "return type mismatch", "void 함수에서 값 반환");

// ============================================================
// 17. 통합 — 실제 프로그램
// ============================================================

console.log("=== 통합 테스트 ===");

expectNoErrors(`
fn factorial(n: i32): i32 {
  if n <= 1 {
    return 1
  }
  return n * factorial(n + -1)
}
var result = factorial(5)
println(str(result))
`, "factorial 프로그램");

expectNoErrors(`
fn sum(arr: [i32]): i32 {
  var total: i32 = 0
  for x in arr {
    total = total + x
  }
  return total
}
var nums = [1, 2, 3, 4, 5]
println(str(sum(nums)))
`, "sum 프로그램");

// ============================================================
// 결과
// ============================================================

console.log(`\n=== 결과: ${passed} passed, ${failed} failed ===`);
