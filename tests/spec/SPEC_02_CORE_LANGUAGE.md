# FreeLang v4 — Spec 02: Core Language Formal Specification

**상태: START GATE 문서. 이 문서가 확정되기 전까지 코딩 금지.**

---

# 1. 타입 목록 (전부. 추가 금지.)

## 1.1 원시 타입

| 타입 | 크기 | 기본값 | 비고 |
|------|------|--------|------|
| `i32` | 4 byte | 0 | 정수 기본 |
| `i64` | 8 byte | 0 | 큰 정수 |
| `f64` | 8 byte | 0.0 | 부동소수점 (f32 없음. 하나만.) |
| `bool` | 1 byte | false | |
| `string` | 가변 | "" | 불변(immutable) |
| `void` | 0 byte | - | 반환 없음 |

## 1.2 복합 타입

| 타입 | 문법 | 비고 |
|------|------|------|
| Array | `[i32]` | 동종 배열. 원시 타입만 원소 가능. |
| Struct | `{ name: string, age: i32 }` | 이름 있는 필드. |

## 1.3 특수 타입 (하드코딩. 사용자 정의 불가.)

| 타입 | 변형 | 비고 |
|------|------|------|
| `Option<T>` | `Some(value)` / `None` | T는 원시/복합 타입 |
| `Result<T, E>` | `Ok(value)` / `Err(error)` | T, E는 원시/복합 타입 |
| `channel<T>` | - | T는 원시/복합 타입 |

Option, Result, channel은 **언어 내장**이다. 사용자가 제네릭 타입을 정의하는 것은 불가능하다.

## 1.4 함수 타입

```
(i32, i32) -> i32
(string) -> Result<i32, string>
```

일급 함수(first-class function)는 v4에서 지원하지 않는다.
함수는 선언하고 호출만 가능. 변수에 할당 불가.

## 1.5 타입 없음 (v4에서 존재하지 않는 것)

```
❌ null, nil, undefined
❌ any, unknown, dynamic
❌ union type (Option/Result 외)
❌ tuple
❌ enum (Option/Result 외)
❌ 사용자 정의 제네릭
❌ trait / interface
❌ 함수 타입 변수
```

---

# 2. 문법 BNF (최종. 변경 금지.)

```bnf
<program> ::= <stmt>*

# === Statements ===
<stmt> ::= <var_decl>
         | <fn_decl>
         | <if_stmt>
         | <match_stmt>
         | <for_stmt>
         | <spawn_stmt>
         | <return_stmt>
         | <expr_stmt>
         | <block>

<var_decl>    ::= ("var" | "let" | "const") IDENT (":" <type>)? "=" <expr>
<fn_decl>     ::= "fn" IDENT "(" <params> ")" (":" <type>)? <block>
<if_stmt>     ::= "if" <expr> <block> ("else" <if_stmt> | "else" <block>)?
<match_stmt>  ::= "match" <expr> "{" <match_arm>+ "}"
<for_stmt>    ::= "for" IDENT "in" <expr> <block>
<spawn_stmt>  ::= "spawn" <block>
<return_stmt> ::= "return" <expr>?
<expr_stmt>   ::= <expr>
<block>       ::= "{" <stmt>* "}"

<match_arm>   ::= <pattern> "=>" <expr> ","?
<pattern>     ::= IDENT | LITERAL | "Ok" "(" <pattern> ")" | "Err" "(" <pattern> ")"
                | "Some" "(" <pattern> ")" | "None" | "_"

<params>      ::= (<param> ("," <param>)*)?
<param>       ::= IDENT ":" <type>

# === Expressions (Pratt Parser, Binding Power) ===
<expr> ::= <assign>

# BP 10: Assignment (no chaining)
<assign> ::= <or> | <or> "=" <or>

# BP 20-80: Binary operators
<or>     ::= <and>    | <or> "||" <and>
<and>    ::= <eq>     | <and> "&&" <eq>
<eq>     ::= <cmp>    | <eq> ("==" | "!=") <cmp>
<cmp>    ::= <add>    | <cmp> ("<" | ">" | "<=" | ">=") <add>
<add>    ::= <mul>    | <add> ("+" | "-") <mul>
<mul>    ::= <unary>  | <mul> ("*" | "/" | "%") <unary>

# BP 90: Unary
<unary>  ::= <postfix> | ("!" | "-") <unary>

# BP 100: Postfix
<postfix> ::= <primary> <postfix_op>*
<postfix_op> ::= "(" <args> ")"       # call
              | "[" <expr> "]"        # index
              | "." IDENT             # field
              | "?"                   # try (Result/Option unwrap-or-propagate)

# Primary
<primary> ::= IDENT | INT | FLOAT | STRING | "true" | "false"
           | "[" (<expr> ("," <expr>)*)? "]"           # array literal
           | "{" (<map_entry> ("," <map_entry>)*)? "}"  # struct literal
           | "(" <expr> ")"                             # grouped
           | "if" <expr> <block> "else" <block>         # if expression
           | "match" <expr> "{" <match_arm>+ "}"        # match expression

<map_entry> ::= IDENT ":" <expr>
<args>      ::= (<expr> ("," <expr>)*)?

# === Types ===
<type> ::= "i32" | "i64" | "f64" | "bool" | "string" | "void"
        | "[" <type> "]"                                # array
        | "{" (<type_field> ("," <type_field>)*)? "}"   # struct
        | "Option" "<" <type> ">"                       # option
        | "Result" "<" <type> "," <type> ">"            # result
        | "channel" "<" <type> ">"                      # channel

<type_field> ::= IDENT ":" <type>
```

이 BNF에 없는 문법은 v4에 존재하지 않는다.

---

# 3. AST 구조 (노드 타입 전부. 추가 금지.)

```typescript
// === Program ===
type Program = { kind: "Program"; stmts: Stmt[] }

// === Statements (10종) ===
type Stmt =
  | { kind: "VarDecl"; mut: "var"|"let"|"const"; name: string; type: Type|null; init: Expr }
  | { kind: "FnDecl"; name: string; params: Param[]; returnType: Type|null; body: Stmt[] }
  | { kind: "IfStmt"; cond: Expr; then: Stmt[]; else_: Stmt[]|null }
  | { kind: "MatchStmt"; expr: Expr; arms: MatchArm[] }
  | { kind: "ForStmt"; name: string; iter: Expr; body: Stmt[] }
  | { kind: "SpawnStmt"; body: Stmt[] }
  | { kind: "ReturnStmt"; value: Expr|null }
  | { kind: "ExprStmt"; expr: Expr }
  | { kind: "Block"; stmts: Stmt[] }
  | { kind: "Assignment"; target: Expr; value: Expr }

// === Expressions (12종) ===
type Expr =
  | { kind: "IntLit"; value: number }
  | { kind: "FloatLit"; value: number }
  | { kind: "StringLit"; value: string }
  | { kind: "BoolLit"; value: boolean }
  | { kind: "Ident"; name: string }
  | { kind: "BinOp"; op: string; left: Expr; right: Expr }
  | { kind: "UnaryOp"; op: string; operand: Expr }
  | { kind: "Call"; callee: string; args: Expr[] }
  | { kind: "Index"; object: Expr; index: Expr }
  | { kind: "FieldAccess"; object: Expr; field: string }
  | { kind: "ArrayLit"; elements: Expr[] }
  | { kind: "StructLit"; fields: { name: string; value: Expr }[] }
  | { kind: "IfExpr"; cond: Expr; then: Expr[]; else_: Expr[] }
  | { kind: "MatchExpr"; expr: Expr; arms: MatchArm[] }
  | { kind: "TryOp"; expr: Expr }

// === Patterns (6종) ===
type Pattern =
  | { kind: "IdentPattern"; name: string }
  | { kind: "LitPattern"; value: number|string|boolean }
  | { kind: "OkPattern"; inner: Pattern }
  | { kind: "ErrPattern"; inner: Pattern }
  | { kind: "SomePattern"; inner: Pattern }
  | { kind: "NonePattern" }
  | { kind: "WildcardPattern" }

// === Types (7종) ===
type Type =
  | { kind: "PrimType"; name: "i32"|"i64"|"f64"|"bool"|"string"|"void" }
  | { kind: "ArrayType"; elem: Type }
  | { kind: "StructType"; fields: { name: string; type: Type }[] }
  | { kind: "OptionType"; inner: Type }
  | { kind: "ResultType"; ok: Type; err: Type }
  | { kind: "ChannelType"; inner: Type }

// === Helpers ===
type Param = { name: string; type: Type }
type MatchArm = { pattern: Pattern; body: Expr }
```

노드 수: Stmt 10 + Expr 15 + Pattern 7 + Type 6 = **38종**. 이 이상 추가 금지.

---

# 4. 타입 규칙 (Type Rules)

## 4.1 타입 호환성

```
묵시적 변환: 없음. 전부.

i32 → i64    ❌ (명시적: i64(x))
i32 → f64    ❌ (명시적: f64(x))
f64 → i32    ❌ (명시적: i32(x), 소수점 버림)
i32 → string ❌ (명시적: str(x))
string → i32 ❌ (명시적: i32(x), 실패 시 Result)
bool → i32   ❌
i32 → bool   ❌
```

## 4.2 변수 타입 결정

```
var x = 42          → i32 (정수 기본)
var y = 3.14        → f64
var z = "hello"     → string
var w = true        → bool
var a = [1, 2, 3]   → [i32]
```

타입 명시 시:
```
var x: i64 = 42     → i64 (리터럴 42는 i64로 해석)
```

함수 파라미터: 타입 필수. 추론 없음.

## 4.3 연산자 타입 규칙

```
수치 연산 (+, -, *, /, %, <, >, <=, >=):
  i32 op i32 → i32 (/, % 제외)
  i64 op i64 → i64
  f64 op f64 → f64
  혼합 (i32 + f64) → ❌ 컴파일 에러

  i32 / i32 → i32 (정수 나눗셈)
  f64 / f64 → f64

문자열 연결:
  string + string → string
  string + i32 → ❌ 컴파일 에러 (str(i32) 필요)

비교 (==, !=):
  T == T → bool (같은 타입만)
  i32 == f64 → ❌ 컴파일 에러

논리 (&&, ||, !):
  bool && bool → bool
  i32 && bool → ❌ 컴파일 에러 (truthy 없음)
```

## 4.4 함수 타입 검사

```
fn add(a: i32, b: i32): i32 { return a + b }

호출:
  add(1, 2)       ✅ → i32
  add(1, "hello") ❌ 인자 타입 불일치
  add(1)          ❌ 인자 개수 불일치
  add(1, 2, 3)    ❌ 인자 개수 불일치
```

반환 타입 검사:
```
fn foo(): i32 { return "hello" }  ❌ 반환 타입 불일치
fn bar(): i32 { }                 ❌ 반환문 누락
fn baz(): void { return 42 }     ❌ void에 값 반환
```

## 4.5 Option/Result 타입 규칙

```
Option<i32>:
  Some(42)   ✅
  Some("x")  ❌ (i32 자리에 string)
  None       ✅

Result<i32, string>:
  Ok(42)     ✅
  Err("msg") ✅
  Ok("x")    ❌ (i32 자리에 string)
  Err(42)    ❌ (string 자리에 i32)
```

## 4.6 Exhaustiveness 규칙

```
match on Option<T>:
  Some(x) + None          ✅ 완전
  Some(x)만               ❌ 컴파일 에러: None 누락
  _ (wildcard)            ✅ 완전

match on Result<T, E>:
  Ok(x) + Err(e)          ✅ 완전
  Ok(x)만                 ❌ 컴파일 에러: Err 누락

match on bool:
  true + false             ✅ 완전
  true만                   ❌ 컴파일 에러: false 누락

match on i32:
  반드시 _ (wildcard) 포함  ✅
  특정 값만                ❌ 컴파일 에러: _ 누락
```

---

# 5. 에러 규칙

## 5.1 ? 연산자

```
? 는 Result<T, E> 또는 Option<T>에만 사용 가능.

Result<T, E>에서:
  Ok(v)  → v 반환 (계속 진행)
  Err(e) → 현재 함수에서 Err(e) 반환 (조기 종료)

  현재 함수의 반환 타입이 Result<_, E>여야 함.
  아니면 컴파일 에러.

Option<T>에서:
  Some(v) → v 반환
  None    → 현재 함수에서 None 반환

  현재 함수의 반환 타입이 Option<_>여야 함.
  아니면 컴파일 에러.
```

## 5.2 Result 사용 강제

```
fn might_fail(): Result<i32, string> { ... }

var x = might_fail()   // x의 타입: Result<i32, string>
println(x)             // ⚠️ 컴파일 경고: Result를 직접 사용

// 반드시 처리:
match might_fail() {
  Ok(v) => println(v)
  Err(e) => println(e)
}

// 또는 ? 로 전파:
var v = might_fail()?
```

## 5.3 panic

```
panic("message")

효과: 프로그램 즉시 종료, 스택 트레이스 출력.
catch 불가. 복구 불가.
용도: 프로그래머 논리 오류만. 일반 에러에 사용 금지.
```

---

# 6. 메모리 모델 (v4: 단순화)

## 6.1 v4 모델: Scope-based Drop

```
Ownership은 유지하되 Borrow Checker는 v4에서 구현하지 않는다.
```

| 기능 | v4 | v5 |
|------|-----|-----|
| 스코프 벗어나면 자동 해제 | ✅ | ✅ |
| Move semantics | ✅ | ✅ |
| Borrow (&, &mut) | ❌ | ✅ |
| Lifetime | ❌ | ✅ |
| Borrow Checker | ❌ | ✅ |

## 6.2 Move 규칙

```
var a = [1, 2, 3]
var b = a           // a → b 로 move
println(a)          // ❌ 컴파일 에러: use after move
println(b)          // ✅

// 원시 타입은 Copy:
var x = 42
var y = x           // copy (i32는 copy)
println(x)          // ✅
```

Copy 타입: i32, i64, f64, bool
Move 타입: string, Array, Struct, Option, Result, channel

## 6.3 함수 호출 시

```
fn consume(arr: [i32]) { ... }

var a = [1, 2, 3]
consume(a)          // a → 함수로 move
println(a)          // ❌ use after move
```

값을 유지하려면 clone:
```
consume(a.clone())  // 복사본 전달
println(a)          // ✅
```

## 6.4 스코프 해제

```
{
  var a = [1, 2, 3]   // a 생성
  // ... 사용 ...
}                      // a 자동 해제 (스코프 종료)
```

---

# 7. 동시성 모델

## 7.1 Actor 규칙

```
spawn {
  // 독립된 실행 컨텍스트
  // 외부 가변 변수 캡처 불가
  // 통신은 channel로만
}
```

## 7.2 spawn 캡처 규칙

```
var x = 42           // i32 (Copy)
var arr = [1, 2, 3]  // [i32] (Move)

spawn {
  println(x)         // ✅ Copy 타입은 복사됨
  println(arr)       // ❌ Move 타입은 캡처 불가
}

// Move 타입을 보내려면 channel 사용:
var ch: channel<[i32]> = channel()

spawn {
  var data = ch.recv()  // channel에서 받기
  println(data)
}

ch.send(arr)            // arr이 channel로 move
// arr은 이후 사용 불가
```

## 7.3 Channel 규칙

```
var ch: channel<i32> = channel()

ch.send(42)      // 값을 channel로 보냄 (Move 타입은 소유권 이전)
var v = ch.recv() // 값을 channel에서 받음 (블로킹)
```

| 메서드 | 동작 | 블로킹 |
|--------|------|--------|
| `send(v)` | 값 전송 | ❌ (무제한 버퍼) |
| `recv()` | 값 수신 | ✅ (값 올 때까지) |

## 7.4 동시성 안전 보장 (v4 수준)

```
보장하는 것:
  ✅ spawn 블록이 Move 타입을 직접 캡처하지 않음 (컴파일 검사)
  ✅ channel.send()가 소유권을 이전함 (move 검사)

보장하지 않는 것 (v5):
  ❌ deadlock 감지 (런타임에서도 안 함)
  ❌ channel 닫힘 감지
  ❌ Actor 종료 보장
```

---

# 8. 컴파일러 파이프라인 (FROZEN)

```
Source (.fl)
  │
  ▼
Lexer          → Token[]
  │
  ▼
Parser         → AST (Program)
  │
  ▼
TypeChecker    → Typed AST (타입 검사, exhaustiveness, move 검사)
  │
  ▼
IRGenerator    → IR (3-address code)
  │
  ▼
BytecodeCompiler → Bytecode
  │
  ▼
VM             → 실행
```

6단계. 추가/삭제/순서변경 금지.

---

# 9. Bytecode ISA (Instruction Set, FROZEN)

```
# Stack 조작
PUSH_I32 <value>
PUSH_I64 <value>
PUSH_F64 <value>
PUSH_BOOL <value>
PUSH_STR <index>       # 문자열 상수 테이블 인덱스
PUSH_NONE
POP
DUP

# 변수
LOAD_LOCAL <slot>
STORE_LOCAL <slot>
LOAD_GLOBAL <index>

# 산술
ADD_I32, ADD_I64, ADD_F64
SUB_I32, SUB_I64, SUB_F64
MUL_I32, MUL_I64, MUL_F64
DIV_I32, DIV_I64, DIV_F64
MOD_I32, MOD_I64
NEG_I32, NEG_I64, NEG_F64

# 비교
EQ, NE, LT, GT, LE, GE

# 논리
AND, OR, NOT

# 문자열
STR_CONCAT

# 분기
JUMP <offset>
JUMP_IF_FALSE <offset>

# 함수
CALL <func_index> <arg_count>
RETURN
RETURN_VOID

# 배열
ARRAY_NEW <length>
ARRAY_GET
ARRAY_SET
ARRAY_LEN

# 구조체
STRUCT_NEW <field_count>
STRUCT_GET <field_index>
STRUCT_SET <field_index>

# Option/Result
WRAP_SOME
WRAP_OK
WRAP_ERR
UNWRAP           # panic if None/Err
IS_SOME
IS_OK
MATCH_TAG        # 태그 비교 (Some/None/Ok/Err)

# 동시성
SPAWN
CHAN_NEW
CHAN_SEND
CHAN_RECV

# Move/Clone
MOVE             # 소유권 이전 (원본 무효화)
CLONE            # 깊은 복사

# 출력
PRINT

# 제어
HALT
PANIC
```

명령어 수: 약 55개. 이 이상 추가 금지.

---

# 10. Phase 구조 (FROZEN. 추가 금지.)

```
Phase 1 — Lexer
Phase 2 — Parser (Pratt + RD)
Phase 3 — AST Validator (구조 검증)
Phase 4 — Type Checker (타입, exhaustiveness, move)
Phase 5 — IR Generator (3-address code)
Phase 6 — Bytecode Compiler
Phase 7 — VM (Stack Machine + 기본 실행)
Phase 8 — Actor Runtime (spawn, channel)
```

8개 Phase. 13개 아님. 8개. 줄였다.

| Phase | 완료 조건 | 테스트 목표 |
|-------|----------|-----------|
| 1 | 모든 토큰 정상 출력 | 50+ |
| 2 | BNF 전체 파싱, AST 생성 | 100+ |
| 3 | 타입 없는 구조 검증 통과 | 50+ |
| 4 | 타입 에러, exhaustiveness, move 전부 감지 | 200+ |
| 5 | AST → IR 변환 정상 | 100+ |
| 6 | IR → Bytecode 정상 | 50+ |
| 7 | Hello World ~ 피보나치 실행 | 100+ |
| 8 | 악마 테스트 #2, #3 통과 | 100+ |
| **합계** | | **750+** |

---

# 11. 금지 규칙 (FROZEN)

```
1. Phase 추가 금지 (8개 고정)
2. AST 노드 추가 금지 (38종 고정)
3. Bytecode 명령어 추가 금지 (55개 고정)
4. 타입 추가 금지 (원시 6 + 복합 2 + 특수 3 = 11종 고정)
5. BNF 규칙 추가 금지 (현재 문법 고정)
6. IR 구조 변경 금지 (Phase 5에서 확정 후)
7. "설계만 있고 테스트 없는 Phase" 금지
```

---

# 부록: Start Gate 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| 타입 목록 확정 | ✅ | 11종 고정 |
| BNF 확정 | ✅ | 변경 금지 |
| AST 구조 확정 | ✅ | 38 노드 고정 |
| 타입 규칙 확정 | ✅ | 묵시적 변환 없음 |
| 에러 규칙 확정 | ✅ | Result 강제, ? 연산자 |
| 메모리 모델 확정 | ✅ | Move + Scope Drop (Borrow 없음) |
| 동시성 모델 확정 | ✅ | Actor + Channel (deadlock 감지 없음) |
| 파이프라인 확정 | ✅ | 6단계 FROZEN |
| Bytecode ISA 확정 | ✅ | ~55 명령어 FROZEN |
| Phase 구조 확정 | ✅ | 8 Phase FROZEN |
| 금지 규칙 확정 | ✅ | 7개 규칙 |

**모든 항목 ✅ → Phase 1 코딩 시작 허가.**
