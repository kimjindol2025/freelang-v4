# SPEC_10: First-Class Functions (일급 함수)

**Version**: 1.0
**Status**: Stable
**Phase**: 8.2
**Date**: 2026-03-03

---

## 목차
1. [개념](#개념)
2. [문법](#문법)
3. [의미론](#의미론)
4. [타입 규칙](#타입-규칙)
5. [제약](#제약)
6. [고차 함수](#고차-함수)
7. [클로저](#클로저)

---

## 개념

**일급 함수(First-Class Function)**는 함수를 **값으로 취급**할 수 있는 언어 기능입니다.

### 핵심 특성
- **변수 할당 가능**: 함수를 변수에 저장
- **인자로 전달 가능**: 함수를 다른 함수의 인자로 전달
- **반환값으로 사용 가능**: 함수가 함수를 반환
- **익명 함수 지원**: 이름 없는 함수 리터럴 정의 가능
- **고차 함수 지원**: 함수를 인자로 받거나 반환하는 함수
- **클로저 지원**: 정의 당시 스코프 환경 캡처

### 타입 시스템 관점
- 함수의 타입: `(ParamType1, ParamType2, ...) -> ReturnType`
- 함수는 **Move 타입** (SPEC_07 참조)
- 함수 타입은 **일등 시민(First-Class Citizen)**

---

## 문법

### 1. 함수 리터럴 (익명 함수)

```
FnLit = "fn" "(" ParamList ")" ("->" ReturnType)? "{" Expr "}"

ParamList = ε | Param ("," Param)*

Param = IDENT (":" TypeAnnotation)?
```

### 2. 함수 타입 표기

```
FnType = "fn" "(" TypeList ")" "->" ReturnType

TypeList = ε | TypeAnnotation ("," TypeAnnotation)*
```

### 3. 함수 변수 선언

```
var f: fn(i32, i32) -> i32 = fn(a, b) -> i32 { a + b }
```

### 4. 함수 호출

```
CallExpr = Expr "(" ArgList ")"

ArgList = ε | Expr ("," Expr)*
```

---

## 의미론

### 규칙 1: 함수 리터럴 생성

**입력**: FnLit (매개변수 + 본체)
**처리**:
1. 함수 객체 생성:
   - 매개변수 목록 저장
   - 함수 본체 저장
   - **현재 스코프 환경 캡처** (클로저)
2. 함수 타입 유추/검사:
   - 반환 타입이 명시되면 본체 반환 타입과 일치 검사
   - 반환 타입이 미명시되면 본체에서 유추
3. 함수 객체를 **값**으로 반환

**출력**: 함수 값 (호출 가능한 객체)

---

### 규칙 2: 함수 할당

**입력**: 함수 값을 변수에 할당
**처리**:
1. 변수의 타입이 함수 타입인지 확인
2. 함수의 시그니처(인자 + 반환 타입)와 일치 검사
3. 함수는 **Move 타입**:
   - 할당 시 소유권 이전
   - 동일 함수값은 중복 사용 불가능
4. 변수에 함수값 저장

**출력**: 함수를 저장한 변수

---

### 규칙 3: 함수 호출

**입력**: CallExpr (함수 변수 + 인자)
**처리**:
1. 호출 대상이 함수 타입인지 확인
2. 전달된 인자 수와 함수의 매개변수 수 일치 검사
3. 각 인자의 타입과 매개변수 타입 일치 검사
4. 함수 본체 실행:
   - 새 스코프 생성
   - 매개변수를 인자값으로 바인딩
   - 캡처된 환경 접근 가능
   - 본체 평가
5. 반환값의 타입 검사

**출력**: 함수 본체의 반환값

---

### 규칙 4: 클로저 (Lexical Scoping)

**입력**: 함수 리터럴이 외부 스코프의 변수를 참조
**처리**:
1. 함수 리터럴 생성 시 **현재 스코프 환경 캡처**
2. 함수 실행 시:
   - 로컬 변수: 함수 스코프에서 조회
   - 외부 변수: 캡처된 환경에서 조회
   - 전역 변수: 글로벌 스코프에서 조회
3. 캡처된 변수의 값은 **함수 생성 당시 상태**

**제약**: Mutable 변수 캡처 시 **값 복사** (move 의미론)

---

## 타입 규칙

### T-FnLit (함수 리터럴)

```
Param_i = (name_i: Type_i) for i = 1..n
⊢ Body: ReturnType

⊢ fn(Param_1, ..., Param_n) -> ReturnType { Body }
  : fn(Type_1, ..., Type_n) -> ReturnType
```

### T-FnVar (함수 변수 선언)

```
⊢ f_expr: fn(Type_1, ..., Type_n) -> ReturnType

⊢ var f: fn(Type_1, ..., Type_n) -> ReturnType = f_expr
  OK
```

### T-Call (함수 호출)

```
⊢ f: fn(Type_1, ..., Type_n) -> ReturnType
⊢ arg_i: Type_i  for i = 1..n

⊢ f(arg_1, ..., arg_n) : ReturnType
```

### T-HigherOrder (고차 함수)

```
⊢ f: fn(Type_1, ..., Type_n) -> ReturnType
⊢ g: fn(fn(Type_1, ..., Type_n) -> ReturnType, Type_other) -> ResultType

⊢ g(f, arg) : ResultType
```

---

## 제약

### C1. 함수 타입 불일치

```
var f: fn(i32) -> i32 = fn(x: f64) -> i32 { 0 }  // ❌ 오류: 인자 타입 f64 ≠ i32
var g: fn(i32) -> i32 = fn(x: i32) -> f64 { 0.5 }  // ❌ 오류: 반환 f64 ≠ i32
```

### C2. 인자 수 불일치

```
var f = fn(a: i32, b: i32) -> i32 { a + b }
var result = f(1)  // ❌ 오류: 인자 1개 ≠ 매개변수 2개
```

### C3. Move 타입 제약

```
var f = fn(x: i32) -> i32 { x }
var g = f
var h = f  // ❌ 오류: f는 이미 g로 moved
```

### C4. 클로저 캡처 범위

```
var x: i32 = 10
var f = fn(y: i32) -> i32 { x + y }  // x는 캡처됨
{
    var x = 20  // 다른 스코프의 x
    var result = f(5)  // x + 5 = 10 + 5 = 15 (캡처된 x 사용)
}
```

### C5. 재귀 함수

```
var fact: fn(i32) -> i32 = fn(n: i32) -> i32 {
    if n <= 1 { 1 } else { n * fact(n - 1) }
}
```

**제약**: 함수 이름으로 재귀 가능 (var 선언 후 자기 참조)

---

## 고차 함수

### 정의

**고차 함수(Higher-Order Function)**는:
- 함수를 인자로 받거나
- 함수를 반환값으로 반환

하는 함수입니다.

### 의미론

#### 고차 함수 타입 예시

```
map: fn(fn(T) -> U, [T]) -> [U]
filter: fn(fn(T) -> bool, [T]) -> [T]
fold: fn(fn(T, U) -> U, [T], U) -> U
```

#### 의미론 규칙

**입력**: 함수 f와 배열 arr를 map에 전달
**처리**:
1. map의 타입 검사:
   - 첫 인자 f의 타입: `fn(T) -> U`
   - 두 번째 인자 arr의 타입: `[T]`
2. arr의 각 요소 e에 대해:
   - f(e) 호출
   - 결과를 새 배열에 추가
3. `[U]` 타입의 결과 배열 반환

---

## 클로저

### 정의

**클로저(Closure)**는 정의된 스코프의 **환경을 캡처**하여 나중에 실행되는 함수입니다.

### 의미론

#### 캡처 규칙

```
Captured_Env = { (name, value) | name ∈ outer_scope }
```

#### 클로저 실행

```
⊢ Closure(arg_1, ..., arg_n)
  = Evaluate(Body, Param_Binding ∪ Captured_Env)
```

즉:
- **로컬 변수**: 함수 실행 시점의 매개변수와 로컬 변수
- **캡처된 변수**: 함수 **정의 시점**의 외부 스코프 값
- **우선순위**: 로컬 > 캡처됨 > 글로벌

#### 예시

```
var multiplier = 2
var multiply = fn(x: i32) -> i32 { x * multiplier }
// multiplier = 2 캡처

multiplier = 5  // (이것은 새 할당)
var result = multiply(3)  // 결과 = 3 * 2 = 6 (캡처된 값 사용)
```

### 제약

- **Mutable 캡처**: 캡처 시점의 값으로 **고정** (복사)
- **여러 클로저 간 공유**: 각 클로저가 독립적인 환경 캡처

---

## 타입 호환성

### 구조적 함수 타입

```
fn(i32, i32) -> i32  ≡  fn(i32, i32) -> i32
fn(i32) -> bool      ≠  fn(i32) -> i32
fn(i32) -> void      ≠  fn(i32, i32) -> void
```

즉:
- 매개변수 타입 **순서 일치** 필수
- 매개변수 **이름**은 무관
- 반환 타입 **정확히 일치** 필수

---

## 상호 참조

- **SPEC_06**: 타입 시스템 (함수 타입 정의)
- **SPEC_07**: Move 의미론 (함수는 Move 타입)
- **SPEC_08**: 스코프 관리 (클로저의 환경 캡처)
- **SPEC_11**: 제어 흐름 (함수 리터럴과 조건/반복)

---

## 변경 이력

| 버전 | 날짜        | 변경사항        |
|------|-----------|-------------|
| 1.0  | 2026-03-03 | 초판 작성      |

---

## 참고: AST 매핑 (참조 구현)

이 명세는 다음과 같이 AST로 구현됩니다:

```typescript
// 함수 리터럴
type FnLit = {
  kind: "fn_lit"
  params: Array<{ name: string, type?: TypeAnnotation }>
  returnType?: TypeAnnotation
  body: Expr
}

// 함수 타입
type FnType = {
  kind: "fn"
  params: TypeAnnotation[]
  returnType: TypeAnnotation
}

// 함수 호출
type Call = {
  kind: "call"
  callee: Expr
  args: Expr[]
}
```
