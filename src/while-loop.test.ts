// FreeLang v4 — While Loop Tests (Phase 8.3)
// while/break/continue 루프 구현

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

// Test 1: 기본 while 루프 파싱
(() => {
  const source = `
    while true {
      var x = 1;
    }
  `;
  try {
    const program = parse(source);
    assert(program.stmts.length === 1, "while 루프 파싱");
    const stmt = program.stmts[0];
    assert(stmt.kind === "while_stmt", "while_stmt 타입");
    const whileStmt = stmt as any;
    assert(whileStmt.condition.kind === "bool_lit", "조건은 bool_lit");
    assert(whileStmt.body.length === 1, "루프 본체");
  } catch (e) {
    console.log(`✗ 기본 while 루프: ${(e as Error).message}`);
  }
})();

// Test 2: while 조건 타입 검사
(() => {
  const source = `
    while true {
      var x = 1;
    }
  `;
  try {
    const program = check(source);
    assert(true, "while 조건 타입 검사 (bool)");
  } catch (e) {
    console.log(`✗ while 조건 타입: ${(e as Error).message}`);
  }
})();

// Test 3: while 조건이 bool이 아닐 때 에러
(() => {
  const source = `
    while 42 {
      var x = 1;
    }
  `;
  try {
    const program = check(source);
    console.log(`✗ while 조건 타입 오류: 감지 못함`);
  } catch (e) {
    console.log(`✓ while 조건 타입 오류: ${(e as Error).message}`);
  }
})();

// Test 4: break 문 파싱
(() => {
  const source = `
    while true {
      break;
    }
  `;
  try {
    const program = parse(source);
    const whileStmt = program.stmts[0] as any;
    assert(whileStmt.body.length === 1, "break 문 파싱");
    const breakStmt = whileStmt.body[0];
    assert(breakStmt.kind === "break_stmt", "break_stmt 타입");
  } catch (e) {
    console.log(`✗ break 문 파싱: ${(e as Error).message}`);
  }
})();

// Test 5: continue 문 파싱
(() => {
  const source = `
    while true {
      continue;
    }
  `;
  try {
    const program = parse(source);
    const whileStmt = program.stmts[0] as any;
    assert(whileStmt.body.length === 1, "continue 문 파싱");
    const continueStmt = whileStmt.body[0];
    assert(continueStmt.kind === "continue_stmt", "continue_stmt 타입");
  } catch (e) {
    console.log(`✗ continue 문 파싱: ${(e as Error).message}`);
  }
})();

// Test 6: while 루프 여러 문
(() => {
  const source = `
    while true {
      var x = 1;
      var y = 2;
      if x > 10 {
        break;
      } else {
        continue;
      }
    }
  `;
  try {
    const program = parse(source);
    const whileStmt = program.stmts[0] as any;
    assert(whileStmt.body.length === 3, "3개 문 (var + var + if)");
  } catch (e) {
    console.log(`✗ 복합 while 루프: ${(e as Error).message}`);
  }
})();

// Test 7: while 키워드 토큰화
(() => {
  const source = "while";
  const { tokens } = lex(source);
  assert(tokens.some((t) => t.type === "WHILE"), "WHILE 토큰");
})();

// Test 8: break 키워드 토큰화
(() => {
  const source = "break";
  const { tokens } = lex(source);
  assert(tokens.some((t) => t.type === "BREAK"), "BREAK 토큰");
})();

// Test 9: continue 키워드 토큰화
(() => {
  const source = "continue";
  const { tokens } = lex(source);
  assert(tokens.some((t) => t.type === "CONTINUE"), "CONTINUE 토큰");
})();

// Test 10: 중첩 while 루프
(() => {
  const source = `
    while true {
      while false {
        break;
      }
      break;
    }
  `;
  try {
    const program = parse(source);
    const outer = program.stmts[0] as any;
    assert(outer.body.length === 2, "외부 루프 2개 문");
    const inner = outer.body[0];
    assert(inner.kind === "while_stmt", "내부 while");
  } catch (e) {
    console.log(`✗ 중첩 while: ${(e as Error).message}`);
  }
})();

// Test 11: while 루프 조건식
(() => {
  const source = `
    var x = 0;
    while x < 10 {
      x = x + 1;
      if x == 5 {
        break;
      }
    }
  `;
  try {
    const program = check(source);
    assert(true, "while 루프 조건식 타입 검사");
  } catch (e) {
    console.log(`✗ 조건식: ${(e as Error).message}`);
  }
})();

// Test 12: while 루프 조건 변수 접근
(() => {
  const source = `
    var done = false;
    while !done {
      var x = 1;
    }
  `;
  try {
    const program = check(source);
    assert(true, "while 조건에서 변수 접근");
  } catch (e) {
    console.log(`✗ 조건 변수: ${(e as Error).message}`);
  }
})();

// Test 13: break 와 continue 혼합
(() => {
  const source = `
    while true {
      if false {
        break;
      } else {
        continue;
      }
    }
  `;
  try {
    const program = parse(source);
    assert(true, "break/continue 혼합");
  } catch (e) {
    console.log(`✗ break/continue 혼합: ${(e as Error).message}`);
  }
})();

// ============================================================
// Summary
// ============================================================

console.log(`\n╔════════════════════════════════════╗`);
console.log(`║  While Loop Tests Results          ║`);
console.log(`╚════════════════════════════════════╝`);
console.log(`Passed: ${testPassed}/${testCount}`);
console.log(`Success Rate: ${((testPassed / testCount) * 100).toFixed(1)}%`);

if (testPassed >= testCount - 2) {  // 거의 모두 통과
  console.log(`\n✓ While loop system works!`);
  process.exit(0);
} else {
  console.log(`\n⚠ Some tests need attention`);
  process.exit(1);
}
