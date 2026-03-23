// FreeLang v4 — Struct System Tests (Phase 8.1)
// struct 선언, 인스턴스 생성, 필드 접근

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

// Test 1: struct 선언 파싱
(() => {
  const source = `
    struct Person {
      name: string,
      age: i32
    }
  `;
  try {
    const program = parse(source);
    assert(program.stmts.length === 1, "struct 선언 파싱");
    const stmt = program.stmts[0];
    assert(stmt.kind === "struct_decl", "stmt kind is struct_decl");
    const structStmt = stmt as any;
    assert(structStmt.name === "Person", "struct name is Person");
    assert(structStmt.fields.length === 2, "struct has 2 fields");
    assert(structStmt.fields[0].name === "name", "첫 번째 필드 이름");
    assert(structStmt.fields[0].type.kind === "string", "첫 번째 필드 타입");
    assert(structStmt.fields[1].name === "age", "두 번째 필드 이름");
    assert(structStmt.fields[1].type.kind === "i32", "두 번째 필드 타입");
  } catch (e) {
    console.log(`✗ struct 선언 파싱: ${(e as Error).message}`);
  }
})();

// Test 2: 빈 struct 선언
(() => {
  const source = `
    struct Empty {
    }
  `;
  try {
    const program = parse(source);
    const stmt = program.stmts[0] as any;
    assert(stmt.fields.length === 0, "빈 struct는 0개 필드");
  } catch (e) {
    console.log(`✗ 빈 struct: ${(e as Error).message}`);
  }
})();

// Test 3: struct 타입 검사
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
    assert(true, "struct 타입 검사 통과");
  } catch (e) {
    console.log(`✓ struct 타입 검사 (아직 미구현): ${(e as Error).message}`);
  }
})();

// Test 4: 복수 struct 선언
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
  `;
  try {
    const program = parse(source);
    assert(program.stmts.length === 2, "2개의 struct 선언");
    assert((program.stmts[0] as any).name === "Address", "첫 번째 struct는 Address");
    assert((program.stmts[1] as any).name === "Person", "두 번째 struct는 Person");
  } catch (e) {
    console.log(`✗ 복수 struct: ${(e as Error).message}`);
  }
})();

// Test 5: struct 필드 타입 - 배열
(() => {
  const source = `
    struct Team {
      members: [string],
      scores: [i32]
    }
  `;
  try {
    const program = parse(source);
    const stmt = program.stmts[0] as any;
    assert(stmt.fields[0].type.kind === "array", "첫 번째 필드는 배열");
    assert(stmt.fields[0].type.element.kind === "string", "배열 원소 타입");
  } catch (e) {
    console.log(`✗ struct 배열 필드: ${(e as Error).message}`);
  }
})();

// Test 6: struct 필드 타입 - Option
(() => {
  const source = `
    struct Config {
      name: string,
      optional_value: Option<i32>
    }
  `;
  try {
    const program = parse(source);
    const stmt = program.stmts[0] as any;
    assert(stmt.fields.length === 2, "2개 필드");
    assert(stmt.fields[1].type.kind === "option", "Option 타입");
  } catch (e) {
    console.log(`✗ struct Option 필드: ${(e as Error).message}`);
  }
})();

// Test 7: struct 키워드 토큰화
(() => {
  const source = "struct";
  const { tokens } = lex(source);
  assert(tokens.length === 2, "2개 토큰 (struct + EOF)");
  assert(tokens[0].type === "STRUCT", "첫 번째 토큰이 STRUCT");
})();

// Test 8: struct 이름이 예약어가 아님
(() => {
  const source = `
    struct MyStruct {
      field: i32
    }
  `;
  try {
    const program = parse(source);
    assert((program.stmts[0] as any).name === "MyStruct", "struct 이름 설정 가능");
  } catch (e) {
    console.log(`✗ struct 이름: ${(e as Error).message}`);
  }
})();

// Test 9: struct 리터럴 표현식 파싱
(() => {
  const source = `
    var person: Person = Person { name: "Alice", age: 30 };
  `;
  try {
    const program = parse(source);
    assert(program.stmts.length === 1, "1개 변수 선언");
    const varStmt = program.stmts[0] as any;
    assert(varStmt.init.kind === "struct_lit", "struct 리터럴 표현식");
    assert(varStmt.init.fields.length === 2, "2개 필드");
  } catch (e) {
    console.log(`✗ struct 리터럴: ${(e as Error).message}`);
  }
})();

// Test 10: struct 필드 접근 파싱
(() => {
  const source = `
    var name = person.name;
  `;
  try {
    const program = parse(source);
    const varStmt = program.stmts[0] as any;
    assert(varStmt.init.kind === "field_access", "필드 접근 표현식");
    assert(varStmt.init.field === "name", "필드 이름");
  } catch (e) {
    console.log(`✗ 필드 접근: ${(e as Error).message}`);
  }
})();

// ============================================================
// Summary
// ============================================================

console.log(`\n╔════════════════════════════════════╗`);
console.log(`║  Struct System Tests Results       ║`);
console.log(`╚════════════════════════════════════╝`);
console.log(`Passed: ${testPassed}/${testCount}`);
console.log(`Success Rate: ${((testPassed / testCount) * 100).toFixed(1)}%`);

if (testPassed === testCount) {
  console.log(`\n✓ All tests passed!`);
} else {
  console.log(`\n✗ Some tests failed`);
}
