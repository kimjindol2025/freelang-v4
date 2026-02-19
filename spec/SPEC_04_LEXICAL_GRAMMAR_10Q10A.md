# FreeLang v4 — Spec 04: 어휘 명세 (Lexical Grammar) 10Q 10A

---

## Q1. 렉서의 입력과 출력은 정확히 무엇인가?

**A:** UTF-8 소스코드 → 토큰 배열.

```
입력: "var x: i32 = 42 + 3\n"  (UTF-8 바이트 시퀀스)

출력:
  Token(VAR,     "var",  1:1)
  Token(IDENT,   "x",    1:5)
  Token(COLON,   ":",    1:6)
  Token(I32,     "i32",  1:8)
  Token(EQ,      "=",    1:12)
  Token(INT_LIT, "42",   1:14)
  Token(PLUS,    "+",    1:17)
  Token(INT_LIT, "3",    1:19)
  Token(NEWLINE, "\n",   1:20)
  Token(EOF,     "",     2:1)
```

토큰의 구조:
```typescript
type Token = {
  type: TokenType    // 토큰 종류 (enum)
  lexeme: string     // 원본 문자열 조각
  line: number       // 줄 번호 (1-based)
  col: number        // 열 번호 (1-based)
}
```

렉서는 **문법을 모른다**. `var x = = =`도 유효한 토큰열이다. 문법 검사는 파서의 역할.

---

## Q2. 토큰 종류는 총 몇 개인가?

**A:** 6개 카테고리, 총 51종.

### 카테고리 1: 키워드 (13종)

| 토큰 | 렉심 | 비고 |
|------|------|------|
| VAR | `var` | 가변 변수 |
| LET | `let` | 불변 변수 (재할당 불가) |
| CONST | `const` | 상수 (컴파일타임 확정) |
| FN | `fn` | 함수 선언 |
| IF | `if` | 조건 |
| ELSE | `else` | 조건 분기 |
| MATCH | `match` | 패턴 매칭 |
| FOR | `for` | 반복 |
| IN | `in` | for-in 반복 |
| RETURN | `return` | 함수 반환 |
| SPAWN | `spawn` | Actor 생성 |
| TRUE | `true` | 불리언 참 |
| FALSE | `false` | 불리언 거짓 |

예약어 = 키워드 + 타입 이름. 식별자로 사용 불가.

### 카테고리 2: 타입 이름 (7종)

| 토큰 | 렉심 | 비고 |
|------|------|------|
| TYPE_I32 | `i32` | 정수 32비트 |
| TYPE_I64 | `i64` | 정수 64비트 |
| TYPE_F64 | `f64` | 부동소수점 |
| TYPE_BOOL | `bool` | 불리언 |
| TYPE_STRING | `string` | 문자열 |
| TYPE_VOID | `void` | 반환값 없음 |
| TYPE_CHANNEL | `channel` | 채널 |

`Option`, `Result`는 키워드가 아니다. IDENT로 렉싱되고 파서에서 구분한다.
이유: `Option`과 `Result`는 패턴 위치에서도 쓰인다 (`Ok(v)`, `Some(v)`).
렉서에서 키워드로 처리하면 파서가 복잡해진다.

### 카테고리 3: 리터럴 (3종)

| 토큰 | 예시 | 규칙 |
|------|------|------|
| INT_LIT | `42`, `0`, `1_000` | [0-9][0-9_]* (밑줄 허용) |
| FLOAT_LIT | `3.14`, `0.5`, `1_000.0` | [0-9][0-9_]*\.[0-9][0-9_]* |
| STRING_LIT | `"hello"`, `""`, `"a\nb"` | "..." (이스케이프 지원) |

리터럴 상세 규칙은 Q5에서 별도 정의.

### 카테고리 4: 연산자/구두점 (23종)

| 토큰 | 렉심 | 비고 |
|------|------|------|
| PLUS | `+` | 덧셈 / 문자열 연결 |
| MINUS | `-` | 뺄셈 / 단항 음수 |
| STAR | `*` | 곱셈 |
| SLASH | `/` | 나눗셈 |
| PERCENT | `%` | 나머지 |
| EQ | `=` | 대입 |
| EQEQ | `==` | 동등 비교 |
| NEQ | `!=` | 비동등 |
| LT | `<` | 미만 / 제네릭 열기 |
| GT | `>` | 초과 / 제네릭 닫기 |
| LTEQ | `<=` | 이하 |
| GTEQ | `>=` | 이상 |
| AND | `&&` | 논리 AND |
| OR | `\|\|` | 논리 OR |
| NOT | `!` | 논리 NOT |
| QUESTION | `?` | try 연산자 |
| ARROW | `=>` | match arm |
| COLON | `:` | 타입 표기 |
| COMMA | `,` | 구분자 |
| DOT | `.` | 필드 접근 |
| LPAREN | `(` | |
| RPAREN | `)` | |
| LBRACKET | `[` | 배열 |
| RBRACKET | `]` | 배열 |
| LBRACE | `{` | 블록/구조체 |
| RBRACE | `}` | 블록/구조체 |

### 카테고리 5: 특수 (3종)

| 토큰 | 설명 |
|------|------|
| IDENT | 식별자 (`x`, `my_func`, `_tmp`) |
| NEWLINE | `\n` (의미 있는 줄바꿈) |
| EOF | 파일 끝 |

### 카테고리 6: 무시 (토큰 안 됨)

| 항목 | 설명 |
|------|------|
| 공백 | ` `, `\t`, `\r` — 건너뜀 |
| 주석 | `// ...` — 줄 끝까지 건너뜀 |

**총계**: 13 + 7 + 3 + 26 + 3 = **52종**

(수정: 연산자/구두점 26종 (LBRACE, RBRACE 포함), 특수 3종)

---

## Q3. 최장 일치(Maximal Munch) 규칙은?

**A:** 항상 가장 긴 토큰을 선택한다.

```
소스: "==!"

스캔:
  '='  → EQ 후보
  '==' → EQEQ 후보 (더 김)
  '==' 다음 '!' → 3글자 토큰 없음
  → EQEQ 채택, '!' 별도 토큰

결과: EQEQ, NOT
```

```
소스: "=>"

  '='  → EQ 후보
  '=>' → ARROW 후보 (더 김)
  → ARROW 채택

소스: "= >"

  '='  → EQ 후보
  ' '  → 공백 (토큰 분리)
  → EQ, GT
```

결정 테이블 (모호한 쌍):

| 소스 | 결과 | 규칙 |
|------|------|------|
| `==` | EQEQ | 최장 일치 |
| `= =` | EQ, EQ | 공백으로 분리 |
| `=>` | ARROW | 최장 일치 |
| `= >` | EQ, GT | 공백으로 분리 |
| `!=` | NEQ | 최장 일치 |
| `! =` | NOT, EQ | 공백으로 분리 |
| `<=` | LTEQ | 최장 일치 |
| `>=` | GTEQ | 최장 일치 |
| `&&` | AND | 최장 일치 |
| `\|\|` | OR | 최장 일치 |

2글자 연산자: `==`, `!=`, `<=`, `>=`, `&&`, `||`, `=>` (7개)
나머지는 전부 1글자.

---

## Q4. 키워드와 식별자를 어떻게 구분하는가?

**A:** 식별자 규칙으로 먼저 스캔, 그 다음 키워드 테이블에서 조회.

```
1. [a-zA-Z_][a-zA-Z0-9_]* 매칭 → 문자열 추출

2. 키워드 맵에서 조회:
   "var"   → VAR
   "let"   → LET
   "fn"    → FN
   "i32"   → TYPE_I32
   ...
   없으면  → IDENT
```

```typescript
const KEYWORDS: Map<string, TokenType> = new Map([
  // 키워드 (13)
  ["var", TokenType.VAR],
  ["let", TokenType.LET],
  ["const", TokenType.CONST],
  ["fn", TokenType.FN],
  ["if", TokenType.IF],
  ["else", TokenType.ELSE],
  ["match", TokenType.MATCH],
  ["for", TokenType.FOR],
  ["in", TokenType.IN],
  ["return", TokenType.RETURN],
  ["spawn", TokenType.SPAWN],
  ["true", TokenType.TRUE],
  ["false", TokenType.FALSE],
  // 타입 이름 (7)
  ["i32", TokenType.TYPE_I32],
  ["i64", TokenType.TYPE_I64],
  ["f64", TokenType.TYPE_F64],
  ["bool", TokenType.TYPE_BOOL],
  ["string", TokenType.TYPE_STRING],
  ["void", TokenType.TYPE_VOID],
  ["channel", TokenType.TYPE_CHANNEL],
]);

function scanIdentOrKeyword(): Token {
  const text = scanWhile(isAlphaNumOrUnderscore);
  const type = KEYWORDS.get(text) ?? TokenType.IDENT;
  return token(type, text);
}
```

**`Option`, `Result`, `Ok`, `Err`, `Some`, `None`은 키워드가 아니다.**

이유:
```
Option<i32>   → IDENT("Option"), LT, TYPE_I32, GT
Some(42)      → IDENT("Some"), LPAREN, INT_LIT("42"), RPAREN
```

파서가 문맥에 따라 구분한다:
- 타입 위치에서 `Option` → OptionType 처리
- 식 위치에서 `Some(v)` → SomePattern 또는 Call 처리
- 패턴 위치에서 `None` → NonePattern 처리

렉서를 단순하게 유지. 문맥 판단은 파서의 책임.

---

## Q5. 숫자 리터럴의 정확한 규칙은?

**A:** 정수와 부동소수점 2종.

### 정수 (INT_LIT)

```
규칙: [0-9][0-9_]*
밑줄은 가독성용. 값에 영향 없음.

✅ 유효:
  0
  42
  1000
  1_000
  1_000_000

❌ 무효:
  _42       (밑줄로 시작 → IDENT)
  42_       (끝 밑줄 → 렉서 에러)
  4__2      (연속 밑줄 → 렉서 에러)
  0x1F      (16진수 없음)
  0b1010    (2진수 없음)
  0o77      (8진수 없음)
```

왜 16진수/2진수/8진수가 없는가:
- Spec 03에서 정의: 바이트 수준 조작 없음
- 16진수가 필요한 경우 = 비트 연산, 메모리 주소, 색상 코드
- 비트 연산 없음, 메모리 주소 없음 → 필요 없음

### 부동소수점 (FLOAT_LIT)

```
규칙: [0-9][0-9_]* "." [0-9][0-9_]*
소수점 양쪽에 숫자가 반드시 있어야 함.

✅ 유효:
  0.0
  3.14
  1_000.5
  0.001

❌ 무효:
  .5        (선행 숫자 없음 → DOT + INT_LIT)
  5.        (후행 숫자 없음 → INT_LIT + DOT)
  1e10      (지수 표기 없음)
  1.2e3     (지수 표기 없음)
  1.2f      (접미사 없음)
```

왜 지수 표기(scientific notation)가 없는가:
- AI Agent가 `1e10`을 쓸 일이 거의 없다
- `1e10`이 필요하면 `10000000000.0` 또는 `pow(10.0, 10)` 사용
- 파싱이 복잡해짐 (`1e+10`, `1E-3` 등 변형)
- v5에서 필요하면 추가

### 정수 vs 부동소수점 판별

```
렉서 로직:
  1. 숫자 시작 → 숫자+밑줄 소비
  2. '.' 다음이 숫자면 → 소수부 소비 → FLOAT_LIT
  3. '.' 다음이 숫자가 아니면 → INT_LIT + DOT (별도 토큰)
  4. '.' 없으면 → INT_LIT
```

```
소스: "42.method()"
토큰: INT_LIT("42"), DOT, IDENT("method"), LPAREN, RPAREN

소스: "42.0"
토큰: FLOAT_LIT("42.0")

소스: "42.0.method()"
토큰: FLOAT_LIT("42.0"), DOT, IDENT("method"), LPAREN, RPAREN
```

---

## Q6. 문자열 리터럴의 정확한 규칙은?

**A:** 쌍따옴표로 감싸고, 이스케이프 시퀀스 지원.

```
규칙: '"' <string_char>* '"'
<string_char> ::= <escape> | [^"\\\n]
<escape> ::= '\\' ('n' | 't' | 'r' | '\\' | '"' | '0')
```

### 이스케이프 시퀀스 (6종)

| 시퀀스 | 의미 | 바이트 |
|--------|------|--------|
| `\n` | 줄바꿈 | 0x0A |
| `\t` | 탭 | 0x09 |
| `\r` | 캐리지 리턴 | 0x0D |
| `\\` | 역슬래시 | 0x5C |
| `\"` | 쌍따옴표 | 0x22 |
| `\0` | 널 문자 | 0x00 |

```
✅ 유효:
  ""            → 빈 문자열
  "hello"       → hello
  "line1\nline2" → line1 + 줄바꿈 + line2
  "say \"hi\""  → say "hi"
  "path\\file"  → path\file

❌ 무효:
  "unterminated   → 렉서 에러: 문자열 종료 안 됨
  "hello
  world"          → 렉서 에러: 줄바꿈은 문자열 안에 불허 (\n 사용)
  "\x41"          → 렉서 에러: 16진수 이스케이프 없음
  "\u{1F600}"     → 렉서 에러: 유니코드 이스케이프 없음
```

왜 유니코드 이스케이프가 없는가:
- Spec 03에서 정의: 문자열은 UTF-8 바이트 시퀀스
- `"한글"` 직접 입력 가능 (소스코드 자체가 UTF-8)
- AI가 `\u{AC00}`을 쓸 이유가 없다

왜 여러 줄 문자열이 없는가:
- `"""..."""` (Python) 또는 `` ` `` (JS) 없음
- `\n` 사용
- 문법 단순화

---

## Q7. NEWLINE 토큰의 역할은?

**A:** FreeLang v4에서 NEWLINE은 **세미콜론 역할을 하지 않는다**.

```
NEWLINE 생성 규칙:
  - '\n' 만남 → NEWLINE 토큰 생성
  - 연속 NEWLINE → 하나로 합침 (optional)

NEWLINE 처리:
  - 파서에서 무시 (whitespace와 동일 취급)
  - 문(statement) 종료자는 '}'와 다음 키워드
```

```freelang
// 이것들은 모두 동일하게 파싱됨:

// 줄바꿈 스타일
var x = 42
var y = 10

// 한 줄 스타일
var x = 42  var y = 10

// 이런 것도 가능:
var x =
  42

fn add(
  a: i32,
  b: i32
): i32 {
  return a + b
}
```

왜 세미콜론이 없는가:
- AI Agent가 세미콜론을 까먹으면? → 컴파일 에러 → 수정 → 시간 낭비
- Go처럼 자동 삽입? → 규칙이 복잡하고 함정이 있다
- 가장 단순한 해법: **문이 키워드로 시작하므로 세미콜론이 필요 없다**

```
문 시작 판별:
  "var"    → VarDecl
  "let"    → VarDecl
  "const"  → VarDecl
  "fn"     → FnDecl
  "if"     → IfStmt
  "match"  → MatchStmt
  "for"    → ForStmt
  "spawn"  → SpawnStmt
  "return" → ReturnStmt
  "{"      → Block
  그 외    → ExprStmt (할당 포함)
```

파서는 각 문의 끝을 **구조적으로** 안다:
- VarDecl: `= <expr>` 뒤에 다음 문 시작이 오면 끝
- FnDecl: `}` 만나면 끝
- IfStmt: `}` 만나면 끝
- ExprStmt: 식이 끝나면 끝

**결론**: NEWLINE 토큰은 생성하지만 파서에서 무시한다. 에러 메시지 줄 번호 계산에만 사용.

수정: NEWLINE을 아예 토큰으로 생성하지 않는다. 줄 번호는 렉서가 내부 카운터로 추적.

---

## Q8. 주석 규칙은?

**A:** 한 줄 주석만 지원. `//` 부터 줄 끝까지.

```
// 한 줄 주석
var x = 42  // 인라인 주석

/* 블록 주석은 없다 */   ❌ 렉서 에러
```

렉서 동작:
```
1. '/' 만남
2. 다음 문자 확인:
   '/'면 → 줄 끝('\n')까지 건너뜀, 토큰 생성 안 함
   '*'면 → 렉서 에러: "block comments not supported"
   그 외 → SLASH 토큰
```

왜 블록 주석이 없는가:
- AI Agent는 주석을 거의 안 쓴다
- 블록 주석은 중첩 문제가 있다 (`/* /* */ */`)
- 한 줄 주석만으로 충분

---

## Q9. 렉서 에러는 어떻게 보고하는가?

**A:** 에러 위치(줄:열) + 메시지. 최대한 계속 진행(recovery).

```typescript
type LexError = {
  message: string
  line: number
  col: number
}
```

에러 목록 (전부):

| 상황 | 메시지 |
|------|--------|
| 미종료 문자열 | `unterminated string literal` |
| 문자열 내 줄바꿈 | `newline in string literal, use \\n` |
| 알 수 없는 이스케이프 | `unknown escape sequence: \\x` |
| 숫자 끝 밑줄 | `trailing underscore in number` |
| 연속 밑줄 | `consecutive underscores in number` |
| 알 수 없는 문자 | `unexpected character: @` |
| 블록 주석 시도 | `block comments not supported, use //` |

에러 복구:
```
1. 에러 발생 → LexError 수집
2. 현재 토큰 건너뜀 (다음 공백이나 줄바꿈까지)
3. 다음 토큰부터 계속 스캔
4. 스캔 완료 후 모든 에러 한꺼번에 보고
```

```
소스: var x = "hello
var y = 42

결과:
  Error: unterminated string literal at 1:9
  토큰: VAR("var"), IDENT("x"), EQ("="), [에러], VAR("var"), IDENT("y"), EQ("="), INT_LIT("42"), EOF
```

하나의 에러에서 멈추지 않는다. 가능한 모든 에러를 모아서 한 번에 보고한다.

---

## Q10. `<` 토큰의 모호성은 렉서에서 해결하는가?

**A:** 아니다. 렉서에서 해결하지 않는다.

```
소스: Option<i32>
토큰: IDENT("Option"), LT, TYPE_I32, GT

소스: x < 10
토큰: IDENT("x"), LT, INT_LIT("10")
```

두 경우 모두 `<`는 LT 토큰이다. 의미(제네릭인지 비교인지)는 **파서**가 문맥으로 결정한다.

```
파서의 판단:
  - 타입 위치에서 LT → 제네릭 열기
    Option LT i32 GT → OptionType(i32)

  - 식 위치에서 LT → 비교 연산자
    x LT 10 → BinOp(<, x, 10)
```

렉서 설계 원칙: **렉서는 문맥을 모른다**. 토큰 종류는 순수하게 글자(character)만 보고 결정한다.

이것이 가능한 이유:
- `Option`, `Result`, `channel`은 **타입 위치에서만** 나타난다
- 타입 위치: 변수 선언 뒤 (`:` 뒤), 함수 반환 뒤, 제네릭 인자
- 식 위치: 그 외 전부
- 파서는 현재 위치가 타입인지 식인지 항상 안다

Pratt Parser에서의 처리:
```
led(LT) (식 위치):
  → 비교 연산 BinOp

타입 파싱 (타입 위치):
  "Option" + LT → OptionType 시작
  "Result" + LT → ResultType 시작
  "channel" + LT → ChannelType 시작
```

렉서가 깔끔하게 분리되어 있으므로 파서만 올바르면 모호성 없다.

---

# 요약

| 결정 | 내용 |
|------|------|
| 토큰 종류 | 6 카테고리, ~50종 |
| 키워드 | 13개 (var, let, const, fn, if, else, match, for, in, return, spawn, true, false) |
| 타입 키워드 | 7개 (i32, i64, f64, bool, string, void, channel) |
| Option/Result | 키워드 아님. IDENT로 렉싱, 파서에서 처리 |
| 정수 | [0-9][0-9_]* (16진수/2진수/8진수 없음) |
| 부동소수점 | 소수점 양쪽 필수. 지수표기 없음 |
| 문자열 | 쌍따옴표, 6종 이스케이프, 여러 줄 불가 |
| 주석 | `//` 한 줄만. 블록 주석 없음 |
| 세미콜론 | 없음. 문 종료는 구조적 판별 |
| NEWLINE | 토큰 생성 안 함. 줄 번호만 내부 추적 |
| `<` 모호성 | 렉서에서 해결 안 함. 파서 책임 |
| 에러 복구 | 수집 후 계속 진행, 한꺼번에 보고 |
