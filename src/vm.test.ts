// FreeLang v4 — VM 테스트 (E2E: Source → Lexer → Parser → Compiler → VM)

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Compiler } from "./compiler";
import { VM } from "./vm";

function exec(source: string): { output: string[]; error: string | null } {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex: ${lexErrors[0].message}`);
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) throw new Error(`Parse: ${parseErrors[0].message}`);
  const chunk = new Compiler().compile(program);
  return new VM().run(chunk);
}

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

function expectOutput(source: string, expected: string[], label: string) {
  try {
    const { output, error } = exec(source);
    if (error) {
      failed++;
      console.error(`  ❌ ${label}: runtime error: ${error}`);
      return;
    }
    const match = output.length === expected.length &&
      output.every((line, i) => line === expected[i]);
    if (match) {
      passed++;
      console.log(`  ✅ ${label}`);
    } else {
      failed++;
      console.error(`  ❌ ${label}: expected [${expected}], got [${output}]`);
    }
  } catch (e: any) {
    failed++;
    console.error(`  ❌ ${label}: ${e.message}`);
  }
}

function expectError(source: string, pattern: string, label: string) {
  try {
    const { error } = exec(source);
    if (error && error.includes(pattern)) {
      passed++;
      console.log(`  ✅ ${label}`);
    } else {
      failed++;
      console.error(`  ❌ ${label}: expected error "${pattern}", got "${error}"`);
    }
  } catch (e: any) {
    if (e.message && e.message.includes(pattern)) {
      passed++;
      console.log(`  ✅ ${label}`);
    } else {
      failed++;
      console.error(`  ❌ ${label}: expected "${pattern}", got "${e.message}"`);
    }
  }
}

// ============================================================
// 1. println 기본
// ============================================================

console.log("=== println 기본 ===");

expectOutput('println("hello")', ["hello"], 'println("hello")');
expectOutput('println("hello world")', ["hello world"], 'println("hello world")');

// ============================================================
// 2. 정수 산술
// ============================================================

console.log("=== 정수 산술 ===");

expectOutput("println(str(1 + 2))", ["3"], "1 + 2 = 3");
expectOutput("println(str(10 - 3))", ["7"], "10 - 3 = 7");
expectOutput("println(str(4 * 5))", ["20"], "4 * 5 = 20");
expectOutput("println(str(10 / 3))", ["3"], "10 / 3 = 3 (i32 truncate)");
expectOutput("println(str(7 % 3))", ["1"], "7 % 3 = 1");
expectOutput("println(str(-42))", ["-42"], "-42 (negate)");

// 복합 산술
expectOutput("println(str(2 + 3 * 4))", ["14"], "2 + 3 * 4 = 14 (precedence)");

// ============================================================
// 3. 문자열 연결
// ============================================================

console.log("=== 문자열 연결 ===");

expectOutput('println("hello" + " " + "world")', ["hello world"], 'string concat');

// ============================================================
// 4. 비교 + 논리
// ============================================================

console.log("=== 비교 + 논리 ===");

expectOutput("println(str(1 == 1))", ["true"], "1 == 1");
expectOutput("println(str(1 == 2))", ["false"], "1 == 2");
expectOutput("println(str(1 != 2))", ["true"], "1 != 2");
expectOutput("println(str(1 < 2))", ["true"], "1 < 2");
expectOutput("println(str(2 > 1))", ["true"], "2 > 1");
expectOutput("println(str(1 <= 1))", ["true"], "1 <= 1");
expectOutput("println(str(1 >= 2))", ["false"], "1 >= 2");
expectOutput("println(str(true && true))", ["true"], "true && true");
expectOutput("println(str(true && false))", ["false"], "true && false");
expectOutput("println(str(false || true))", ["true"], "false || true");
expectOutput("println(str(!true))", ["false"], "!true");

// ============================================================
// 5. 변수
// ============================================================

console.log("=== 변수 ===");

expectOutput("var x = 42\nprintln(str(x))", ["42"], "var x = 42");
expectOutput('var name = "FreeLang"\nprintln(name)', ["FreeLang"], "var name = string");
expectOutput("var x = 1\nx = 2\nprintln(str(x))", ["2"], "var reassign");
expectOutput("var a = 10\nvar b = 20\nprintln(str(a + b))", ["30"], "a + b = 30");

// ============================================================
// 6. 함수
// ============================================================

console.log("=== 함수 ===");

expectOutput(`fn add(a: i32, b: i32): i32 { return a + b }
println(str(add(3, 4)))`, ["7"], "fn add(3,4) = 7");

expectOutput(`fn double(n: i32): i32 { return n * 2 }
println(str(double(21)))`, ["42"], "fn double(21) = 42");

expectOutput(`fn greet(name: string): void { println("Hello " + name) }
greet("FreeLang")`, ["Hello FreeLang"], "fn greet void");

// 재귀
expectOutput(`fn factorial(n: i32): i32 {
  if n <= 1 { return 1 }
  return n * factorial(n + -1)
}
println(str(factorial(5)))`, ["120"], "factorial(5) = 120");

// 전방참조
expectOutput(`println(str(add(1, 2)))
fn add(a: i32, b: i32): i32 { return a + b }`, ["3"], "forward reference");

// ============================================================
// 7. if 문
// ============================================================

console.log("=== if 문 ===");

expectOutput('if true { println("yes") }', ["yes"], "if true");
expectOutput('if false { println("yes") }', [], "if false (skip)");
expectOutput('if true { println("yes") } else { println("no") }', ["yes"], "if-else true");
expectOutput('if false { println("yes") } else { println("no") }', ["no"], "if-else false");

// 중첩 if
expectOutput(`var x = 10
if x > 5 {
  if x > 20 {
    println("big")
  } else {
    println("medium")
  }
} else {
  println("small")
}`, ["medium"], "nested if");

// ============================================================
// 8. for 문
// ============================================================

console.log("=== for 문 ===");

expectOutput(`for x in [1, 2, 3] {
  println(str(x))
}`, ["1", "2", "3"], "for...in [1,2,3]");

expectOutput(`var total: i32 = 0
for x in [10, 20, 30] {
  total = total + x
}
println(str(total))`, ["60"], "for sum = 60");

// range
expectOutput(`for i in range(0, 5) {
  println(str(i))
}`, ["0", "1", "2", "3", "4"], "for...in range(0,5)");

// ============================================================
// 9. 배열
// ============================================================

console.log("=== 배열 ===");

expectOutput(`var arr = [10, 20, 30]
println(str(length(arr)))`, ["3"], "array length = 3");

expectOutput(`var arr = [10, 20, 30]
println(str(arr[0]))
println(str(arr[2]))`, ["10", "30"], "array indexing");

// ============================================================
// 10. 구조체
// ============================================================

console.log("=== 구조체 ===");

expectOutput(`var p = { x: 1, y: 2 }
println(str(p.x))
println(str(p.y))`, ["1", "2"], "struct field access");

// ============================================================
// 11. 내장 함수
// ============================================================

console.log("=== 내장 함수 ===");

expectOutput('println(str(length("hello")))', ["5"], "length(string) = 5");
expectOutput("println(str(abs(-42)))", ["42"], "abs(-42) = 42");
expectOutput("println(str(min(3, 7)))", ["3"], "min(3,7) = 3");
expectOutput("println(str(max(3, 7)))", ["7"], "max(3,7) = 7");
expectOutput('println(typeof(42))', ["i32"], "typeof(42) = i32");
expectOutput('println(typeof("hi"))', ["str"], "typeof(string) = str");
expectOutput('println(to_upper("hello"))', ["HELLO"], "to_upper");
expectOutput('println(to_lower("HELLO"))', ["hello"], "to_lower");
expectOutput('println(trim("  hi  "))', ["hi"], "trim");
expectOutput('println(str(contains("hello", "ell")))', ["true"], "contains");

// ============================================================
// 12. match 문
// ============================================================

console.log("=== match 문 ===");

expectOutput(`match 42 {
  0 => println("zero")
  42 => println("answer")
  _ => println("other")
}`, ["answer"], "match 42 → answer");

expectOutput(`match 99 {
  0 => println("zero")
  _ => println("other")
}`, ["other"], "match 99 → wildcard");

// ============================================================
// 13. spawn (actor)
// ============================================================

console.log("=== spawn ===");

expectOutput(`spawn { println("actor") }
println("main")`, ["main", "actor"], "spawn basic");

// ============================================================
// 14. 에러
// ============================================================

console.log("=== 에러 ===");

expectError("println(str(1 / 0))", "division by zero", "division by zero");
expectError("println(str(1 % 0))", "division by zero", "modulo by zero");
expectError('panic("crash")', "crash", "panic");
expectError("assert(false)", "assertion failed", "assert false");

// ============================================================
// 15. 통합 프로그램
// ============================================================

console.log("=== 통합 프로그램 ===");

// factorial
expectOutput(`fn factorial(n: i32): i32 {
  if n <= 1 { return 1 }
  return n * factorial(n + -1)
}
var result = factorial(5)
println(str(result))`, ["120"], "factorial(5) = 120");

// sum 함수 + for
expectOutput(`fn sum(arr: [i32]): i32 {
  var total: i32 = 0
  for x in arr {
    total = total + x
  }
  return total
}
var nums = [1, 2, 3, 4, 5]
println(str(sum(nums)))`, ["15"], "sum([1..5]) = 15");

// fibonacci
expectOutput(`fn fib(n: i32): i32 {
  if n <= 0 { return 0 }
  if n == 1 { return 1 }
  return fib(n + -1) + fib(n + -2)
}
println(str(fib(10)))`, ["55"], "fib(10) = 55");

// FizzBuzz (1-15)
expectOutput(`for i in range(1, 16) {
  if i % 15 == 0 {
    println("FizzBuzz")
  } else {
    if i % 3 == 0 {
      println("Fizz")
    } else {
      if i % 5 == 0 {
        println("Buzz")
      } else {
        println(str(i))
      }
    }
  }
}`, [
  "1", "2", "Fizz", "4", "Buzz",
  "Fizz", "7", "8", "Fizz", "Buzz",
  "11", "Fizz", "13", "14", "FizzBuzz"
], "FizzBuzz 1-15");

// ============================================================
// Phase 7: 20 Core Libraries Tests
// ============================================================

console.log("\n## Phase 7: Core Libraries (20 functions)");

// Cryptography & Encoding (6)
expectOutput(`println(md5("hello"))`, ["5d41402abc4b2a76b9719d911017c592"], "md5 hash");
expectOutput(`println(sha256("hello"))`, ["2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"], "sha256 hash");
expectOutput(`var encoded = base64_encode("hello")
println(encoded)`, ["aGVsbG8="], "base64 encode");
expectOutput(`var result = base64_decode("aGVsbG8=")
println(typeof(result))`, ["ok"], "base64 decode ok");

// JSON (4)
expectOutput(`var result = json_parse("{\\\"x\\\":1}")
println(typeof(result))`, ["ok"], "json_parse ok");
expectOutput(`println(json_validate("{\\\"x\\\":1}"))`, ["true"], "json_validate true");
expectOutput(`println(json_validate("{invalid"))`, ["false"], "json_validate false");

// Advanced Strings (3)
expectOutput(`println(starts_with("hello", "he"))`, ["true"], "starts_with true");
expectOutput(`println(starts_with("hello", "lo"))`, ["false"], "starts_with false");
expectOutput(`println(ends_with("hello", "lo"))`, ["true"], "ends_with true");
expectOutput(`println(ends_with("hello", "he"))`, ["false"], "ends_with false");
expectOutput(`println(replace("hello world", "world", "FreeLang"))`, ["hello FreeLang"], "replace string");

// Advanced Arrays (3)
expectOutput(`var arr = [1, 2, 3]
var rev = reverse(arr)
println(length(rev))`, ["3"], "reverse array length");
expectOutput(`var arr = [3, 1, 2]
var sorted = sort(arr)
for x in sorted {
  println(str(x))
}`, ["1", "2", "3"], "sort array");
expectOutput(`var arr = [1, 2, 2, 3, 3, 3]
var uniq = unique(arr)
println(length(uniq))`, ["3"], "unique array");

// Math (2)
expectOutput(`println(gcd(12, 8))`, ["4"], "gcd function");
expectOutput(`println(lcm(12, 8))`, ["24"], "lcm function");

// Utils (2)
expectOutput(`var id = uuid()
println(length(id))`, ["36"], "uuid length 36");
expectOutput(`var ts = timestamp()
fn check(t: f64): bool { return t > 0.0 }
println(check(ts))`, ["true"], "timestamp positive");

// ============================================================
// 결과
// ============================================================

console.log(`\n=== 결과: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
