# FreeLang v4 — Language Specification (1부: 설계 및 사양)

---

# 1. 타겟 페르소나 및 핵심 문제 정의

## 1.1 누구를 위한 언어인가

| 항목 | 정의 |
|------|------|
| **주 사용자** | AI Agent (Claude Code 등 LLM 기반 코드 생성 도구) |
| **부 사용자** | AI Agent를 운용하는 개발자 |
| **비사용자** | 일반 개발자 (범용 언어 아님) |

## 1.2 핵심 문제 (해결해야 하는 것)

AI Agent가 코드를 작성할 때 겪는 3가지 근본 문제:

```
문제 1: 런타임 에러를 사전에 감지할 수 없다
  → null 참조, 타입 불일치, 처리되지 않은 에러가 실행 중 폭발

문제 2: 동시성 코드에서 데이터 경쟁이 발생한다
  → 공유 메모리 + 뮤텍스 모델은 AI가 안전하게 작성하기 어려움

문제 3: 생성된 코드의 의도가 불명확하다
  → 암묵적 변환, 숨겨진 부작용이 디버깅을 어렵게 함
```

## 1.3 Value Proposition

```
"컴파일 타임에 모든 에러 경로가 강제되고,
 공유 메모리 없이 동시성이 보장되는,
 AI Agent 전용 시스템 언어"
```

## 1.4 비교 포지셔닝

| 특성 | Rust | Go | Python | FreeLang v4 |
|------|------|----|--------|-------------|
| 타입 안전성 | ✅ 최고 | ✅ 좋음 | ❌ 동적 | ✅ 최고 |
| 메모리 안전성 | ✅ Ownership | ❌ GC | ❌ GC | ✅ Ownership |
| 동시성 모델 | Send/Sync | Goroutine | GIL | Actor (메시지 전달) |
| 에러 처리 | Result<T,E> | error 반환 | Exception | Result<T,E> 강제 |
| AI 친화도 | ⚠️ 학습곡선 높음 | ✅ 단순 | ✅ 단순 | ✅ 설계 목표 |
| 암묵적 동작 | 적음 | 적음 | 많음 | **없음** |

---

# 2. 실행 모델 (Execution Model)

## 2.1 결정

```
FreeLang v4 실행 모델: Bytecode VM + 선택적 AOT
```

| 단계 | 방식 |
|------|------|
| 개발/테스트 | Bytecode → Stack-based VM (인터프리터) |
| 배포 | AOT → Native Binary (향후) |

## 2.2 근거

| 선택지 | 장점 | 단점 | 판정 |
|--------|------|------|------|
| 네이티브 컴파일 (C/Rust) | 최고 성능 | 구현 복잡, 크로스 컴파일 | ❌ v4 범위 초과 |
| JVM 기반 | 생태계 활용 | JVM 의존성 | ❌ 독립성 부족 |
| 인터프리터 | 빠른 구현 | 성능 한계 | ❌ 너무 느림 |
| **Bytecode VM** | **균형점** | **네이티브보다 느림** | **✅ 채택** |

## 2.3 실행 파이프라인

```
Source (.fl)
  → Lexer (tokens)
  → Parser (AST)          ← Pratt + RD
  → Semantic Analyzer      ← Type check, Scope, Exhaustiveness
  → IR Generator           ← 3-address code
  → Bytecode Compiler      ← Stack-based instructions
  → VM Execution           ← Stack VM + Actor scheduler
```

## 2.4 Bytecode 명세 (초안)

```
Opcode 분류:
  PUSH, POP, DUP                    # Stack 조작
  LOAD_LOCAL, STORE_LOCAL            # 로컬 변수
  LOAD_GLOBAL, STORE_GLOBAL          # 전역 변수
  ADD, SUB, MUL, DIV, MOD, POW      # 산술
  EQ, NE, LT, GT, LE, GE            # 비교
  AND, OR, NOT                       # 논리
  JUMP, JUMP_IF_FALSE                # 분기
  CALL, RETURN                       # 함수
  SPAWN, SEND, RECV                  # Actor
  MATCH_TAG                          # Pattern matching
  HALT                               # 종료
```

---

# 3. 추상화 수준 (Level of Abstraction)

## 3.1 결정

```
High-level + 선택적 Low-level 접근
```

## 3.2 구체적 경계

| 기능 | 허용 | 금지 |
|------|------|------|
| 포인터 직접 조작 | ❌ | 금지 |
| 원시 메모리 할당 | ❌ | 금지 |
| 인라인 어셈블리 | ❌ | 금지 |
| FFI (C 호출) | ⚠️ unsafe 블록 내에서만 | 일반 코드에서 금지 |
| 배열 경계 검사 | ✅ 항상 | 생략 불가 |
| Null 참조 | ❌ 존재 자체가 금지 | Option<T>로 대체 |
| 묵시적 타입 변환 | ❌ | 명시적 캐스트만 |

## 3.3 unsafe 블록 (유일한 탈출구)

```freelang
// 일반 코드: 모든 안전성 보장 활성
fn safe_code() {
  var arr = [1, 2, 3]
  var v = arr[5]        // 컴파일 에러: 인덱스 범위 초과
}

// unsafe: FFI 등 시스템 호출이 필요할 때만
unsafe {
  ffi_call("libc", "malloc", 1024)
}
```

unsafe 사용 시 컴파일러 경고 발생. 코드 리뷰 플래그.

---

# 4. 어휘 명세 (Lexical Grammar)

**상태: ✅ 확정 (기존 Phase 1 산출물)**

참조: `FREELANG_V4_PHASE2_SYNTAX_BNF.md` Token Types 섹션

## 4.1 토큰 종류 (18개)

```
KEYWORD     var, let, const, fn, if, else, match, spawn,
            return, import, export, type, async, await
IDENTIFIER  [A-Za-z_][A-Za-z0-9_]*
INTEGER     -?\d+
FLOAT       -?\d+\.\d+([eE][+-]?\d+)?
STRING      "..." (이스케이프: \n, \t, \\, \")
BOOLEAN     true, false
OPERATOR    + - * / % ** == != < > <= >= && || ! =
DELIMITER   ( ) { } [ ] , : ; . | ? =>
COMMENT     // line comment
            /* block comment */
EOF
```

## 4.2 어휘 규칙

- 공백: 무시 (토큰 구분자)
- 줄바꿈: 무시 (세미콜론 자동 삽입 없음)
- 주석: Lexer에서 제거, AST에 포함하지 않음
- 키워드: 식별자와 동일 규칙이나, 예약어 테이블로 분류
- 숫자 음수: 단항 연산자로 처리 (`-` + `INTEGER`)
- 문자열: 더블쿼트만. 싱글쿼트 미지원

---

# 5. 구문론 (Syntax) 및 BNF 정의

**상태: ✅ 확정 (기존 Phase 2 산출물 + Pratt 수정)**

참조:
- `FREELANG_V4_PHASE2_SYNTAX_BNF.md` (BNF 전체)
- `FREELANG_V4_PRATT_PARSER_DESIGN.md` (Pratt Parser)

## 5.1 파서 분류

```
Statement  → Deterministic Recursive Descent (키워드 분기)
Expression → Pratt Parser (Binding Power 기반)
Type       → Recursive Descent
Pattern    → Recursive Descent
```

LL(1) 아님. Pratt로 모든 FIRST 집합 충돌 해결 완료.

## 5.2 주요 구문 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 블록 구분 | `{ }` 중괄호 | 들여쓰기 모호성 제거 |
| 문장 종결 | 없음 (세미콜론 선택) | AI 생성 시 누락 에러 방지 |
| 식별자 스타일 | snake_case 권장 | 일관성 |
| 함수 선언 | `fn` 키워드 필수 | 명시적 |
| 타입 표기 | 변수 선언 시 선택, 함수 시그니처 필수 | 균형 |

---

# 6. 타입 시스템 (Type System)

## 6.1 분류

```
정적 타입 (Static Typing)
구조적 타입 (Structural Typing, 부분적)
대수적 데이터 타입 (ADT) 지원
Null 없음 (Option<T>으로 대체)
```

## 6.2 타입 계층 구조

```
Type
├── Primitive
│   ├── i32, i64          # 정수
│   ├── f32, f64          # 부동소수점
│   ├── bool              # 불리언
│   ├── string            # 문자열 (불변)
│   └── void              # 반환 없음
│
├── Composite
│   ├── [T]               # 배열 (동종)
│   ├── {k: T, ...}       # 구조체 (레코드)
│   └── (T1, T2) -> T3    # 함수 타입
│
├── Algebraic (ADT)
│   ├── Option<T>          # Some(T) | None
│   ├── Result<T, E>       # Ok(T) | Err(E)
│   └── (사용자 정의 enum)  # 향후
│
└── Generic
    └── T, U, V ...        # 타입 매개변수
```

## 6.3 타입 규칙

### Null 안전성

```
❌ 금지:
  var x: string = null          // 컴파일 에러

✅ 허용:
  var x: Option<string> = None  // 명시적
  var y: Option<string> = Some("hello")
```

### 묵시적 변환

```
❌ 금지 (전부):
  var x: i64 = 42_i32           // 컴파일 에러
  var y: f64 = 42               // 컴파일 에러
  var z: string = 42            // 컴파일 에러

✅ 허용:
  var x: i64 = i64(42)          // 명시적 캐스트
  var y: f64 = f64(42)          // 명시적 캐스트
  var z: string = str(42)       // 명시적 변환
```

### 타입 추론

```
var x = 42              // 추론: i32 (정수 기본)
var y = 3.14            // 추론: f64 (부동소수점 기본)
var z = "hello"         // 추론: string
var w = true            // 추론: bool
var a = [1, 2, 3]       // 추론: [i32]
var b = { x: 1, y: 2 } // 추론: {x: i32, y: i32}
```

함수 매개변수: 추론 안 함. **반드시 명시**.

```
fn add(a: i32, b: i32): i32 { return a + b }  // ✅
fn add(a, b) { return a + b }                  // ❌ 컴파일 에러
```

### Exhaustiveness (완전성 검사)

```freelang
fn handle(r: Result<i32, string>): i32 {
  match r {
    Ok(v) => v
    // ❌ 컴파일 에러: Err case 누락
  }
}

fn handle(r: Result<i32, string>): i32 {
  match r {
    Ok(v) => v
    Err(e) => -1    // ✅ 모든 case 처리
  }
}
```

## 6.4 Generic 타입

```freelang
fn identity<T>(x: T): T {
  return x
}

fn map<T, U>(arr: [T], f: (T) -> U): [U] {
  // 구현
}
```

Generic 제약 조건 (Trait Bound): v4에서는 미지원. v5 후보.

---

# 7. 메모리 관리 전략 (Memory Management)

## 7.1 결정

```
Ownership 모델 (Rust 스타일, 단순화)
```

## 7.2 선택 근거

| 전략 | 장점 | 단점 | 판정 |
|------|------|------|------|
| malloc/free | 최고 제어 | 메모리 누수, dangling pointer | ❌ 안전하지 않음 |
| GC (Mark-Sweep) | 편리함 | 일시 정지, 예측 불가 | ❌ 실시간 부적합 |
| ARC (참조 카운트) | 단순함 | 순환 참조 문제 | ⚠️ 부분 채택 |
| **Ownership** | **컴파일 타임 보장** | **학습곡선** | **✅ 채택** |

## 7.3 소유권 규칙 (3가지)

```
규칙 1: 모든 값은 정확히 하나의 소유자를 가진다
규칙 2: 소유자가 스코프를 벗어나면 값은 자동 해제된다
규칙 3: 소유권은 이동(move) 또는 빌림(borrow)만 가능하다
```

### Move 의미론

```freelang
var a = [1, 2, 3]
var b = a              // a의 소유권이 b로 이동
// a는 이 시점 이후 사용 불가
println(a)             // ❌ 컴파일 에러: use after move
println(b)             // ✅ [1, 2, 3]
```

### Borrow 의미론

```freelang
var a = [1, 2, 3]
var b = &a             // 불변 빌림 (immutable borrow)
println(b)             // ✅ [1, 2, 3]
println(a)             // ✅ 여전히 사용 가능

var c = &mut a         // 가변 빌림 (mutable borrow)
c.push(4)              // ✅ 수정 가능
// 이 시점에 &a는 사용 불가 (가변 빌림 활성 중)
```

### 빌림 규칙 (2가지)

```
규칙 A: 불변 빌림은 동시에 여러 개 가능
규칙 B: 가변 빌림은 동시에 하나만 가능, 불변 빌림과 공존 불가
```

## 7.4 v4 단순화 (Rust 대비)

```
Rust 전체 기능     → FreeLang v4 채택 범위
─────────────────────────────────────────
Ownership          ✅ 채택
Move               ✅ 채택
Borrow (&, &mut)   ✅ 채택
Lifetime ('a)      ❌ 미채택 (v5 후보)
Pin, Unpin         ❌ 미채택
Interior Mutability ❌ 미채택
```

Lifetime 생략: 컴파일러가 기본 규칙으로 자동 추론.
추론 실패 시 컴파일 에러 + 명확한 안내 메시지.

---

# 8. 스코프 및 이름 확인 (Scoping & Name Resolution)

## 8.1 스코프 모델

```
Lexical Scope (정적 스코프)
```

변수는 **선언된 블록 내에서만** 유효.

## 8.2 스코프 계층

```
Global Scope (프로그램 전체)
  └── Module Scope (파일 단위)
      └── Function Scope (함수 본문)
          └── Block Scope ({ } 블록)
              └── Block Scope (중첩 가능)
```

## 8.3 Shadowing

```
허용: ✅ (같은 스코프 내에서도)
```

```freelang
var x = 10
var x = "hello"     // ✅ 허용 (x는 이제 string)
                    // 이전 x (i32)는 접근 불가

fn foo() {
  var x = 42        // ✅ 외부 x를 가림
}
```

근거: AI Agent가 변수 이름을 재사용하는 것이 자연스러움.
이전 값은 소유권 규칙에 따라 자동 해제.

## 8.4 전역 변수

```
❌ 가변 전역 변수 금지
✅ 상수 전역만 허용
```

```freelang
const MAX_SIZE: i32 = 1024    // ✅ 불변 전역
var counter: i32 = 0           // ❌ 컴파일 에러: 가변 전역 금지
```

근거: 가변 전역 상태는 동시성에서 데이터 경쟁의 근원.

## 8.5 이름 확인 순서

```
1. 현재 블록 스코프
2. 상위 블록 스코프 (반복)
3. 함수 스코프
4. 모듈 스코프
5. 전역 스코프 (상수만)
6. Import된 모듈
7. 발견 실패 → 컴파일 에러
```

## 8.6 Forward Declaration

```
❌ 불필요 (함수는 파일 내 어디에든 선언 가능)
```

컴파일러가 2-pass로 처리:
- Pass 1: 모든 함수/타입 시그니처 수집
- Pass 2: 본문 분석 및 타입 검사

---

# 9. 제어 흐름 및 예외 모델

## 9.1 제어 흐름

### 조건문

```freelang
if condition {
  // then
} else if other_condition {
  // else if
} else {
  // else
}
```

`if`는 expression으로도 사용 가능:
```freelang
var x = if a > b { a } else { b }
```

### 반복문

```freelang
// for-in (유일한 반복문)
for item in collection {
  // body
}

// 범위 반복
for i in 0..10 {
  // 0, 1, 2, ..., 9
}
```

`while`, `loop` 없음. `for` + `Iterator`로 모든 반복 표현.
무한 반복이 필요하면:
```freelang
for _ in forever() {
  // 무한 반복
}
```

근거: 무한 루프 실수 방지. AI Agent가 종료 조건을 명시하도록 강제.

### Pattern Matching

```freelang
match value {
  Ok(v) => handle_ok(v)
  Err(e) => handle_err(e)
}
```

Exhaustiveness 강제. 누락된 case → 컴파일 에러.

## 9.2 예외 모델

```
Exception 없음. Result<T, E> 강제.
```

### 비교

| 방식 | 언어 | 문제 | FreeLang v4 |
|------|------|------|-------------|
| try-catch | Java, JS, Python | 숨겨진 제어 흐름 | ❌ 채택 안 함 |
| error 반환 | Go | 무시 가능 | ❌ 무시 가능이 문제 |
| panic | Rust (일부) | 복구 불가 | ⚠️ 제한적 채택 |
| **Result<T, E>** | **Rust** | **없음** | **✅ 유일한 에러 전파 방식** |

### 에러 전파

```freelang
fn read_file(path: string): Result<string, Error> {
  var file = open(path)?        // ? 연산자: Err이면 즉시 반환
  var content = file.read()?
  return Ok(content)
}
```

`?` 연산자: `Result`가 `Err`이면 현재 함수에서 `Err` 반환.

### 에러 처리 강제

```freelang
var result = read_file("test.txt")
// result를 그냥 무시하면:
// ❌ 컴파일 경고: unused Result (must_use)

// 반드시 처리:
match result {
  Ok(content) => println(content)
  Err(e) => println(e.message)
}
```

### panic (복구 불가 에러)

```freelang
// 논리적으로 도달할 수 없는 상황에서만 사용
fn unreachable_case(): ! {
  panic("This should never happen")
}
```

panic은 프로그램 즉시 종료. catch 불가. 로그만 남김.
일반 에러 처리에 panic 사용 → 코드 리뷰 경고.

---

# 10. 확장성 및 모듈성 (Extensibility & Modularity)

## 10.1 모듈 시스템

```freelang
// math.fl
export fn add(a: i32, b: i32): i32 {
  return a + b
}

export const PI: f64 = 3.14159

// main.fl
import add from "math"
import PI from "math"

fn main() {
  var result = add(1, 2)
  println(result)
}
```

## 10.2 모듈 규칙

```
1개 파일 = 1개 모듈
export된 것만 외부 접근 가능
import는 파일 최상단에만
순환 import 금지 (컴파일 에러)
```

## 10.3 네임스페이스

```freelang
import math from "std/math"

fn main() {
  var x = math.sin(3.14)     // 네임스페이스 접근
}
```

충돌 시 alias:
```freelang
import sin from "std/math" as math_sin
import sin from "custom/trig" as custom_sin
```

## 10.4 인터페이스 (Trait)

```freelang
type Printable = {
  fn to_string(self): string
}

type Comparable<T> = {
  fn compare(self, other: T): i32
}
```

v4 범위: **구조적 서브타이핑(Structural Subtyping)**

```freelang
// Point가 Printable을 명시적으로 구현하지 않아도,
// to_string 메서드가 있으면 Printable로 사용 가능
type Point = { x: i32, y: i32 }

fn point_to_string(self: Point): string {
  return str(self.x) + ", " + str(self.y)
}
```

명시적 impl 선언: v5 후보.

## 10.5 표준 라이브러리 구조 (계획)

```
std/
├── io          # 파일, 표준입출력
├── math        # 수학 함수
├── string      # 문자열 유틸리티
├── collections # Vec, Map, Set
├── result      # Result, Option 유틸리티
├── actor       # Actor 생성, 메시지, 채널
├── time        # 시간, 타이머
└── fmt         # 포맷팅
```

## 10.6 패키지 관리

KPM (Kim Package Manager) 연동.
v4 자체에는 패키지 관리 내장하지 않음.
외부 도구(KPM)에 위임.

---

# 부록 A: 동시성 모델 상세 (Actor Model)

## A.1 선택

```
Actor Model (Erlang/Elixir 스타일)
공유 메모리 없음
메시지 전달만 허용
```

## A.2 spawn

```freelang
spawn {
  // 독립된 Actor
  // 부모와 메모리 공유 없음
  // 통신은 채널로만
}
```

## A.3 채널

```freelang
var ch: channel<i32> = channel()

spawn {
  ch.send(42)
}

var value = ch.recv()   // 블로킹: 값이 올 때까지 대기
```

## A.4 채널 타입

```
channel<T>           # 무제한 버퍼
channel<T>(n)        # n개 버퍼 (bounded)
```

## A.5 동시성 안전성

```
규칙 1: spawn 블록은 외부 가변 변수를 캡처하지 못한다
규칙 2: 채널로 보내는 값은 move된다 (소유권 이전)
규칙 3: 채널 타입은 Send 가능한 타입만 허용
```

```freelang
var data = [1, 2, 3]

spawn {
  ch.send(data)      // data의 소유권이 채널로 이동
}

println(data)         // ❌ 컴파일 에러: use after move
```

---

# 부록 B: 미결정 사항 (v5 이후)

| 항목 | 상태 | 비고 |
|------|------|------|
| Lifetime annotation | ❌ 미채택 | 자동 추론으로 대체 |
| Generic trait bound | ❌ 미채택 | 구조적 타이핑으로 대체 |
| Async/Await | ⚠️ 키워드 예약 | Actor로 대체 가능 |
| 매크로 시스템 | ❌ 미채택 | 복잡성 회피 |
| 연산자 오버로딩 | ❌ 미채택 | 명시적 함수 호출 |
| 상속 | ❌ 미채택 | Composition + Trait |
| while/loop | ❌ 미채택 | for + Iterator |
| Exception | ❌ 미채택 | Result<T,E> 강제 |
| Null/nil/undefined | ❌ 미채택 | Option<T> 강제 |
| 가변 전역 변수 | ❌ 미채택 | 동시성 안전 |

---

# 부록 C: 설계 문서 색인

| 문서 | 내용 | 상태 |
|------|------|------|
| `FREELANG_V4_PHASE2_SYNTAX_BNF.md` | BNF 문법 전체 | ✅ 확정 |
| `FREELANG_V4_PHASE3_PARSER_20Q20A.md` | Parser 설계 20Q20A | ✅ 확정 (Pratt 수정) |
| `FREELANG_V4_PRATT_PARSER_DESIGN.md` | Pratt Parser 설계도 | ✅ 확정 |
| `FREELANG_V4_LANGUAGE_SPEC.md` | 이 문서 (1부 전체) | ✅ 현재 |

---

# 부록 D: 악마 테스트 (설계 검증)

## 악마 테스트 #2

```freelang
var ch: channel<Result<i32, string>> = channel()

spawn {
  sleep(10)
  ch.send(Ok(42))
}

spawn {
  match ch.recv() {
    Ok(n) => println(n)
    Err(e) => println(e)
  }
}
```

검증 항목:
- [x] 타입 안전: channel<Result<i32, string>> 정적 타입
- [x] 동시성: spawn이 Actor로 실행
- [x] 소유권: send로 값 이동
- [x] 에러 처리: match exhaustiveness 강제
- [x] Null 안전: Option/Result만 사용

## 악마 테스트 #3

```freelang
fn process(items: [i32]): Result<i32, Error> {
  var sum = 0
  for item in items {
    match validate(item) {
      Ok(v) => sum = sum + v
      Err(e) => return Err(e)
    }
  }
  return Ok(sum)
}
```

검증 항목:
- [x] 타입: [i32] → Result<i32, Error>
- [x] 에러 전파: match에서 Err 즉시 반환
- [x] Exhaustiveness: Ok/Err 모두 처리
- [x] 소유권: items는 불변 빌림
- [x] 반복: for-in 패턴
