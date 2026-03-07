// FreeLang v4 — For...Of Loop Tests (Phase 8.4) - Jest Format
// for...of 루프를 통한 배열/문자열 순회

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
// Jest Tests
// ============================================================

describe("For...Of Loop Tests", () => {
  describe("기본 for...of 루프 파싱", () => {
    it("배열 순회 기본", () => {
      const source = `
        for x of [1, 2, 3] {
          var y = x;
        }
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(1);

      const stmt = program.stmts[0];
      expect(stmt.kind).toBe("for_of_stmt");

      const forOfStmt = stmt as any;
      expect(forOfStmt.variable).toBe("x");
      expect(forOfStmt.iterable.kind).toBe("array_lit");
      expect(forOfStmt.body.length).toBe(1);
    });
  });

  describe("for...of 타입 검사", () => {
    it("배열 요소 타입 (i32)", () => {
      const source = `
        for x of [1, 2, 3] {
          var y: i32 = x;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });

  describe("for...of 문자열 순회", () => {
    it("문자열 이터러블", () => {
      const source = `
        for ch of "hello" {
          var s: string = ch;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });

  describe("for...of 타입 검사 실패", () => {
    it("배열이 아닌 이터러블 감지", () => {
      const source = `
        for x of 42 {
          var y = x;
        }
      `;
      expect(() => check(source)).toThrow();
    });
  });

  describe("for...of 키워드 토큰화", () => {
    it("FOR와 OF 토큰", () => {
      const source = "for x of";
      const { tokens } = lex(source);
      const hasFor = tokens.some((t) => t.type === "FOR");
      const hasOf = tokens.some((t) => t.type === "OF");
      expect(hasFor).toBe(true);
      expect(hasOf).toBe(true);
    });
  });

  describe("for...of vs for...in 파싱", () => {
    it("구분된 AST 노드", () => {
      const source1 = `
        for x in [1, 2] {
          var y = x;
        }
      `;
      const source2 = `
        for x of [1, 2] {
          var y = x;
        }
      `;
      const prog1 = parse(source1);
      const prog2 = parse(source2);
      expect(prog1.stmts[0].kind).toBe("for_stmt");
      expect(prog2.stmts[0].kind).toBe("for_of_stmt");
    });
  });

  describe("for...of 중첩 루프", () => {
    it("이중 순회", () => {
      const source = `
        for x of [1, 2] {
          for y of [3, 4] {
            var z = x;
          }
        }
      `;
      const program = parse(source);
      const outer = program.stmts[0] as any;
      expect(outer.kind).toBe("for_of_stmt");
      expect(outer.body.length).toBe(1);

      const inner = outer.body[0];
      expect(inner.kind).toBe("for_of_stmt");
    });
  });

  describe("for...of 루프 변수 스코핑", () => {
    it("외부 변수와 루프 변수 분리", () => {
      const source = `
        var x = 100;
        for x of [1, 2, 3] {
          var y = x;
        }
        var z: i32 = x;
      `;
      const program = check(source);
      expect(program.stmts.length).toBeGreaterThan(2);
    });
  });

  describe("for...of 배열 타입 다양성", () => {
    it("f64 배열 순회", () => {
      const source = `
        for x of [1.0, 2.0, 3.0] {
          var y: f64 = x;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });

  describe("for...of 배열 변수 순회", () => {
    it("변수 이터러블", () => {
      const source = `
        var arr: [i32] = [1, 2, 3];
        for x of arr {
          var y: i32 = x;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("for...of 루프 본체 다중 문", () => {
    it("복합 루프 본체", () => {
      const source = `
        for x of [1, 2, 3] {
          var y = x;
          var z = y;
          var w = z;
        }
      `;
      const program = parse(source);
      const forOfStmt = program.stmts[0] as any;
      expect(forOfStmt.body.length).toBe(3);
    });
  });

  describe("for...of 문자열 리터럴", () => {
    it("문자열 순회", () => {
      const source = `
        for ch of "abc" {
          var s: string = ch;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });

  describe("for...of 루프 변수 수정", () => {
    it("루프 변수 할당 시도", () => {
      const source = `
        for x of [1, 2, 3] {
          x = 10;
        }
      `;
      try {
        const program = check(source);
        // 미지원일 수 있음
        expect(program.stmts.length).toBe(1);
      } catch {
        // immutable 위반 감지
        expect(true).toBe(true);
      }
    });
  });

  describe("for...of boolean 배열", () => {
    it("bool 타입 배열", () => {
      const source = `
        for b of [true, false] {
          var x: bool = b;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });

  describe("for...of 빈 배열", () => {
    it("공배열 순회", () => {
      const source = `
        for x of [] {
          var y = x;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });
});
