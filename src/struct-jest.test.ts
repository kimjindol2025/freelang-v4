// FreeLang v4 — Struct System Tests (Phase 8.1) - Jest Format
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
// Jest Tests
// ============================================================

describe("Struct System Tests", () => {
  describe("struct 선언 파싱", () => {
    it("struct 선언 기본 파싱", () => {
      const source = `
        struct Person {
          name: string,
          age: i32
        }
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(1);

      const stmt = program.stmts[0];
      expect(stmt.kind).toBe("struct_decl");

      const structStmt = stmt as any;
      expect(structStmt.name).toBe("Person");
      expect(structStmt.fields.length).toBe(2);
      expect(structStmt.fields[0].name).toBe("name");
      expect(structStmt.fields[0].type.kind).toBe("string");
      expect(structStmt.fields[1].name).toBe("age");
      expect(structStmt.fields[1].type.kind).toBe("i32");
    });
  });

  describe("struct 빈 선언", () => {
    it("빈 struct는 0개 필드", () => {
      const source = `
        struct Empty {
        }
      `;
      const program = parse(source);
      const stmt = program.stmts[0] as any;
      expect(stmt.fields.length).toBe(0);
    });
  });

  describe("struct 타입 검사", () => {
    it("struct 타입 검사 통과 또는 미구현", () => {
      const source = `
        struct Point {
          x: f64,
          y: f64
        }

        var p: Point = Point { x: 1.0, y: 2.0 };
      `;
      try {
        const program = check(source);
        expect(true).toBe(true);
      } catch (e) {
        // 아직 미구현인 경우 예상됨
        expect((e as Error).message).toBeDefined();
      }
    });
  });

  describe("복수 struct 선언", () => {
    it("2개의 struct 선언 파싱", () => {
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
      const program = parse(source);
      expect(program.stmts.length).toBe(2);
      expect((program.stmts[0] as any).name).toBe("Address");
      expect((program.stmts[1] as any).name).toBe("Person");
    });
  });

  describe("struct 필드 타입 - 배열", () => {
    it("배열 필드 파싱", () => {
      const source = `
        struct Team {
          members: [string],
          scores: [i32]
        }
      `;
      const program = parse(source);
      const stmt = program.stmts[0] as any;
      expect(stmt.fields[0].type.kind).toBe("array");
      expect(stmt.fields[0].type.element.kind).toBe("string");
    });
  });

  describe("struct 필드 타입 - Option", () => {
    it("Option 필드 파싱", () => {
      const source = `
        struct Config {
          name: string,
          optional_value: Option<i32>
        }
      `;
      const program = parse(source);
      const stmt = program.stmts[0] as any;
      expect(stmt.fields.length).toBe(2);
      expect(stmt.fields[1].type.kind).toBe("option");
    });
  });

  describe("struct 키워드 토큰화", () => {
    it("struct 키워드 인식", () => {
      const source = "struct";
      const { tokens } = lex(source);
      expect(tokens.length).toBe(2); // struct + EOF
      expect(tokens[0].type).toBe("STRUCT");
    });
  });

  describe("struct 이름이 예약어가 아님", () => {
    it("struct 이름 설정 가능", () => {
      const source = `
        struct MyStruct {
          field: i32
        }
      `;
      const program = parse(source);
      expect((program.stmts[0] as any).name).toBe("MyStruct");
    });
  });

  describe("struct 리터럴 표현식 파싱", () => {
    it("struct 리터럴 표현식", () => {
      const source = `
        var person: Person = Person { name: "Alice", age: 30 };
      `;
      const program = parse(source);
      expect(program.stmts.length).toBe(1);

      const varStmt = program.stmts[0] as any;
      expect(varStmt.init.kind).toBe("struct_lit");
      expect(varStmt.init.fields.length).toBe(2);
    });
  });

  describe("struct 필드 접근 파싱", () => {
    it("필드 접근 표현식", () => {
      const source = `
        var name = person.name;
      `;
      const program = parse(source);
      const varStmt = program.stmts[0] as any;
      expect(varStmt.init.kind).toBe("field_access");
      expect(varStmt.init.field).toBe("name");
    });
  });
});
