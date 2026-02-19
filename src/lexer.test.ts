// FreeLang v4 — Lexer 테스트

import { Lexer, TokenType, Token, LexError } from "./lexer";

function lex(source: string): { tokens: Token[]; errors: LexError[] } {
  return new Lexer(source).tokenize();
}

function types(source: string): TokenType[] {
  return lex(source).tokens.map((t) => t.type);
}

function lexemes(source: string): string[] {
  return lex(source).tokens.map((t) => t.lexeme);
}

// ============================================================
// 1. 키워드 (13개)
// ============================================================

console.log("=== 키워드 테스트 ===");

{
  const r = lex("var let const fn if else match for in return spawn true false");
  const kw = r.tokens.slice(0, -1); // EOF 제외
  console.assert(kw.length === 13, `키워드 13개 예상, 실제 ${kw.length}`);
  console.assert(kw[0].type === TokenType.VAR, "var");
  console.assert(kw[1].type === TokenType.LET, "let");
  console.assert(kw[2].type === TokenType.CONST, "const");
  console.assert(kw[3].type === TokenType.FN, "fn");
  console.assert(kw[4].type === TokenType.IF, "if");
  console.assert(kw[5].type === TokenType.ELSE, "else");
  console.assert(kw[6].type === TokenType.MATCH, "match");
  console.assert(kw[7].type === TokenType.FOR, "for");
  console.assert(kw[8].type === TokenType.IN, "in");
  console.assert(kw[9].type === TokenType.RETURN, "return");
  console.assert(kw[10].type === TokenType.SPAWN, "spawn");
  console.assert(kw[11].type === TokenType.TRUE, "true");
  console.assert(kw[12].type === TokenType.FALSE, "false");
  console.log("  ✅ 키워드 13개 통과");
}

// ============================================================
// 2. 타입 이름 (7개)
// ============================================================

console.log("=== 타입 이름 테스트 ===");

{
  const r = lex("i32 i64 f64 bool string void channel");
  const t = r.tokens.slice(0, -1);
  console.assert(t.length === 7, `타입 7개 예상, 실제 ${t.length}`);
  console.assert(t[0].type === TokenType.TYPE_I32, "i32");
  console.assert(t[1].type === TokenType.TYPE_I64, "i64");
  console.assert(t[2].type === TokenType.TYPE_F64, "f64");
  console.assert(t[3].type === TokenType.TYPE_BOOL, "bool");
  console.assert(t[4].type === TokenType.TYPE_STRING, "string");
  console.assert(t[5].type === TokenType.TYPE_VOID, "void");
  console.assert(t[6].type === TokenType.TYPE_CHANNEL, "channel");
  console.log("  ✅ 타입 이름 7개 통과");
}

// ============================================================
// 3. Option/Result/Ok/Err/Some/None은 IDENT (SPEC_04 Q4)
// ============================================================

console.log("=== Option/Result은 IDENT 테스트 ===");

{
  const r = lex("Option Result Ok Err Some None");
  const t = r.tokens.slice(0, -1);
  for (const tok of t) {
    console.assert(tok.type === TokenType.IDENT, `${tok.lexeme}은 IDENT여야 함, 실제 ${tok.type}`);
  }
  console.log("  ✅ Option/Result/Ok/Err/Some/None = IDENT 통과");
}

// ============================================================
// 4. 식별자
// ============================================================

console.log("=== 식별자 테스트 ===");

{
  const r = lex("x my_func _tmp abc123 _");
  const t = r.tokens.slice(0, -1);
  console.assert(t.length === 5, `식별자 5개 예상`);
  for (const tok of t) {
    console.assert(tok.type === TokenType.IDENT, `${tok.lexeme}은 IDENT여야 함`);
  }
  console.assert(t[0].lexeme === "x");
  console.assert(t[1].lexeme === "my_func");
  console.assert(t[2].lexeme === "_tmp");
  console.assert(t[3].lexeme === "abc123");
  console.assert(t[4].lexeme === "_");
  console.log("  ✅ 식별자 통과");
}

// ============================================================
// 5. 정수 리터럴 (SPEC_04 Q5)
// ============================================================

console.log("=== 정수 리터럴 테스트 ===");

{
  const r = lex("0 42 1000 1_000 1_000_000");
  const t = r.tokens.slice(0, -1);
  console.assert(t.length === 5, `정수 5개 예상`);
  for (const tok of t) {
    console.assert(tok.type === TokenType.INT_LIT, `${tok.lexeme}은 INT_LIT여야 함`);
  }
  console.assert(t[0].lexeme === "0");
  console.assert(t[1].lexeme === "42");
  console.assert(t[2].lexeme === "1000");
  console.assert(t[3].lexeme === "1_000");
  console.assert(t[4].lexeme === "1_000_000");
  console.log("  ✅ 정수 리터럴 통과");
}

// 끝 밑줄 에러
{
  const r = lex("42_");
  console.assert(r.errors.length > 0, "끝 밑줄 에러 예상");
  console.assert(r.errors[0].message === "trailing underscore in number");
  console.log("  ✅ 끝 밑줄 에러 통과");
}

// 연속 밑줄 에러
{
  const r = lex("4__2");
  console.assert(r.errors.length > 0, "연속 밑줄 에러 예상");
  console.assert(r.errors[0].message === "consecutive underscores in number");
  console.log("  ✅ 연속 밑줄 에러 통과");
}

// ============================================================
// 6. 부동소수점 리터럴 (SPEC_04 Q5)
// ============================================================

console.log("=== 부동소수점 리터럴 테스트 ===");

{
  const r = lex("0.0 3.14 1_000.5 0.001");
  const t = r.tokens.slice(0, -1);
  console.assert(t.length === 4, `부동소수점 4개 예상`);
  for (const tok of t) {
    console.assert(tok.type === TokenType.FLOAT_LIT, `${tok.lexeme}은 FLOAT_LIT여야 함`);
  }
  console.log("  ✅ 부동소수점 리터럴 통과");
}

// ".5" → DOT + INT_LIT (선행 숫자 없음)
{
  const t = types(".5");
  console.assert(t[0] === TokenType.DOT, ".5의 첫 토큰은 DOT");
  console.assert(t[1] === TokenType.INT_LIT, ".5의 두 번째 토큰은 INT_LIT");
  console.log("  ✅ .5 → DOT + INT_LIT 통과");
}

// "5." → INT_LIT + DOT (후행 숫자 없음)
{
  const t = types("5.");
  console.assert(t[0] === TokenType.INT_LIT, "5.의 첫 토큰은 INT_LIT");
  console.assert(t[1] === TokenType.DOT, "5.의 두 번째 토큰은 DOT");
  console.log("  ✅ 5. → INT_LIT + DOT 통과");
}

// ============================================================
// 7. 문자열 리터럴 (SPEC_04 Q6)
// ============================================================

console.log("=== 문자열 리터럴 테스트 ===");

// 기본 문자열
{
  const r = lex('"hello"');
  const t = r.tokens[0];
  console.assert(t.type === TokenType.STRING_LIT);
  console.assert(t.lexeme === "hello");
  console.log("  ✅ 기본 문자열 통과");
}

// 빈 문자열
{
  const r = lex('""');
  console.assert(r.tokens[0].type === TokenType.STRING_LIT);
  console.assert(r.tokens[0].lexeme === "");
  console.log("  ✅ 빈 문자열 통과");
}

// 이스케이프 시퀀스
{
  const r = lex('"a\\nb"');
  console.assert(r.tokens[0].lexeme === "a\nb", "\\n 이스케이프");
  console.log("  ✅ \\n 이스케이프 통과");
}

{
  const r = lex('"a\\tb"');
  console.assert(r.tokens[0].lexeme === "a\tb", "\\t 이스케이프");
  console.log("  ✅ \\t 이스케이프 통과");
}

{
  const r = lex('"say \\"hi\\""');
  console.assert(r.tokens[0].lexeme === 'say "hi"', '\\" 이스케이프');
  console.log('  ✅ \\" 이스케이프 통과');
}

{
  const r = lex('"path\\\\file"');
  console.assert(r.tokens[0].lexeme === "path\\file", "\\\\ 이스케이프");
  console.log("  ✅ \\\\ 이스케이프 통과");
}

// 미종료 문자열
{
  const r = lex('"unterminated');
  console.assert(r.errors.length > 0);
  console.assert(r.errors[0].message === "unterminated string literal");
  console.log("  ✅ 미종료 문자열 에러 통과");
}

// 문자열 내 줄바꿈
{
  const r = lex('"hello\nworld"');
  console.assert(r.errors.length > 0);
  console.assert(r.errors[0].message === "newline in string literal, use \\n");
  console.log("  ✅ 문자열 내 줄바꿈 에러 통과");
}

// 알 수 없는 이스케이프
{
  const r = lex('"\\x"');
  console.assert(r.errors.length > 0);
  console.assert(r.errors[0].message === "unknown escape sequence: \\x");
  console.log("  ✅ 알 수 없는 이스케이프 에러 통과");
}

// ============================================================
// 8. 연산자 — 최장 일치 (SPEC_04 Q3)
// ============================================================

console.log("=== 연산자 최장 일치 테스트 ===");

{
  const t = types("==");
  console.assert(t[0] === TokenType.EQEQ, "== → EQEQ");
  console.log("  ✅ == → EQEQ 통과");
}

{
  const t = types("=>");
  console.assert(t[0] === TokenType.ARROW, "=> → ARROW");
  console.log("  ✅ => → ARROW 통과");
}

{
  const t = types("!=");
  console.assert(t[0] === TokenType.NEQ, "!= → NEQ");
  console.log("  ✅ != → NEQ 통과");
}

{
  const t = types("<=");
  console.assert(t[0] === TokenType.LTEQ, "<= → LTEQ");
  console.log("  ✅ <= → LTEQ 통과");
}

{
  const t = types(">=");
  console.assert(t[0] === TokenType.GTEQ, ">= → GTEQ");
  console.log("  ✅ >= → GTEQ 통과");
}

{
  const t = types("&&");
  console.assert(t[0] === TokenType.AND, "&& → AND");
  console.log("  ✅ && → AND 통과");
}

{
  const t = types("||");
  console.assert(t[0] === TokenType.OR, "|| → OR");
  console.log("  ✅ || → OR 통과");
}

// 공백 분리
{
  const t = types("= =");
  console.assert(t[0] === TokenType.EQ, "= = → EQ, EQ");
  console.assert(t[1] === TokenType.EQ);
  console.log("  ✅ = = → EQ, EQ 통과");
}

{
  const t = types("= >");
  console.assert(t[0] === TokenType.EQ);
  console.assert(t[1] === TokenType.GT);
  console.log("  ✅ = > → EQ, GT 통과");
}

{
  const t = types("! =");
  console.assert(t[0] === TokenType.NOT);
  console.assert(t[1] === TokenType.EQ);
  console.log("  ✅ ! = → NOT, EQ 통과");
}

// ============================================================
// 9. 1글자 연산자/구두점
// ============================================================

console.log("=== 1글자 연산자 테스트 ===");

{
  const t = types("+ - * / % = < > ! ? : , . ( ) [ ] { }");
  const expected = [
    TokenType.PLUS, TokenType.MINUS, TokenType.STAR, TokenType.SLASH,
    TokenType.PERCENT, TokenType.EQ, TokenType.LT, TokenType.GT,
    TokenType.NOT, TokenType.QUESTION, TokenType.COLON, TokenType.COMMA,
    TokenType.DOT, TokenType.LPAREN, TokenType.RPAREN, TokenType.LBRACKET,
    TokenType.RBRACKET, TokenType.LBRACE, TokenType.RBRACE, TokenType.EOF,
  ];
  for (let i = 0; i < expected.length; i++) {
    console.assert(t[i] === expected[i], `인덱스 ${i}: ${expected[i]} 예상, 실제 ${t[i]}`);
  }
  console.log("  ✅ 1글자 연산자 19종 통과");
}

// ============================================================
// 10. 주석 (SPEC_04 Q8)
// ============================================================

console.log("=== 주석 테스트 ===");

{
  const t = types("var x = 42 // comment\nvar y = 10");
  // var x = 42 var y = 10 EOF
  console.assert(t[0] === TokenType.VAR);
  console.assert(t[1] === TokenType.IDENT);
  console.assert(t[2] === TokenType.EQ);
  console.assert(t[3] === TokenType.INT_LIT);
  console.assert(t[4] === TokenType.VAR);
  console.assert(t[5] === TokenType.IDENT);
  console.assert(t[6] === TokenType.EQ);
  console.assert(t[7] === TokenType.INT_LIT);
  console.log("  ✅ 한 줄 주석 건너뜀 통과");
}

// 블록 주석 에러
{
  const r = lex("/* block */");
  console.assert(r.errors.length > 0);
  console.assert(r.errors[0].message === "block comments not supported, use //");
  console.log("  ✅ 블록 주석 에러 통과");
}

// ============================================================
// 11. NEWLINE — 토큰 생성 안 함 (SPEC_04 Q7)
// ============================================================

console.log("=== NEWLINE 테스트 ===");

{
  const t = types("var x = 42\nvar y = 10");
  // NEWLINE 토큰이 없어야 함
  for (const tt of t) {
    console.assert(tt !== "NEWLINE" as any, "NEWLINE 토큰이 있으면 안 됨");
  }
  console.log("  ✅ NEWLINE 토큰 없음 통과");
}

// ============================================================
// 12. 위치 추적 (줄:열)
// ============================================================

console.log("=== 위치 추적 테스트 ===");

{
  const r = lex("var x = 42\nvar y = 10");
  const t = r.tokens;
  // 1번째 줄: var(1:1) x(1:5) =(1:7) 42(1:9)
  console.assert(t[0].line === 1 && t[0].col === 1, "var at 1:1");
  console.assert(t[1].line === 1 && t[1].col === 5, "x at 1:5");
  console.assert(t[2].line === 1 && t[2].col === 7, "= at 1:7");
  console.assert(t[3].line === 1 && t[3].col === 9, "42 at 1:9");
  // 2번째 줄: var(2:1) y(2:5) =(2:7) 10(2:9)
  console.assert(t[4].line === 2 && t[4].col === 1, "var at 2:1");
  console.assert(t[5].line === 2 && t[5].col === 5, "y at 2:5");
  console.log("  ✅ 위치 추적 통과");
}

// ============================================================
// 13. 에러 복구 (SPEC_04 Q9)
// ============================================================

console.log("=== 에러 복구 테스트 ===");

{
  const r = lex("var x = @\nvar y = 42");
  // 에러 1개 (@ 문자)
  console.assert(r.errors.length >= 1, "에러 1개 이상");
  // 에러 복구 후 나머지 토큰 정상 스캔
  const hasY = r.tokens.some((t) => t.lexeme === "y");
  console.assert(hasY, "에러 복구 후 y 토큰 존재");
  console.log("  ✅ 에러 복구 통과");
}

// ============================================================
// 14. 통합 테스트 — 실제 FreeLang v4 코드
// ============================================================

console.log("=== 통합 테스트 ===");

{
  const source = `fn add(a: i32, b: i32): i32 {
  return a + b
}`;
  const r = lex(source);
  console.assert(r.errors.length === 0, `에러 없어야 함, 실제 ${r.errors.length}`);
  const t = r.tokens.slice(0, -1); // EOF 제외
  // fn add ( a : i32 , b : i32 ) : i32 { return a + b }
  console.assert(t[0].type === TokenType.FN);
  console.assert(t[1].type === TokenType.IDENT && t[1].lexeme === "add");
  console.assert(t[2].type === TokenType.LPAREN);
  console.assert(t[3].type === TokenType.IDENT && t[3].lexeme === "a");
  console.assert(t[4].type === TokenType.COLON);
  console.assert(t[5].type === TokenType.TYPE_I32);
  console.assert(t[6].type === TokenType.COMMA);
  console.assert(t[7].type === TokenType.IDENT && t[7].lexeme === "b");
  console.assert(t[8].type === TokenType.COLON);
  console.assert(t[9].type === TokenType.TYPE_I32);
  console.assert(t[10].type === TokenType.RPAREN);
  console.assert(t[11].type === TokenType.COLON);
  console.assert(t[12].type === TokenType.TYPE_I32);
  console.assert(t[13].type === TokenType.LBRACE);
  console.assert(t[14].type === TokenType.RETURN);
  console.assert(t[15].type === TokenType.IDENT && t[15].lexeme === "a");
  console.assert(t[16].type === TokenType.PLUS);
  console.assert(t[17].type === TokenType.IDENT && t[17].lexeme === "b");
  console.assert(t[18].type === TokenType.RBRACE);
  console.log("  ✅ fn add(a: i32, b: i32): i32 통합 통과");
}

{
  const source = `var x: i32 = 42
var name: string = "hello"
if x == 42 {
  println(name)
}`;
  const r = lex(source);
  console.assert(r.errors.length === 0, `에러 없어야 함`);
  console.log("  ✅ var + if + println 통합 통과");
}

{
  const source = `for item in items {
  match item {
    0 => println("zero")
    _ => println("other")
  }
}`;
  const r = lex(source);
  console.assert(r.errors.length === 0, `에러 없어야 함`);
  // for, item, in, items, {, match, item, {, 0, =>, ...
  const t = r.tokens;
  console.assert(t[0].type === TokenType.FOR);
  console.assert(t[2].type === TokenType.IN);
  console.assert(t[5].type === TokenType.MATCH);
  console.log("  ✅ for + match 통합 통과");
}

// ============================================================
// 15. EOF
// ============================================================

console.log("=== EOF 테스트 ===");

{
  const r = lex("");
  console.assert(r.tokens.length === 1);
  console.assert(r.tokens[0].type === TokenType.EOF);
  console.log("  ✅ 빈 소스 → EOF 통과");
}

{
  const r = lex("   \n\n\t  ");
  console.assert(r.tokens.length === 1);
  console.assert(r.tokens[0].type === TokenType.EOF);
  console.log("  ✅ 공백만 있는 소스 → EOF 통과");
}

// ============================================================
// 결과
// ============================================================

console.log("\n=== 전체 결과 ===");
console.log("  Lexer 테스트 완료");
