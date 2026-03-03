# SPEC_11: Control Flow (제어 흐름)

**Version**: 1.0
**Status**: Stable
**Phases**: 8.3, 8.4
**Date**: 2026-03-03

---

## 목차
1. [개념](#개념)
2. [While 루프](#while-루프)
   - 문법
   - 의미론
   - 타입 규칙
   - 제약
3. [for...of 루프](#forof-루프)
   - 개념과 Iterator
   - 문법
   - 의미론
   - 타입 규칙
   - 제약
4. [루프 제어 문](#루프-제어-문)
   - break
   - continue

---

## 개념

**제어 흐름(Control Flow)**은 프로그램의 **실행 순서를 제어**하는 메커니즘입니다.

이 명세에서는 두 가지 반복 구조를 정의합니다:
- **While 루프**: 조건 기반 반복
- **for...of 루프**: 이터러블 순회 기반 반복

---

## While 루프

### 개념

**While 루프**는 **Boolean 조건식이 참인 동안** 본체를 반복 실행합니다.

#### 특징
- 조건 기반 반복
- 반복 횟수를 미리 알 수 없음
- 무한 루프 가능
- 루프 제어 문 (break, continue) 지원

---

### 문법

```
WhileStmt = "while" Expr "{" StmtList "}"

StmtList = Stmt*

Stmt = VarDecl | IfStmt | WhileStmt | ForStmt | ForOfStmt | BreakStmt | ContinueStmt | ...
```

#### 예시

```
while Condition {
    Statement1
    Statement2
    ...
}
```

---

### 의미론

#### 실행 절차

```
Algorithm: WHILE_LOOP
Input: Condition, Body
State: Env (현재 환경/스코프)

1. NewScope = CreateScope(Env)  // 루프 전용 스코프 생성
2. LOOP:
   a. Cond_Value = Evaluate(Condition, NewScope)
   b. if Cond_Value == false:
      - RestoreScope(Env)
      - GOTO DONE
   c. for each Stmt in Body:
      - if Stmt == break:
        * GOTO DONE
      - else if Stmt == continue:
        * GOTO LOOP
      - else:
        * Execute(Stmt, NewScope)
   d. GOTO LOOP
3. DONE: 루프 종료, 이전 환경 복원
```

#### 상태 변화 규칙

| 단계 | 조건 | 액션 |
|------|------|------|
| 조건 평가 | Cond = true | Body 실행, 조건 재평가 |
| 조건 평가 | Cond = false | 루프 종료 |
| break 실행 | 루프 내 | 즉시 루프 종료 |
| continue 실행 | 루프 내 | 조건 재평가로 점프 |

---

### 타입 규칙

#### T-WhileStmt (While 문)

```
⊢ Condition: bool
⊢ Body: Statement*

⊢ while Condition { Body } : Statement
```

**제약**: Condition의 타입은 **정확히 bool**이어야 함

---

### 제약

#### C1. 조건은 bool 필수

```
while 42 { ... }  // ❌ 오류: 42는 i32, bool 필요
while true { ... }  // ✓ OK: true는 bool_lit
while x > 0 { ... }  // ✓ OK: (>) 연산의 반환은 bool
```

#### C2. 무한 루프 가능 (안전성은 런타임)

```
while true {
    ...
}
```

**의미론**: 조건이 항상 true이므로 계속 반복

#### C3. 루프 스코프

```
var x = 1
while x < 10 {
    var y = x + 1  // y는 루프 스코프
    x = y
}
// var z = y  // ❌ 오류: y는 루프 외부에서 접근 불가
```

**규칙**: 루프 내 선언 변수는 루프 스코프에만 존재

---

## for...of 루프

### 개념

**for...of 루프**는 **이터러블(Iterable) 객체의 각 요소를 순회**합니다.

#### Iterator 프로토콜

```
Iterator = {
    next(): (value: Element, done: bool)
}

Iterable = {
    [Symbol.iterator](): Iterator
}
```

#### 지원되는 이터러블

현재 FreeLang v4에서 지원:
- **Array**: `[Element]`
- **String**: 각 문자를 Element로 순회

#### 의미론

```
for (Variable of Iterable) { Body }
≡
iterator = Iterable[Symbol.iterator]()
while not iterator.done:
    Variable = iterator.next()
    Body
```

---

### 문법

```
ForOfStmt = "for" IDENT "of" Expr "{" StmtList "}"

IDENT = 루프 변수명 (새로 선언됨)
Expr = 이터러블 표현식
```

#### 예시

```
for element of [1, 2, 3] {
    var sum = sum + element
}

for char of "hello" {
    var upper = toUpperCase(char)
}
```

---

### 의미론

#### 실행 절차

```
Algorithm: FOR_OF_LOOP
Input: Variable, Iterable, Body
State: Env (현재 환경/스코프)

1. IterType = GetType(Iterable)
2. case IterType of:
   a. Array[ElementType]:
      - ElementType = IterType.element
   b. String:
      - ElementType = String
   c. Other:
      - ERROR: "Iterable must be Array or String"

3. NewScope = CreateScope(Env)  // 루프 스코프 생성
4. Define(Variable, ElementType, immutable) in NewScope

5. ITERATE:
   a. (Element, done) = GetNextElement(Iterable)
   b. if done:
      - RestoreScope(Env)
      - GOTO DONE
   c. Bind(Variable, Element) in NewScope
   d. for each Stmt in Body:
      - if Stmt == break:
        * GOTO DONE
      - else if Stmt == continue:
        * GOTO ITERATE
      - else:
        * Execute(Stmt, NewScope)
   e. GOTO ITERATE

6. DONE: 루프 종료, 이전 환경 복원
```

#### 배열 순회 예시

```
Iterable: [1, 2, 3]  (type: [i32])
Variable: x
ElementType: i32

Iteration 1: x = 1, Execute Body
Iteration 2: x = 2, Execute Body
Iteration 3: x = 3, Execute Body
Iteration 4: done = true, Exit
```

#### 문자열 순회 예시

```
Iterable: "abc"  (type: string)
Variable: ch
ElementType: string

Iteration 1: ch = "a", Execute Body
Iteration 2: ch = "b", Execute Body
Iteration 3: ch = "c", Execute Body
Iteration 4: done = true, Exit
```

---

### 타입 규칙

#### T-ForOfStmt (for...of 문)

```
⊢ Iterable: [ElementType]  |  Iterable: string
⊢ Body: Statement*

Variable: ElementType  (new binding in loop scope)

⊢ for Variable of Iterable { Body } : Statement
```

#### 타입 검사 규칙

```
Iterable Type Check:

if Iterable_Type == Array[T]:
    Element_Type = T
else if Iterable_Type == string:
    Element_Type = string
else:
    ERROR: "for...of requires Array or String, got {Iterable_Type}"
```

---

### 제약

#### C1. 이터러블은 배열 또는 문자열

```
for x of 42 { ... }  // ❌ 오류: i32는 이터러블 아님
for x of [1, 2, 3] { ... }  // ✓ OK: 배열
for x of "hello" { ... }  // ✓ OK: 문자열
```

#### C2. 루프 변수는 불변(immutable)

```
for x of [1, 2, 3] {
    x = 10  // ❌ 오류: 루프 변수는 불변
    var y = x + 1  // ✓ OK: 읽기만 가능
}
```

**의미론**: 루프 변수는 각 반복마다 새로운 값으로 **바인딩**되므로 변경 불가능

#### C3. 루프 변수 스코핑

```
var x = 100
for x of [1, 2, 3] {  // 새로운 x (루프 스코프)
    var y = x
}
var z = x  // z = 100 (외부의 x)
```

**규칙**: 루프 변수는 루프 스코프에만 존재

#### C4. 배열 요소 타입 일치

```
for n of [1, 2, 3] {  // n: i32
    var s: string = n  // ❌ 오류: i32 ≠ string
}
```

#### C5. 빈 배열/문자열 처리

```
for x of [] { ... }  // Body는 실행되지 않음
for x of "" { ... }  // Body는 실행되지 않음
```

---

## 루프 제어 문

### break

#### 개념

**break** 문은 가장 가까운 **루프(while, for...of)를 즉시 종료**합니다.

#### 문법

```
BreakStmt = "break" ";"
```

#### 의미론

```
Execute: break;

Effect:
  - 가장 가까운 루프 블록 종료
  - 루프 다음 문부터 실행 재개
  - 중첩 루프인 경우 한 단계 루프만 종료
```

#### 타입 규칙

```
break 문은 루프(while 또는 for...of) 내에서만 유효

⊢ break ; : Statement  (in loop context)
```

#### 제약

```
break 문이 루프 외부에서 실행되면 ERROR
```

#### 예시

```
while true {
    if condition { break }  // 조건만족 시 루프 종료
}

for x of [1, 2, 3, 4, 5] {
    if x == 3 { break }  // x == 3 일 때 루프 종료 (1, 2만 처리)
}
```

---

### continue

#### 개념

**continue** 문은 **현재 반복의 나머지 부분을 건너뛰고** 다음 반복으로 진행합니다.

#### 문법

```
ContinueStmt = "continue" ";"
```

#### 의미론

```
Execute: continue;

Effect:
  - 루프 본체의 나머지 문 건너뜀
  - (while) 조건 재평가로 점프
  - (for...of) 다음 요소 값으로 점프
  - 중첩 루프인 경우 가장 가까운 루프만 영향
```

#### 타입 규칙

```
continue 문은 루프(while 또는 for...of) 내에서만 유효

⊢ continue ; : Statement  (in loop context)
```

#### 예시

```
var sum = 0
for x of [1, 2, 3, 4, 5] {
    if x == 2 { continue }  // x == 2 건너뜀
    sum = sum + x  // sum = 1 + 3 + 4 + 5 = 13
}
```

---

## 루프 중첩

### 문법

```
중첩된 루프는 루프 문 내부에 또 다른 루프 문 포함

while ... {
    while ... { ... }  // 2중 while
    for ... { ... }    // while 내부 for...of
    ...
}

for ... {
    for ... { ... }    // 2중 for...of
    while ... { ... }  // for...of 내부 while
    ...
}
```

### 의미론

#### break 동작

```
while outer {
    while inner {
        if condition { break }  // inner 루프만 종료
    }
    // inner 루프 후 외부 루프 계속
}
```

#### continue 동작

```
for x of arr1 {
    for y of arr2 {
        if condition { continue }  // 내부 for...of만 영향
    }
    // 외부 for...of는 계속
}
```

### 제약

- break는 **가장 가까운** 루프만 종료
- continue는 **가장 가까운** 루프만 영향
- 여러 루프 탈출이 필요하면 복합 조건 사용

---

## 제어 흐름 정리 표

| 문법 | 조건 | 동작 | 타입 제약 |
|------|------|------|---------|
| while C { B } | C: bool | C=true → B 반복 | Condition: bool |
| for v of I { B } | I: [T] 또는 string | I의 각 요소 v로 B 반복 | Iterable: Array 또는 String |
| break | 루프 내 | 현재 루프 종료 | 루프 컨텍스트만 |
| continue | 루프 내 | 다음 반복으로 점프 | 루프 컨텍스트만 |

---

## 상호 참조

- **SPEC_06**: 타입 시스템 (bool, Array, String 타입)
- **SPEC_08**: 스코프 관리 (루프 스코프 생성/복원)
- **SPEC_09**: 구조체 (루프 내 복합 자료형)
- **SPEC_10**: 일급 함수 (루프 내 함수 호출)

---

## 변경 이력

| 버전 | 날짜        | 변경사항        |
|------|-----------|-------------|
| 1.0  | 2026-03-03 | 초판 작성      |

---

## 참고: AST 매핑 (참조 구현)

이 명세는 다음과 같이 AST로 구현됩니다:

```typescript
// While 루프
type WhileStmt = {
  kind: "while_stmt"
  condition: Expr
  body: Stmt[]
}

// for...of 루프
type ForOfStmt = {
  kind: "for_of_stmt"
  variable: string
  iterable: Expr
  body: Stmt[]
}

// Break 문
type BreakStmt = {
  kind: "break_stmt"
}

// Continue 문
type ContinueStmt = {
  kind: "continue_stmt"
}
```

---

## VM 실행 모델

### While 루프 VM 코드

```
ENTER_SCOPE
LOOP_START:
  EVAL_EXPR(condition)
  JUMP_IF_FALSE(LOOP_END)
  EXECUTE_BODY()
  JUMP(LOOP_START)
LOOP_END:
  EXIT_SCOPE
```

### for...of 루프 VM 코드

```
ENTER_SCOPE
EVAL_EXPR(iterable)
GET_ITERATOR()
LOOP_START:
  CALL_NEXT()
  JUMP_IF_DONE(LOOP_END)
  BIND_VARIABLE(value)
  EXECUTE_BODY()
  JUMP(LOOP_START)
LOOP_END:
  EXIT_SCOPE
```
