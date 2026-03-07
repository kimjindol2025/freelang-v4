// FreeLang v4 — Compiler 테스트 - Jest Format

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Compiler, Chunk, Op } from "./compiler";

function compile(source: string): Chunk {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex: ${lexErrors[0].message}`);
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) throw new Error(`Parse: ${parseErrors[0].message}`);
  return new Compiler().compile(program);
}

function findOp(chunk: Chunk, op: Op): boolean {
  return chunk.code.includes(op);
}

function countOp(chunk: Chunk, op: Op): number {
  return chunk.code.filter((b) => b === op).length;
}

// ============================================================
// Jest Tests
// ============================================================

describe("Compiler Tests", () => {
  describe("상수 로드", () => {
    it("정수 리터럴", () => {
      const c = compile("42");
      expect(findOp(c, Op.PUSH_I32)).toBe(true);
      expect(findOp(c, Op.HALT)).toBe(true);
    });

    it("부동소수점 리터럴", () => {
      const c = compile("3.14");
      expect(findOp(c, Op.PUSH_F64)).toBe(true);
    });

    it("문자열 리터럴", () => {
      const c = compile('"hello"');
      expect(findOp(c, Op.PUSH_STR)).toBe(true);
      expect(c.constants.includes("hello")).toBe(true);
    });

    it("true 리터럴", () => {
      const c = compile("true");
      expect(findOp(c, Op.PUSH_TRUE)).toBe(true);
    });

    it("false 리터럴", () => {
      const c = compile("false");
      expect(findOp(c, Op.PUSH_FALSE)).toBe(true);
    });
  });

  describe("산술 연산", () => {
    it("1 + 2", () => {
      const c = compile("1 + 2");
      expect(findOp(c, Op.ADD_I32)).toBe(true);
    });

    it("3 - 1", () => {
      const c = compile("3 - 1");
      expect(findOp(c, Op.SUB_I32)).toBe(true);
    });

    it("2 * 3", () => {
      const c = compile("2 * 3");
      expect(findOp(c, Op.MUL_I32)).toBe(true);
    });

    it("6 / 2", () => {
      const c = compile("6 / 2");
      expect(findOp(c, Op.DIV_I32)).toBe(true);
    });

    it("7 % 3", () => {
      const c = compile("7 % 3");
      expect(findOp(c, Op.MOD_I32)).toBe(true);
    });
  });

  describe("비교 + 논리", () => {
    it("==", () => {
      const c = compile("1 == 2");
      expect(findOp(c, Op.EQ)).toBe(true);
    });

    it("!=", () => {
      const c = compile("1 != 2");
      expect(findOp(c, Op.NEQ)).toBe(true);
    });

    it("<", () => {
      const c = compile("1 < 2");
      expect(findOp(c, Op.LT)).toBe(true);
    });

    it("&&", () => {
      const c = compile("true && false");
      expect(findOp(c, Op.AND)).toBe(true);
    });

    it("||", () => {
      const c = compile("true || false");
      expect(findOp(c, Op.OR)).toBe(true);
    });
  });

  describe("단항 연산", () => {
    it("-42", () => {
      const c = compile("-42");
      expect(findOp(c, Op.NEG_I32)).toBe(true);
    });

    it("!true", () => {
      const c = compile("!true");
      expect(findOp(c, Op.NOT)).toBe(true);
    });
  });

  describe("변수", () => {
    it("var x = 42", () => {
      const c = compile("var x = 42");
      expect(findOp(c, Op.STORE_LOCAL)).toBe(true);
    });

    it("var x = 42; x + 1", () => {
      const c = compile("var x = 42\nx + 1");
      expect(findOp(c, Op.STORE_LOCAL)).toBe(true);
      expect(findOp(c, Op.LOAD_LOCAL)).toBe(true);
      expect(findOp(c, Op.ADD_I32)).toBe(true);
    });
  });

  describe("함수 호출", () => {
    it("println은 builtin 함수", () => {
      const c = compile('println("hello")');
      const hasCall = findOp(c, Op.CALL_BUILTIN) || findOp(c, Op.CALL);
      expect(hasCall).toBe(true);
    });
  });

  describe("제어흐름", () => {
    it("if 문", () => {
      const c = compile("if true { var x = 1 }");
      expect(findOp(c, Op.JUMP_IF_FALSE)).toBe(true);
    });

    it("while 문", () => {
      const c = compile("while true { var x = 1 }");
      expect(findOp(c, Op.JUMP)).toBe(true);
    });
  });

  describe("배열", () => {
    it("배열 리터럴", () => {
      const c = compile("[1, 2, 3]");
      expect(findOp(c, Op.ARRAY_NEW)).toBe(true);
    });

    it("배열 인덱싱", () => {
      const c = compile("var arr = [1, 2, 3]\narr[0]");
      expect(findOp(c, Op.ARRAY_GET)).toBe(true);
    });
  });
});
