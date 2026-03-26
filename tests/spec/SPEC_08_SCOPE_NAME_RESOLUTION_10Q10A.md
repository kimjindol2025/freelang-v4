# FreeLang v4 — Spec 08: 스코프 & 이름 확인 10Q 10A

**참조**: SPEC_02 BNF, SPEC_06 타입 시스템, SPEC_07 메모리 모델

---

## Q1. 스코프(Scope)란 무엇이고, 몇 종류인가?

**A:** 이름이 유효한 범위. 3종류.

```
1. 전역 스코프 (Global Scope)
   - 프로그램 최상위
   - 함수 선언(fn)이 여기 속한다
   - 전역 변수: v4에서 없음 (함수 밖에 var 불가)

2. 함수 스코프 (Function Scope)
   - 함수 본문
   - 파라미터 + 로컬 변수

3. 블록 스코프 (Block Scope)
   - { } 로 감싸진 영역
   - if, for, spawn 등의 본문
   - 중첩 가능
```

```freelang
// 전역 스코프
fn outer(x: i32): i32 {          // 함수 스코프 시작
  var a = 10                      // 함수 스코프의 로컬

  if x > 0 {                     // 블록 스코프 시작
    var b = 20                    // 블록 스코프의 로컬
    // a 접근 가능 (부모 스코프)
    // b 접근 가능 (현재 스코프)
  }                               // 블록 스코프 끝, b 해제

  // b 접근 불가 (스코프 밖)
  return a
}                                 // 함수 스코프 끝, a 해제
```

왜 전역 변수가 없는가:
```
전역 변수 문제:
  - 어디서든 수정 가능 → 추적 어려움
  - Actor 간 공유 시 데이터 레이스
  - AI가 "이 변수 어디서 바뀌었지?" 추적 불가

FreeLang v4:
  - 전역에 존재하는 것: 함수 선언만
  - 데이터는 항상 함수 파라미터로 전달
  - 모든 상태가 로컬 → 추적 명확
```

---

## Q2. 이름 확인(Name Resolution)은 어떤 순서로 하는가?

**A:** 안에서 바깥으로 (inner → outer). 가장 가까운 스코프 우선.

```freelang
fn example() {
  var x = 10          // (1) 함수 스코프

  if true {
    var x = 20        // (2) 블록 스코프 — 섀도잉

    println(x)        // → 20 (가장 가까운 x = (2))
  }

  println(x)          // → 10 ((2)는 스코프 종료, (1)이 유효)
}
```

이름 확인 알고리즘:
```
lookup(name, currentScope):
  1. currentScope에서 name 검색
     → 있으면 반환
  2. currentScope.parent에서 name 검색
     → 있으면 반환
  3. parent.parent에서 검색
     → ...반복...
  4. 전역 스코프까지 도달
     → 있으면 반환 (함수 이름)
  5. 없으면 → 컴파일 에러: "undefined variable: name"
```

함수 이름 확인:
```freelang
fn foo(): i32 { return 42 }

fn bar(): i32 {
  return foo()      // 전역 스코프에서 foo 찾음 → ✅
}

fn baz(): i32 {
  return qux()      // 전역 스코프에도 qux 없음 → ❌ 컴파일 에러
}
```

---

## Q3. 변수 섀도잉(Shadowing)은 허용하는가?

**A:** 허용한다. 같은 이름으로 새 변수를 선언하면 이전 변수를 가린다.

```freelang
var x = 42          // x: i32

var x = "hello"     // x: string (이전 x를 섀도잉)
                     // 이전 x(i32)는 접근 불가, 즉시 해제

println(x)          // "hello"
```

블록 섀도잉:
```freelang
var x = 10

if true {
  var x = 20        // 내부 x가 외부 x를 가림
  println(x)        // 20
}

println(x)          // 10 (외부 x 복원)
```

왜 허용하는가:
```
금지하면:
  var result = get_raw_data()
  var result_cleaned = clean(result)      // 이름 계속 바꿔야 함
  var result_cleaned_validated = validate(result_cleaned)

허용하면:
  var result = get_raw_data()
  var result = clean(result)              // 덮어쓰기 (이전 값 해제)
  var result = validate(result)

AI가 파이프라인 형태의 코드를 작성할 때 자연스럽다.
이전 값은 더 이상 필요 없으므로 같은 이름으로 덮는 게 의도를 명확히 한다.
```

섀도잉과 재할당의 차이:
```freelang
// 재할당 (같은 변수, 같은 타입)
var x = 42
x = 100             // ✅ var이므로 재할당 가능. 타입 동일해야 함.

// 섀도잉 (새 변수 선언, 타입 변경 가능)
var x = 42
var x = "hello"     // ✅ 새 선언. 타입 바뀜. 이전 x 해제.

// let은 재할당 불가, 섀도잉은 가능
let x = 42
x = 100             // ❌ 컴파일 에러: let 재할당 불가
let x = "hello"     // ✅ 새 선언 (섀도잉)
```

---

## Q4. 함수 선언 순서에 제약이 있는가?

**A:** 없다. 전방 참조(forward reference) 허용.

```freelang
fn main() {
  var result = add(1, 2)   // add는 아래에 정의됨 → ✅
  println(result)
}

fn add(a: i32, b: i32): i32 {
  return a + b
}
```

왜 전방 참조를 허용하는가:
```
금지하면:
  - 함수를 사용 전에 반드시 위에 선언해야 함
  - 상호 재귀(mutual recursion)가 불가능:
    fn is_even(n) { if n == 0 { true } else { is_odd(n - 1) } }
    fn is_odd(n) { if n == 0 { false } else { is_even(n - 1) } }
    → is_even이 아직 없는 is_odd를 호출

허용하면:
  - 함수 선언 순서 자유
  - AI가 자연스러운 순서(main 먼저, 헬퍼 나중)로 작성 가능
```

구현:
```
Name Resolution은 2-pass:

Pass 1: 모든 fn 선언을 수집 → 전역 스코프에 등록
  fn main() → 등록
  fn add() → 등록

Pass 2: 함수 본문 내에서 이름 확인
  main() 본문의 add(1, 2) → 전역에서 add 찾음 → ✅
```

변수는 전방 참조 불가:
```freelang
fn main() {
  println(x)      // ❌ 컴파일 에러: x 아직 선언 안 됨
  var x = 42
}
```

규칙: **함수는 전방 참조 가능, 변수는 불가**.

---

## Q5. for 루프의 반복 변수 스코프는?

**A:** for 블록 내부에서만 유효.

```freelang
for i in range(0, 10) {
  println(i)        // ✅ i는 블록 내부에서 유효
}

println(i)          // ❌ 컴파일 에러: i는 스코프 밖
```

for 반복 변수의 특성:
```
1. 암묵적 let (불변)
   for i in range(0, 10) {
     i = 5          // ❌ 컴파일 에러: 반복 변수 재할당 불가
   }

2. 타입은 컬렉션 원소 타입에서 추론
   for item in [1, 2, 3] {
     // item: i32 (배열이 [i32]이므로)
   }

3. Move 타입 배열 순회 시
   var arr = [{ x: 1 }, { x: 2 }]
   for item in arr {
     // item은 구조체의 참조? 복사?
     // → v4에서 for...in은 각 원소를 Copy/Clone하여 제공
     // → 원본 배열은 유지됨
   }
```

왜 반복 변수가 불변인가:
```
i = 5를 허용하면:
  for i in range(0, 10) {
    if i == 3 { i = 7 }    // 반복 인덱스 조작
    println(i)
  }
  → AI가 "i가 3일 때 7로 바뀌어서 4, 5, 6을 건너뛴다?"
  → 실제로는 다음 반복에서 i가 4로 다시 설정됨
  → 혼란

불변이면:
  반복 변수는 읽기만 가능
  → 반복 순서가 항상 예측 가능
```

---

## Q6. match arm에서 바인딩된 변수의 스코프는?

**A:** 해당 arm의 body 안에서만 유효.

```freelang
match result {
  Ok(value) => {
    println(value)     // ✅ value는 이 arm에서 유효
  },
  Err(err) => {
    println(err)       // ✅ err는 이 arm에서 유효
    println(value)     // ❌ 컴파일 에러: value는 이 arm 밖
  },
}

println(value)         // ❌ 컴파일 에러: match 밖
println(err)           // ❌ 컴파일 에러: match 밖
```

패턴 바인딩 규칙:
```
Ok(v)     → v를 현재 arm에 바인딩 (타입: T)
Err(e)    → e를 현재 arm에 바인딩 (타입: E)
Some(v)   → v를 현재 arm에 바인딩 (타입: T)
None      → 바인딩 없음
_         → 바인딩 없음
42        → 바인딩 없음 (리터럴 매칭)
x         → x를 현재 arm에 바인딩 (모든 값)
```

중첩 패턴:
```freelang
match nested_result {
  Ok(Some(v)) => {
    println(v)         // ✅ v는 내부 값
  },
  Ok(None) => { ... },
  Err(e) => { ... },
}
```

---

## Q7. spawn 블록에서의 이름 확인은?

**A:** 캡처 규칙 적용. Copy는 값 복사, Move는 금지.

```freelang
var x = 42              // Copy
var arr = [1, 2, 3]     // Move
var name = "hello"      // Copy (string은 Copy)

fn helper(): i32 { return 1 }

spawn {
  println(x)            // ✅ Copy → 값 42 복사됨
  println(name)         // ✅ Copy → "hello" 참조 공유
  println(arr)          // ❌ 컴파일 에러: Move 타입 캡처 불가
  var y = helper()      // ✅ 전역 함수는 어디서든 호출 가능
}
```

spawn의 스코프 모델:
```
spawn 블록은 "새 함수"처럼 취급한다.

1. 새 스코프 생성 (부모 = 없음, 독립)
2. 외부 Copy 변수 → 새 스코프에 복사본 등록
3. 외부 Move 변수 → 금지 (컴파일 에러)
4. 전역 함수 → 접근 가능

spawn 블록 내에서:
  - 자체 로컬 변수 선언 가능
  - 블록 스코프 중첩 가능
  - 부모 함수의 변수는 복사본만 보임
```

왜 spawn이 독립 스코프인가:
```
spawn은 Actor를 만든다.
Actor는 별도 메모리 공간에서 실행된다 (Spec 07).
부모 함수의 스택에 접근할 수 없다.

→ 부모 변수를 "참조"로 캡처하면 다른 Actor의 메모리 접근 = 격리 위반
→ Copy로 복사하면 독립된 값 → 안전
→ Move는 채널로 명시적 전달
```

---

## Q8. 같은 스코프에서 같은 이름의 함수를 선언하면?

**A:** 함수 오버로딩 없음. 중복 선언 = 컴파일 에러.

```freelang
fn add(a: i32, b: i32): i32 { return a + b }
fn add(a: f64, b: f64): f64 { return a + b }   // ❌ 컴파일 에러: 중복

fn add(a: i32): i32 { return a + 1 }           // ❌ 컴파일 에러: 중복
```

왜 오버로딩이 없는가:
```
오버로딩이 있으면:
  add(1, 2)    → i32 버전? i64 버전?
  add(x, y)    → x, y의 타입에 따라 다른 함수 호출
  → AI가 "어떤 add가 호출되는지" 추론해야 함

오버로딩이 없으면:
  하나의 이름 = 하나의 함수
  add(1, 2) → 항상 같은 add
  → AI가 이름만 보면 함수를 특정 가능
```

대신 어떻게 하는가:
```freelang
fn add_i32(a: i32, b: i32): i32 { return a + b }
fn add_f64(a: f64, b: f64): f64 { return a + b }

// 이름으로 구분. 명시적.
```

---

## Q9. 재귀 함수에서의 이름 확인은?

**A:** 함수 자신의 이름은 함수 본문에서 사용 가능.

```freelang
fn factorial(n: i32): i32 {
  if n <= 1 {
    return 1
  }
  return n * factorial(n - 1)    // ✅ 자기 자신 호출
}
```

왜 가능한가:
```
Pass 1에서 모든 함수를 전역에 등록한다.
함수 본문(Pass 2)에서 이름을 찾을 때 전역에서 자기 자신을 찾는다.
→ 자연스럽게 재귀 가능
```

상호 재귀:
```freelang
fn is_even(n: i32): bool {
  if n == 0 { return true }
  return is_odd(n - 1)          // ✅ is_odd는 전역에 등록됨
}

fn is_odd(n: i32): bool {
  if n == 0 { return false }
  return is_even(n - 1)         // ✅ is_even은 전역에 등록됨
}
```

재귀 깊이 제한: 1,000 프레임 (Spec 03B).

---

## Q10. 이름 확인 에러 목록은?

**A:** 6종.

| # | 에러 | 예시 |
|---|------|------|
| 1 | 미선언 변수 | `println(x)` — x 선언 없음 |
| 2 | 미선언 함수 | `foo()` — foo 정의 없음 |
| 3 | 함수 중복 선언 | `fn add() {} fn add() {}` |
| 4 | 변수 사용 전 선언 | `println(x); var x = 1` |
| 5 | 스코프 밖 접근 | `if true { var x = 1 } println(x)` |
| 6 | Move 타입 spawn 캡처 | `spawn { println(arr) }` — arr이 Move |

TypeChecker와의 경계:
```
이름 확인(Name Resolution):
  "이 이름이 존재하는가? 어떤 선언을 가리키는가?"
  → 에러 1-6

타입 검사(TypeChecker):
  "이 이름의 타입이 올바르게 사용되었는가?"
  → 에러 7-14 (SPEC_06)

실행 순서:
  파싱 → 이름 확인 → 타입 검사 → 코드 생성
  (실제로는 이름 확인과 타입 검사가 같은 패스에서 동시에 수행될 수 있음)
```

---

# 요약

| 결정 | 내용 |
|------|------|
| 스코프 종류 | 3종: 전역, 함수, 블록 |
| 전역 변수 | 없음. 함수 선언만 전역 |
| 이름 확인 | 안에서 바깥으로 (inner → outer) |
| 섀도잉 | 허용. 타입 변경 가능 |
| 함수 전방 참조 | 허용 (2-pass) |
| 변수 전방 참조 | 불가 |
| for 반복 변수 | 블록 내부만 유효, 불변 (let) |
| match 바인딩 | arm body 내부만 유효 |
| spawn | 독립 스코프, Copy만 캡처 |
| 함수 오버로딩 | 없음. 중복 = 에러 |
| 재귀 | 가능 (전역 등록) |
| 이름 에러 | 6종 |
