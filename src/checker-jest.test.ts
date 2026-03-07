// FreeLang v4 — TypeChecker 테스트 - Jest Format

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

// ============================================================
// Jest Tests
// ============================================================

describe("TypeChecker Tests", () => {
  describe("타입 추론", () => {
    it("var x = 42 (i32 추론)", () => {
      const errors = check("var x = 42");
      expect(errors.length).toBe(0);
    });

    it("var x = 3.14 (f64 추론)", () => {
      const errors = check("var x = 3.14");
      expect(errors.length).toBe(0);
    });

    it('var x = "hello" (string 추론)', () => {
      const errors = check('var x = "hello"');
      expect(errors.length).toBe(0);
    });

    it("var x = true (bool 추론)", () => {
      const errors = check("var x = true");
      expect(errors.length).toBe(0);
    });

    it("var x: i32 = 42", () => {
      const errors = check("var x: i32 = 42");
      expect(errors.length).toBe(0);
    });

    it("var x: f64 = 3.14", () => {
      const errors = check("var x: f64 = 3.14");
      expect(errors.length).toBe(0);
    });
  });

  describe("타입 불일치", () => {
    it("i32 = string 불일치", () => {
      const errors = check('var x: i32 = "hello"');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("type mismatch");
    });

    it("bool = i32 불일치", () => {
      const errors = check("var x: bool = 42");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("type mismatch");
    });
  });

  describe("void 제약", () => {
    it("void 변수 금지", () => {
      const errors = check("var x: void = println()");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("void");
    });
  });

  describe("산술 연산", () => {
    it("i32 + i32", () => {
      const errors = check("fn f() -> i32 { return 1 + 2 }");
      expect(errors.length).toBe(0);
    });

    it("f64 + f64", () => {
      const errors = check("fn f() -> f64 { return 1.0 + 2.0 }");
      expect(errors.length).toBe(0);
    });

    it("i32 + f64 불일치", () => {
      const errors = check("fn f() -> i32 { return 1 + 1.0 }");
      expect(errors.length).toBeGreaterThan(0);
    });

    it("string + string", () => {
      const errors = check('fn f() -> string { return "a" + "b" }');
      expect(errors.length).toBe(0);
    });
  });

  describe("비교 연산", () => {
    it("== → bool", () => {
      const errors = check("fn f() -> bool { return 1 == 2 }");
      expect(errors.length).toBe(0);
    });

    it("< → bool", () => {
      const errors = check("fn f() -> bool { return 1 < 2 }");
      expect(errors.length).toBe(0);
    });
  });

  describe("논리 연산", () => {
    it("&& bool", () => {
      const errors = check("fn f() -> bool { return true && false }");
      expect(errors.length).toBe(0);
    });

    it("&& 에 i32 사용", () => {
      const errors = check("fn f() -> bool { return 1 && 2 }");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("requires bool");
    });
  });

  describe("단항 연산", () => {
    it("unary -", () => {
      const errors = check("fn f() -> i32 { return -42 }");
      expect(errors.length).toBe(0);
    });

    it("unary !", () => {
      const errors = check("fn f() -> bool { return !true }");
      expect(errors.length).toBe(0);
    });

    it("! 에 i32 사용", () => {
      const errors = check("fn f() -> bool { return !42 }");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("requires bool");
    });
  });

  describe("함수 검사", () => {
    it("반환 타입 불일치", () => {
      const errors = check('fn f() -> i32 { return "hello" }');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("return type mismatch");
    });

    it("인자 수 부족", () => {
      const errors = check(
        `fn add(a: i32, b: i32) -> i32 { return a + b }
add(1)`
      );
      expect(errors.length).toBeGreaterThan(0);
    });

    it("인자 타입 불일치", () => {
      const errors = check(
        `fn add(a: i32, b: i32) -> i32 { return a + b }
add(1, "two")`
      );
      expect(errors.length).toBeGreaterThan(0);
    });

    it("함수 전방참조", () => {
      const errors = check(`
fn main() -> void { println(str(add(1, 2))) }
fn add(a: i32, b: i32) -> i32 { return a + b }
`);
      expect(errors.length).toBe(0);
    });

    it("함수 중복 선언", () => {
      const errors = check(`fn f() -> void { }
fn f() -> void { }`);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("불변성", () => {
    it("var 재할당 허용", () => {
      const errors = check("var x = 1\nx = 2");
      expect(errors.length).toBe(0);
    });

    it("let 재할당 금지", () => {
      const errors = check("let x = 1\nx = 2");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain("immutable");
    });
  });
});
