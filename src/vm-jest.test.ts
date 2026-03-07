// FreeLang v4 — VM 테스트 (E2E: Source → Lexer → Parser → Compiler → VM) - Jest Format

import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Compiler } from "./compiler";
import { VM } from "./vm";

function exec(source: string): { output: string[]; error: string | null } {
  const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
  if (lexErrors.length > 0) throw new Error(`Lex: ${lexErrors[0].message}`);
  const { program, errors: parseErrors } = new Parser(tokens).parse();
  if (parseErrors.length > 0) throw new Error(`Parse: ${parseErrors[0].message}`);
  const chunk = new Compiler().compile(program);
  return new VM().run(chunk);
}

// ============================================================
// Jest Tests
// ============================================================

describe("VM E2E Tests", () => {
  describe("println 기본", () => {
    it('println("hello")', () => {
      const { output } = exec('println("hello")');
      expect(output).toEqual(["hello"]);
    });

    it('println("hello world")', () => {
      const { output } = exec('println("hello world")');
      expect(output).toEqual(["hello world"]);
    });
  });

  describe("정수 산술", () => {
    it("1 + 2 = 3", () => {
      const { output } = exec('println(str(1 + 2))');
      expect(output).toEqual(["3"]);
    });

    it("10 - 3 = 7", () => {
      const { output } = exec('println(str(10 - 3))');
      expect(output).toEqual(["7"]);
    });

    it("4 * 5 = 20", () => {
      const { output } = exec('println(str(4 * 5))');
      expect(output).toEqual(["20"]);
    });

    it("10 / 3 = 3 (i32 truncate)", () => {
      const { output } = exec('println(str(10 / 3))');
      expect(output).toEqual(["3"]);
    });

    it("7 % 3 = 1", () => {
      const { output } = exec('println(str(7 % 3))');
      expect(output).toEqual(["1"]);
    });

    it("-42 (negate)", () => {
      const { output } = exec('println(str(-42))');
      expect(output).toEqual(["-42"]);
    });

    it("2 + 3 * 4 = 14 (precedence)", () => {
      const { output } = exec('println(str(2 + 3 * 4))');
      expect(output).toEqual(["14"]);
    });
  });

  describe("문자열 연결", () => {
    it('string concat', () => {
      const { output } = exec('println("hello" + " " + "world")');
      expect(output).toEqual(["hello world"]);
    });
  });

  describe("비교 + 논리", () => {
    it("1 == 1", () => {
      const { output } = exec('println(str(1 == 1))');
      expect(output).toEqual(["true"]);
    });

    it("1 == 2", () => {
      const { output } = exec('println(str(1 == 2))');
      expect(output).toEqual(["false"]);
    });

    it("1 != 2", () => {
      const { output } = exec('println(str(1 != 2))');
      expect(output).toEqual(["true"]);
    });

    it("1 < 2", () => {
      const { output } = exec('println(str(1 < 2))');
      expect(output).toEqual(["true"]);
    });

    it("2 > 1", () => {
      const { output } = exec('println(str(2 > 1))');
      expect(output).toEqual(["true"]);
    });

    it("true && false", () => {
      const { output } = exec('println(str(true && false))');
      expect(output).toEqual(["false"]);
    });

    it("false || true", () => {
      const { output } = exec('println(str(false || true))');
      expect(output).toEqual(["true"]);
    });
  });

  describe("변수", () => {
    it("var x = 42", () => {
      const { output } = exec("var x = 42\nprintln(str(x))");
      expect(output).toEqual(["42"]);
    });

    it("var name = string", () => {
      const { output } = exec('var name = "FreeLang"\nprintln(name)');
      expect(output).toEqual(["FreeLang"]);
    });

    it("var reassign", () => {
      const { output } = exec("var x = 1\nx = 2\nprintln(str(x))");
      expect(output).toEqual(["2"]);
    });

    it("a + b = 30", () => {
      const { output } = exec("var a = 10\nvar b = 20\nprintln(str(a + b))");
      expect(output).toEqual(["30"]);
    });
  });

  describe("함수", () => {
    it("fn add(3,4) = 7", () => {
      const { output } = exec(
        `fn add(a: i32, b: i32) -> i32 { return a + b }
println(str(add(3, 4)))`
      );
      expect(output).toEqual(["7"]);
    });

    it("fn double(21) = 42", () => {
      const { output } = exec(
        `fn double(n: i32) -> i32 { return n * 2 }
println(str(double(21)))`
      );
      expect(output).toEqual(["42"]);
    });

    it("fn greet void", () => {
      const { output } = exec(
        `fn greet(name: string) -> void { println("Hello " + name) }
greet("FreeLang")`
      );
      expect(output).toEqual(["Hello FreeLang"]);
    });

    it("factorial(5) = 120", () => {
      const { output } = exec(
        `fn factorial(n: i32) -> i32 {
  if n <= 1 { return 1 }
  return n * factorial(n + -1)
}
println(str(factorial(5)))`
      );
      expect(output).toEqual(["120"]);
    });
  });

  describe("if 문", () => {
    it("if true", () => {
      const { output } = exec('if true { println("yes") }');
      expect(output).toEqual(["yes"]);
    });

    it("if false (skip)", () => {
      const { output } = exec('if false { println("yes") }');
      expect(output).toEqual([]);
    });

    it("if-else true", () => {
      const { output } = exec(
        'if true { println("yes") } else { println("no") }'
      );
      expect(output).toEqual(["yes"]);
    });

    it("if-else false", () => {
      const { output } = exec(
        'if false { println("yes") } else { println("no") }'
      );
      expect(output).toEqual(["no"]);
    });

    it("nested if", () => {
      const { output } = exec(
        `var x = 10
if x > 5 {
  if x > 20 {
    println("big")
  } else {
    println("medium")
  }
} else {
  println("small")
}`
      );
      expect(output).toEqual(["medium"]);
    });
  });

  describe("for 문", () => {
    it("for...in [1,2,3]", () => {
      const { output } = exec(
        `for x in [1, 2, 3] {
  println(str(x))
}`
      );
      expect(output).toEqual(["1", "2", "3"]);
    });

    it("for sum = 60", () => {
      const { output } = exec(
        `var total: i32 = 0
for x in [10, 20, 30] {
  total = total + x
}
println(str(total))`
      );
      expect(output).toEqual(["60"]);
    });

    it("for...in range(0,5)", () => {
      const { output } = exec(
        `for i in range(0, 5) {
  println(str(i))
}`
      );
      expect(output).toEqual(["0", "1", "2", "3", "4"]);
    });
  });

  describe("while 문", () => {
    it("while 기본", () => {
      const { output } = exec(
        `var i: i32 = 0
while i < 3 {
  println(str(i))
  i = i + 1
}`
      );
      expect(output).toEqual(["0", "1", "2"]);
    });

    it("while break", () => {
      const { output } = exec(
        `var i: i32 = 0
while true {
  if i >= 2 { break }
  println(str(i))
  i = i + 1
}`
      );
      expect(output).toEqual(["0", "1"]);
    });
  });

  describe("배열", () => {
    it("배열 생성", () => {
      const { output } = exec(
        `var arr = [1, 2, 3]
println(str(length(arr)))`
      );
      expect(output).toEqual(["3"]);
    });

    it("배열 인덱싱", () => {
      const { output } = exec(
        `var arr = ["a", "b", "c"]
println(arr[1])`
      );
      expect(output).toEqual(["b"]);
    });
  });
});
