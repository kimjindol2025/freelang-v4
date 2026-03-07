// FreeLang v4 — Struct Instance Tests (Phase 8.1 Complete) - Jest Format
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
// Jest Tests
// ============================================================

describe("Struct Instance Tests", () => {
  describe("기본 struct 인스턴스 생성", () => {
    it("struct 선언과 인스턴스 생성", () => {
      const source = `
        struct Point {
          x: f64,
          y: f64
        }
        var p = Point { x: 1.0, y: 2.0 };
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("struct 인스턴스 필드 접근", () => {
    it("필드 읽기 기본", () => {
      const source = `
        struct Person {
          name: string,
          age: i32
        }
        var alice = Person { name: "Alice", age: 30 };
        var name = alice.name;
        var age = alice.age;
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(4);
    });
  });

  describe("struct 필드 타입 검사", () => {
    it("필드 타입 불일치 감지", () => {
      const source = `
        struct Point {
          x: f64,
          y: f64
        }
        var p = Point { x: 1, y: 2.0 };
      `;
      expect(() => check(source)).toThrow();
    });
  });

  describe("struct 필드 누락 검사", () => {
    it("필드 누락 감지", () => {
      const source = `
        struct Person {
          name: string,
          age: i32
        }
        var bob = Person { name: "Bob" };
      `;
      expect(() => check(source)).toThrow();
    });
  });

  describe("struct 필드 초과 검사", () => {
    it("필드 초과 감지", () => {
      const source = `
        struct Point {
          x: f64,
          y: f64
        }
        var p = Point { x: 1.0, y: 2.0, z: 3.0 };
      `;
      expect(() => check(source)).toThrow();
    });
  });

  describe("undefined struct 검사", () => {
    it("정의되지 않은 struct 감지", () => {
      const source = `
        var p = Point { x: 1.0, y: 2.0 };
      `;
      expect(() => check(source)).toThrow();
    });
  });

  describe("struct 인스턴스 타입 검사", () => {
    it("타입 주석이 있는 struct 인스턴스", () => {
      const source = `
        struct Point {
          x: f64,
          y: f64
        }
        var p: Point = Point { x: 1.0, y: 2.0 };
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("중첩 struct", () => {
    it("struct 내부에 struct 필드", () => {
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
      const program = check(source);
      expect(program.stmts.length).toBe(4);
    });
  });

  describe("배열 필드", () => {
    it("struct에 배열 필드 사용", () => {
      const source = `
        struct Team {
          members: [string],
          scores: [i32]
        }
        var team = Team { members: ["Alice", "Bob"], scores: [10, 20] };
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("Option 필드", () => {
    it("struct에 Option 필드", () => {
      const source = `
        struct Config {
          name: string,
          value: Option<i32>
        }
        var config = Config { name: "test", value: Some(42) };
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(2);
    });
  });

  describe("필드 접근으로 값 추출", () => {
    it("여러 필드 접근", () => {
      const source = `
        struct Rectangle {
          width: f64,
          height: f64
        }
        var rect = Rectangle { width: 10.0, height: 5.0 };
        var w = rect.width;
        var h = rect.height;
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(4);
    });
  });

  describe("여러 struct 인스턴스", () => {
    it("같은 struct의 다중 인스턴스", () => {
      const source = `
        struct Point {
          x: f64,
          y: f64
        }
        var p1 = Point { x: 1.0, y: 2.0 };
        var p2 = Point { x: 3.0, y: 4.0 };
        var p3 = Point { x: 5.0, y: 6.0 };
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(4);
    });
  });

  describe("함수 내 struct 인스턴스", () => {
    it("함수에서 struct 반환", () => {
      const source = `
        struct Point {
          x: f64,
          y: f64
        }
        fn make_point(x: f64, y: f64) -> Point {
          Point { x: x, y: y }
        }
      `;
      const program = check(source);
      expect(program.stmts.length).toBe(2);
    });
  });
});
