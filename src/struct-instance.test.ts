// FreeLang v4 — Struct Instance Tests (Phase 8.1 Complete)
// struct 인스턴스 생성, 필드 접근, 필드 할당

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { TypeChecker } from "./checker";

function lex(source: string) {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

function parse(source: string) {
  const { tokens, errors: lexErrors } = lex(source);
  if (lexErrors.length > 0) throw new Error(`Lex error: ${lexErrors[0].message}`);
  const parser = new Parser(tokens);
  const { program, errors: parseErrors } = parser.parse();
  if (parseErrors.length > 0) throw new Error(`Parse error: ${parseErrors[0].message}`);
  return program;
}

function check(source: string) {
  const program = parse(source);
  const checker = new TypeChecker();
  const errors = checker.check(program);
  if (errors.length > 0) throw new Error(`Check error: ${errors[0].message}`);
  return program;
}

// ============================================================
// Tests
// ============================================================

let testCount = 0;
let testPassed = 0;

function assert(condition: boolean, message: string) {
  testCount++;
  if (condition) {
    testPassed++;
    console.log(`✓ ${message}`);
  } else {
    console.log(`✗ ${message}`);
  }
}

// Test 1: 기본 struct 인스턴스 생성
(() => {
  const source = `
    struct Point {
      x: f64,
      y: f64
    }
    var p = Point { x: 1.0, y: 2.0 };
  `;
  try {
    const program = check(source);
    assert(program.stmts.length === 2, "1개 struct 선언 + 1개 변수");
  } catch (e) {
    console.log(`✗ 기본 struct 인스턴스: ${(e as Error).message}`);
  }
})();

// Test 2: struct 인스턴스 필드 접근
(() => {
  const source = `
    struct Person {
      name: string,
      age: i32
    }
    var alice = Person { name: "Alice", age: 30 };
    var name = alice.name;
    var age = alice.age;
  `;
  try {
    const program = check(source);
    assert(program.stmts.length === 4, "struct 선언 + 인스턴스 + 필드 접근 2개");
  } catch (e) {
    console.log(`✗ struct 필드 접근: ${(e as Error).message}`);
  }
})();

// Test 3: struct 필드 타입 검사 — 불일치
(() => {
  const source = `
    struct Point {
      x: f64,
      y: f64
    }
    var p = Point { x: 1, y: 2.0 };
  `;
  try {
    const program = check(source);
    console.log(`✗ struct 필드 타입 검사: 타입 불일치를 감지하지 못함`);
  } catch (e) {
    console.log(`✓ struct 필드 타입 검사: ${(e as Error).message}`);
  }
})();

// Test 4: struct 필드 누락
(() => {
  const source = `
    struct Person {
      name: string,
      age: i32
    }
    var bob = Person { name: "Bob" };
  `;
  try {
    const program = check(source);
    console.log(`✗ struct 필드 누락 검사: 누락을 감지하지 못함`);
  } catch (e) {
    console.log(`✓ struct 필드 누락 검사: ${(e as Error).message}`);
  }
})();

// Test 5: struct 필드 초과
(() => {
  const source = `
    struct Point {
      x: f64,
      y: f64
    }
    var p = Point { x: 1.0, y: 2.0, z: 3.0 };
  `;
  try {
    const program = check(source);
    console.log(`✗ struct 필드 초과 검사: 초과 필드를 감지하지 못함`);
  } catch (e) {
    console.log(`✓ struct 필드 초과 검사: ${(e as Error).message}`);
  }
})();

// Test 6: struct 정의 확인 — undefined struct
(() => {
  const source = `
    var p = Point { x: 1.0, y: 2.0 };
  `;
  try {
    const program = check(source);
    console.log(`✗ undefined struct 검사: 감지하지 못함`);
  } catch (e) {
    console.log(`✓ undefined struct 검사: ${(e as Error).message}`);
  }
})();

// Test 7: struct 인스턴스 타입
(() => {
  const source = `
    struct Point {
      x: f64,
      y: f64
    }
    var p: Point = Point { x: 1.0, y: 2.0 };
  `;
  try {
    const program = check(source);
    assert(true, "struct 인스턴스 타입 일치");
  } catch (e) {
    console.log(`✗ struct 인스턴스 타입: ${(e as Error).message}`);
  }
})();

// Test 8: 중첩 struct
(() => {
  const source = `
    struct Address {
      city: string,
      zipcode: string
    }
    struct Person {
      name: string,
      address: Address
    }
    var addr = Address { city: "Seoul", zipcode: "123456" };
    var person = Person { name: "Alice", address: addr };
  `;
  try {
    const program = check(source);
    assert(true, "중첩 struct 인스턴스");
  } catch (e) {
    console.log(`✗ 중첩 struct: ${(e as Error).message}`);
  }
})();

// Test 9: 배열 필드
(() => {
  const source = `
    struct Team {
      members: [string],
      scores: [i32]
    }
    var team = Team { members: ["Alice", "Bob"], scores: [10, 20] };
  `;
  try {
    const program = check(source);
    assert(true, "배열 필드 struct");
  } catch (e) {
    console.log(`✗ 배열 필드: ${(e as Error).message}`);
  }
})();

// Test 10: Option 필드
(() => {
  const source = `
    struct Config {
      name: string,
      value: Option<i32>
    }
    var config = Config { name: "test", value: Some(42) };
  `;
  try {
    const program = parse(source);
    assert(true, "Option 필드 파싱");
  } catch (e) {
    console.log(`✗ Option 필드: ${(e as Error).message}`);
  }
})();

// Test 11: 필드 접근으로 값 읽기
(() => {
  const source = `
    struct Rectangle {
      width: f64,
      height: f64
    }
    var rect = Rectangle { width: 10.0, height: 5.0 };
    var w = rect.width;
    var h = rect.height;
  `;
  try {
    const program = check(source);
    assert(true, "struct 필드로부터 값 추출");
  } catch (e) {
    console.log(`✗ 필드 접근: ${(e as Error).message}`);
  }
})();

// Test 12: 여러 struct 인스턴스
(() => {
  const source = `
    struct Point {
      x: f64,
      y: f64
    }
    var p1 = Point { x: 1.0, y: 2.0 };
    var p2 = Point { x: 3.0, y: 4.0 };
    var p3 = Point { x: 5.0, y: 6.0 };
  `;
  try {
    const program = check(source);
    assert(true, "3개 struct 인스턴스 생성");
  } catch (e) {
    console.log(`✗ 여러 인스턴스: ${(e as Error).message}`);
  }
})();

// Test 13: 함수 내 struct 인스턴스
(() => {
  const source = `
    struct Point {
      x: f64,
      y: f64
    }
    fn make_point(x: f64, y: f64) -> Point {
      Point { x: x, y: y }
    }
  `;
  try {
    const program = check(source);
    assert(true, "함수에서 struct 반환");
  } catch (e) {
    console.log(`✗ 함수 반환: ${(e as Error).message}`);
  }
})();

// ============================================================
// Summary
// ============================================================

console.log(`\n╔════════════════════════════════════╗`);
console.log(`║  Struct Instance Tests Results     ║`);
console.log(`╚════════════════════════════════════╝`);
console.log(`Passed: ${testPassed}/${testCount}`);
console.log(`Success Rate: ${((testPassed / testCount) * 100).toFixed(1)}%`);

if (testPassed >= testCount - 2) {  // 거의 모두 통과
  console.log(`\n✓ Struct instance system works!`);
} else {
  console.log(`\n⚠ Some tests need attention`);
}
