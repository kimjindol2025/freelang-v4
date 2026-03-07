// FreeLang v4 — While Loop Tests (Phase 8.3) - Jest Format
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
// Jest Tests
// ============================================================

describe("While Loop Tests", () => {
  describe("기본 while 루프 파싱", () => {
    it("while 루프 기본", () => {
      const source = `
        while true {
          var x = 1;
        }
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(1);

      const stmt = program.stmts[0];
      expect(stmt.kind).toBe("while_stmt");

      const whileStmt = stmt as any;
      expect(whileStmt.condition.kind).toBe("bool_lit");
      expect(whileStmt.body.length).toBe(1);
    });
  });

  describe("while 조건 타입 검사", () => {
    it("bool 조건 검증", () => {
      const source = `
        while true {
          var x = 1;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });

  describe("while 조건 타입 오류", () => {
    it("bool이 아닌 조건 감지", () => {
      const source = `
        while 42 {
          var x = 1;
        }
      `;
      expect(() => check(source)).toThrow();
    });
  });

  describe("break 문 파싱", () => {
    it("break 문 인식", () => {
      const source = `
        while true {
          break;
        }
      `;
      const program = parse(source);
      const whileStmt = program.stmts[0] as any;
      expect(whileStmt.body.length).toBe(1);

      const breakStmt = whileStmt.body[0];
      expect(breakStmt.kind).toBe("break_stmt");
    });
  });

  describe("continue 문 파싱", () => {
    it("continue 문 인식", () => {
      const source = `
        while true {
          continue;
        }
      `;
      const program = parse(source);
      const whileStmt = program.stmts[0] as any;
      expect(whileStmt.body.length).toBe(1);

      const continueStmt = whileStmt.body[0];
      expect(continueStmt.kind).toBe("continue_stmt");
    });
  });

  describe("while 루프 복합 본체", () => {
    it("다중 문 포함", () => {
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
      const program = parse(source);
      const whileStmt = program.stmts[0] as any;
      expect(whileStmt.body.length).toBe(3);
    });
  });

  describe("while 키워드 토큰화", () => {
    it("WHILE 토큰", () => {
      const source = "while";
      const { tokens } = lex(source);
      const hasWhile = tokens.some((t) => t.type === "WHILE");
      expect(hasWhile).toBe(true);
    });
  });

  describe("break 키워드 토큰화", () => {
    it("BREAK 토큰", () => {
      const source = "break";
      const { tokens } = lex(source);
      const hasBreak = tokens.some((t) => t.type === "BREAK");
      expect(hasBreak).toBe(true);
    });
  });

  describe("continue 키워드 토큰화", () => {
    it("CONTINUE 토큰", () => {
      const source = "continue";
      const { tokens } = lex(source);
      const hasContinue = tokens.some((t) => t.type === "CONTINUE");
      expect(hasContinue).toBe(true);
    });
  });

  describe("중첩 while 루프", () => {
    it("이중 루프", () => {
      const source = `
        while true {
          while false {
            break;
          }
          break;
        }
      `;
      const program = parse(source);
      const outer = program.stmts[0] as any;
      expect(outer.body.length).toBe(2);

      const inner = outer.body[0];
      expect(inner.kind).toBe("while_stmt");
    });
  });

  describe("while 루프 조건식", () => {
    it("조건식 타입 검사", () => {
      const source = `
        var x = 0;
        while x < 10 {
          x = x + 1;
          if x == 5 {
            break;
          }
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("while 조건 변수 접근", () => {
    it("변수 기반 조건", () => {
      const source = `
        var done = false;
        while !done {
          var x = 1;
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("break와 continue 혼합", () => {
    it("조건부 제어흐름", () => {
      const source = `
        while true {
          if false {
            break;
          } else {
            continue;
          }
        }
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(1);
    });
  });
});
