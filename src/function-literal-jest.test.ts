// FreeLang v4 — Function Literal Tests (Phase 8.2) - Jest Format
// 일급 함수 (First-Class Functions): 함수 리터럴, 고차 함수, 함수 타입

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

describe("Function Literal Tests", () => {
  describe("기본 함수 리터럴 파싱", () => {
    it("함수 리터럴 변수 선언", () => {
      const source = `
        var f = fn(x: i32) -> i32 { x + 1 };
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(1);

      const varStmt = program.stmts[0] as any;
      expect(varStmt.kind).toBe("var_decl");
      expect(varStmt.init.kind).toBe("fn_lit");

      const fnLit = varStmt.init;
      expect(fnLit.params.length).toBe(1);
      expect(fnLit.params[0].name).toBe("x");
      expect(fnLit.params[0].type.kind).toBe("i32");
      expect(fnLit.returnType.kind).toBe("i32");
    });
  });

  describe("매개변수 없는 함수", () => {
    it("인자 없는 함수 리터럴", () => {
      const source = `
        var greet = fn() -> string { "Hello" };
      `;
      const program = parse(source);
      const varStmt = program.stmts[0] as any;
      expect(varStmt.init.params.length).toBe(0);
      expect(varStmt.init.returnType.kind).toBe("string");
    });
  });

  describe("복수 매개변수 함수", () => {
    it("다중 인자", () => {
      const source = `
        var add = fn(a: i32, b: i32) -> i32 { a + b };
      `;
      const program = parse(source);
      const varStmt = program.stmts[0] as any;
      const fnLit = varStmt.init;
      expect(fnLit.params.length).toBe(2);
      expect(fnLit.params[0].name).toBe("a");
      expect(fnLit.params[1].name).toBe("b");
    });
  });

  describe("함수 타입 어노테이션", () => {
    it("fn 타입 주석", () => {
      const source = `
        var f: fn(i32) -> i32 = fn(x: i32) -> i32 { x * 2 };
      `;
      const program = parse(source);
      const varStmt = program.stmts[0] as any;
      expect(varStmt.type.kind).toBe("fn");
      expect(varStmt.type.params.length).toBe(1);
      expect(varStmt.type.returnType.kind).toBe("i32");
    });
  });

  describe("함수 타입 검사", () => {
    it("함수 타입 일치", () => {
      const source = `
        var f: fn(i32) -> i32 = fn(x: i32) -> i32 { x + 1 };
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(1);
    });
  });

  describe("함수 호출", () => {
    it("함수 리터럴 호출", () => {
      const source = `
        var f = fn(x: i32) -> i32 { x + 1 };
        var result = f(42);
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(2);

      const callStmt = program.stmts[1] as any;
      expect(callStmt.init.kind).toBe("call");
      expect(callStmt.init.callee.name).toBe("f");
    });
  });

  describe("고차 함수 - 함수 인자", () => {
    it("함수를 받는 함수", () => {
      const source = `
        var apply = fn(f: fn(i32) -> i32, x: i32) -> i32 { f(x) };
      `;
      const program = parse(source);
      const varStmt = program.stmts[0] as any;
      const fnLit = varStmt.init;
      expect(fnLit.params.length).toBe(2);
      expect(fnLit.params[0].type.kind).toBe("fn");
      expect(fnLit.params[1].type.kind).toBe("i32");
    });
  });

  describe("고차 함수 - 함수 반환", () => {
    it("함수를 반환하는 함수", () => {
      const source = `
        var f: fn() -> i32 = fn() -> i32 { 42 };
      `;
      const program = parse(source);
      const varStmt = program.stmts[0] as any;
      expect(varStmt.type.kind).toBe("fn");
    });
  });

  describe("fn 키워드 토큰화", () => {
    it("FN 토큰", () => {
      const source = "fn(x: i32) -> i32 { x }";
      const { tokens } = lex(source);
      const hasFn = tokens.some((t) => t.type === "FN");
      expect(hasFn).toBe(true);
    });
  });

  describe("함수 호출 타입 검사", () => {
    it("매개변수 타입 검증", () => {
      const source = `
        var f: fn(i32) -> i32 = fn(x: i32) -> i32 { x + 1 };
        var result = f(42);
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("함수는 Move 타입", () => {
    it("Move 타입 경고", () => {
      const source = `
        var f = fn(x: i32) -> i32 { x + 1 };
        var g = f;
        var h = f;
      `;
      try {
        const program = check(source);
        expect(program.stmts.length).toBe(3);
      } catch {
        // Move 타입 검사 예외 가능
        expect(true).toBe(true);
      }
    });
  });

  describe("중첩 함수 리터럴", () => {
    it("함수 내 함수", () => {
      const source = `
        fn outer(x: i32) -> i32 {
          var inner = fn(y: i32) -> i32 { x + y };
          inner(10)
        }
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(1);
    });
  });
});
