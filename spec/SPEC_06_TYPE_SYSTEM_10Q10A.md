# FreeLang v4 — Spec 06: 타입 시스템 10Q 10A

**참조**: SPEC_02 타입 목록 + 타입 규칙 (frozen)

---

## Q1. 타입 시스템의 분류는?

**A:** 정적(static), 강타입(strong), 명목적(nominal).

```
정적(static):
  모든 변수/식의 타입이 컴파일 타임에 결정된다.
  런타임에 타입 검사를 하지 않는다.
  VM은 타입 태그를 들고 다니지만, 검사용이 아니라 디스패치용이다.

강타입(strong):
  묵시적 변환이 없다. 전부.
  i32 + f64 → ❌ 컴파일 에러 (자동 변환 안 함)
  i32 && true → ❌ 컴파일 에러 (truthy 없음)

명목적(nominal):
  같은 구조여도 이름이 다르면 다른 타입.
  { x: i32, y: i32 }와 { x: i32, y: i32 }가 서로 다른 위치에서 선언되면?
  → v4에서 구조체는 이름이 없다(anonymous). 구조적(structural)으로 비교.
  → 수정: 구조체는 structural typing. 나머지는 nominal.
```

왜 강타입인가:
```
약타입 (JavaScript):
  "5" + 3 = "53"      // 문자열 연결
  "5" - 3 = 2          // 숫자 뺄셈
  → AI가 "+"와 "-"의 동작이 다른 이유를 추론해야 함

강타입 (FreeLang v4):
  "5" + 3 → ❌ 컴파일 에러: string + i32 불가
  → AI에게 "타입이 맞으면 동작하고, 안 맞으면 컴파일 에러" 단순 규칙
```

왜 정적 타입인가:
```
동적 타입 (Python):
  def add(a, b): return a + b
  add(1, 2) → 3
  add("a", "b") → "ab"
  add(1, "2") → TypeError (런타임)
  → 실행해봐야 에러를 안다

정적 타입 (FreeLang v4):
  fn add(a: i32, b: i32): i32 { return a + b }
  add(1, "2") → ❌ 컴파일 에러 (실행 전에 발견)
  → AI가 "컴파일 되면 타입 에러 없다" 보장
```

---

## Q2. 타입 추론은 어디까지 하는가?

**A:** 변수 초기화 식에서만. 함수 시그니처는 추론 안 함.

```
추론하는 곳:
  var x = 42           → x: i32 (리터럴에서 추론)
  var y = 3.14         → y: f64
  var z = "hello"      → z: string
  var w = true         → w: bool
  var a = [1, 2, 3]    → a: [i32]
  var b = add(1, 2)    → b: i32 (함수 반환 타입에서 추론)
  var c = Some(42)     → c: Option<i32>
  var d = Ok(42)       → d: Result<i32, ???> ← 문제 (Q3에서 해결)

추론 안 하는 곳:
  fn add(a: i32, b: i32): i32    // 파라미터 타입 필수
  fn process(items: [i32])       // 반환 타입: 생략 가능 (void로 추론)
```

왜 함수 시그니처는 추론 안 하는가:
```
Hindley-Milner 추론 (Haskell, ML):
  add a b = a + b   → 컴파일러가 (Num a) => a -> a -> a 추론
  → 강력하지만 에러 메시지가 난해
  → "왜 이 함수가 i32를 기대하지?" 추적이 어려움

FreeLang v4:
  fn add(a: i32, b: i32): i32   → 읽는 순간 타입이 보인다
  → AI가 함수를 호출할 때 시그니처만 보면 됨
  → 타입 추론 에러가 5개 함수를 거쳐 전파되는 상황 없음
```

규칙: **정의에서 명시, 사용에서 추론**.

---

## Q3. Result와 Option의 타입 추론은 어떻게 하는가?

**A:** 문맥에서 추론. 불가능하면 타입 명시 요구.

```freelang
// Case 1: 함수 반환 타입에서 추론
fn fetch(): Result<string, string> {
  return Ok("data")     // Ok의 T = string (함수 반환에서)
}

// Case 2: 변수 타입 명시에서 추론
var x: Result<i32, string> = Ok(42)    // Ok의 T = i32

// Case 3: 추론 불가
var y = Ok(42)     // ❌ 컴파일 에러: Err의 타입을 모름
                   // Result<i32, ???>의 ??? 결정 불가

// 해결:
var y: Result<i32, string> = Ok(42)    // ✅ 명시
```

추론 규칙:
```
Ok(v) 추론:
  1. 함수 반환 타입에서 Result<T, E> 확인 → T = typeof(v), E = 선언된 E
  2. 변수 타입 명시에서 Result<T, E> 확인 → 동일
  3. match arm에서 상대 Err의 타입 → E 추론
  4. 위 모두 불가 → 컴파일 에러

Err(e) 추론:
  동일 규칙. T를 모르면 에러.

Some(v) 추론:
  Option<T>에서 T = typeof(v). None은 T 모름.
  var x = None → ❌ 에러 (어떤 Option인지 모름)
  var x: Option<i32> = None → ✅
```

AI 관점:
```
AI는 대부분 함수 안에서 Ok/Err를 쓴다.
함수 반환 타입이 Result<T, E>로 명시되어 있으므로 추론이 자동.
변수에 직접 Ok/Err를 할당하는 경우만 타입 명시 필요.
→ 대부분의 코드에서 추론이 작동한다.
```

---

## Q4. 구조체 타입 비교는 어떻게 하는가?

**A:** 구조적 타이핑(structural typing). 필드 이름과 타입이 같으면 같은 타입.

```freelang
var a = { x: 1, y: 2 }
var b = { x: 3, y: 4 }
var c = { x: 1, name: "hello" }

a = b    // ✅ 같은 구조: { x: i32, y: i32 }
a = c    // ❌ 구조 다름: { x: i32, y: i32 } vs { x: i32, name: string }
```

필드 순서:
```
var a = { x: 1, y: 2 }
var b = { y: 2, x: 1 }

a = b    // ✅ 필드 순서 무관. 이름과 타입만 비교.
```

왜 structural인가:
```
nominal (Rust, TypeScript):
  struct Point { x: i32, y: i32 }
  struct Size { x: i32, y: i32 }
  → Point ≠ Size (이름이 다르므로)
  → 별도 struct 선언 필요

FreeLang v4에는 struct 선언이 없다.
구조체는 리터럴로만 생성.
→ nominal 비교가 불가능 (이름이 없으므로)
→ structural이 유일한 선택
```

함수 파라미터에서:
```freelang
fn get_name(person: { name: string, age: i32 }): string {
  return person.name
}

var p = { name: "Kim", age: 30 }
get_name(p)    // ✅ 구조가 일치

var q = { name: "Lee", age: 25, email: "lee@test.com" }
get_name(q)    // ❌ 구조 불일치. 필드 수가 다름.
               // → v4에서 서브타이핑 없음. 정확히 같아야 함.
```

왜 서브타이핑이 없는가:
```
TypeScript:
  { name, age, email }은 { name, age }의 서브타입
  → 추가 필드 무시

FreeLang v4:
  필드가 정확히 일치해야 함
  → AI가 "이 함수에 어떤 필드가 필요한지" 시그니처만 보면 됨
  → 숨겨진 필드 전달로 인한 혼란 없음
```

---

## Q5. 배열 타입의 제약은?

**A:** 동종(homogeneous). 원소 타입 하나. 중첩 가능.

```freelang
var a: [i32] = [1, 2, 3]           // ✅
var b: [string] = ["a", "b"]       // ✅
var c = [1, "hello"]               // ❌ 혼합 타입 불가
var d: [[i32]] = [[1, 2], [3, 4]]  // ✅ 중첩 배열
var e: [{ x: i32 }] = [{ x: 1 }]  // ✅ 구조체 배열
```

빈 배열:
```freelang
var a = []              // ❌ 원소 타입 모름
var a: [i32] = []       // ✅ 타입 명시
```

배열 연산 타입 규칙:
```
arr.length()      → i32
arr.push(item)    → [T] (새 배열 반환, 원본 불변? 아래 참고)
arr.pop()         → Option<T>
arr[i]            → T (인덱스 범위 검사, panic 가능)
arr.slice(s, e)   → [T]
```

배열 가변성 질문:
```
var arr = [1, 2, 3]
arr.push(4)       // arr이 [1, 2, 3, 4]로 변하는가?

v4 결정: 배열은 가변(mutable)이다.
  var arr = [1, 2, 3]   // var이므로 가변
  arr.push(4)            // arr = [1, 2, 3, 4] (in-place 변경)

  let arr = [1, 2, 3]   // let이므로 불변
  arr.push(4)            // ❌ 컴파일 에러: 불변 변수 변경

이유:
  - 문자열은 immutable (UTF-8 안전성)
  - 배열은 mutable (AI가 데이터를 누적하는 패턴이 빈번)
  - 매번 새 배열 반환 → 성능 문제 + AI 혼란 ("원본은 바뀌었나?")
```

---

## Q6. 타입 변환 함수는 정확히 어떻게 동작하는가?

**A:** 내장 변환 함수 6개. 실패 가능한 변환은 Result 반환.

```
안전한 변환 (항상 성공):
  i64(x: i32) → i64       // 확장. 값 손실 없음
  f64(x: i32) → f64       // 확장
  f64(x: i64) → f64       // 확장 (정밀도 손실 가능하지만 panic 아님)
  str(x: i32) → string    // "42"
  str(x: i64) → string
  str(x: f64) → string    // "3.14"
  str(x: bool) → string   // "true" / "false"

위험한 변환 (실패 가능):
  i32(x: i64) → Result<i32, string>    // 범위 초과 시 Err
  i32(x: f64) → Result<i32, string>    // 소수점 버림 + 범위 검사
  i32(x: string) → Result<i32, string> // 파싱 실패 시 Err
  i64(x: string) → Result<i64, string>
  f64(x: string) → Result<f64, string>
```

왜 축소 변환이 Result인가:
```
C:
  int x = (int)3.14;    // 3 (조용히 잘림)
  int y = (int)1e20;    // undefined behavior

FreeLang v4:
  var x = i32(3.14)?    // Ok(3) — 소수점 버림
  var y = i32(1e20)?    // Err("value out of i32 range")

→ AI가 변환 실패를 반드시 처리
→ 조용한 데이터 손실 불가
```

타입 변환과 리터럴의 차이:
```
var x: i64 = 42    // 리터럴 42를 i64로 해석 (변환 아님)
var y = i64(42)    // 리터럴 42는 i32, i64()로 변환 (동일 결과)

var a: i32 = 42
var b: i64 = a     // ❌ 묵시적 변환 금지
var c = i64(a)     // ✅ 명시적 변환
```

---

## Q7. channel 타입은 어떻게 검사하는가?

**A:** channel\<T\>의 T가 send/recv 시 일치해야 한다.

```freelang
var ch: channel<i32> = channel()

// Actor 1
spawn {
  ch.send(42)         // ✅ i32 전송
  ch.send("hello")    // ❌ 컴파일 에러: string ≠ i32
}

// Actor 2
spawn {
  var val = ch.recv()  // val: Result<i32, string>
  // recv는 항상 Result 반환 (상대 Actor panic 가능성)
}
```

channel.recv()가 Result인 이유 (Spec 03B 연결):
```
recv의 반환 타입: Result<T, string>

  성공 → Ok(value)
  상대 Actor 종료 → Err("actor terminated")

→ AI가 채널 수신 시 항상 상대 Actor 종료 가능성을 고려해야 함
→ match ch.recv() { Ok(v) => ..., Err(e) => ... }
```

channel.send()의 타입:
```
send의 반환 타입: void

  성공 → 정상 진행
  상대 Actor dead → panic (Spec 03B)

→ send는 Result가 아님. 닫힌 채널에 보내는 것은 논리 오류.
```

channel에 보낼 수 있는 타입:
```
✅ 보낼 수 있는 것:
  Copy 타입: i32, i64, f64, bool (값 복사)
  string: 불변이므로 공유 안전

✅ Move로 보내는 것:
  배열: channel.send(arr) → arr은 이후 use after move
  구조체: 동일

❌ 보낼 수 없는 것:
  channel<channel<T>> → 채널을 채널로 보내기 금지 (순환 참조 방지)
```

---

## Q8. TypeChecker가 잡아야 하는 에러 목록은?

**A:** 14종. 전부.

| # | 에러 | 예시 |
|---|------|------|
| 1 | 타입 불일치 (할당) | `var x: i32 = "hello"` |
| 2 | 타입 불일치 (연산) | `1 + "2"` |
| 3 | 타입 불일치 (비교) | `1 == "1"` |
| 4 | 타입 불일치 (논리) | `1 && true` |
| 5 | 타입 불일치 (함수 인자) | `add(1, "2")` |
| 6 | 타입 불일치 (함수 반환) | `fn f(): i32 { return "x" }` |
| 7 | 인자 개수 불일치 | `add(1)`, `add(1,2,3)` |
| 8 | 반환문 누락 | `fn f(): i32 { }` |
| 9 | 미선언 변수 | `println(x)` (x 선언 안 됨) |
| 10 | 미선언 함수 | `foo()` (foo 정의 안 됨) |
| 11 | match exhaustiveness 위반 | `match opt { Some(x) => x }` |
| 12 | ? 연산자 문맥 에러 | `fn f(): i32 { val?  }` (Result 미반환 함수에서 ? 사용) |
| 13 | use after move | `var b = a; println(a)` (a가 move 타입) |
| 14 | 불변 변수 재할당 | `let x = 1; x = 2` |

잡지 않는 것 (런타임 panic):
```
배열 인덱스 초과   → 런타임
0 나누기           → 런타임
정수 오버플로우     → 런타임
스택 오버플로우     → 런타임
```

경계: **컴파일 타임에 정적으로 판별 가능한 것만** TypeChecker가 잡는다. 동적 값에 의존하는 것은 런타임.

---

## Q9. void 타입의 규칙은?

**A:** void는 "값이 없음"을 나타내는 타입. 변수에 담을 수 없다.

```freelang
fn greet(name: string): void {
  println("hello " + name)
}

// void 반환 함수 호출
greet("Kim")        // ✅ 문으로 사용

// void를 값으로 사용하면
var x = greet("Kim")  // ❌ 컴파일 에러: void를 변수에 할당 불가

// void 반환 함수에서 값 반환하면
fn bad(): void {
  return 42          // ❌ 컴파일 에러: void에 값 반환
}

// 반환 타입 생략 = void
fn greet2(name: string) {   // : void 생략
  println("hello " + name)
}
```

void가 쓰일 수 있는 곳:
```
✅ 함수 반환 타입   fn f(): void
✅ 반환 타입 생략    fn f() (= void)

❌ 변수 타입       var x: void        → 에러
❌ 배열 원소       [void]             → 에러
❌ 구조체 필드     { v: void }        → 에러
❌ 채널 타입       channel<void>      → 에러
❌ Option/Result  Option<void>       → 에러
```

---

## Q10. 타입 시스템 전체를 요약하면?

**A:** 결정 테이블.

### 타입 목록 (11종, frozen)

| 카테고리 | 타입 | Copy/Move |
|---------|------|-----------|
| 원시 | i32, i64, f64, bool | Copy |
| 원시 | string | Copy (불변이므로) |
| 원시 | void | 해당 없음 |
| 복합 | [T] (배열) | Move |
| 복합 | { fields } (구조체) | Move |
| 특수 | Option\<T\> | T에 따름 |
| 특수 | Result\<T, E\> | T, E에 따름 |
| 특수 | channel\<T\> | Move |

### 타입 검사 요약

| 규칙 | 내용 |
|------|------|
| 묵시적 변환 | 없음. 전부 |
| truthy/falsy | 없음. bool만 조건에 사용 |
| null | 없음. Option으로 대체 |
| 추론 범위 | 변수 초기화만. 함수 시그니처 불가 |
| 구조체 비교 | structural (필드 이름 + 타입 일치) |
| 서브타이핑 | 없음. 정확히 일치 |
| 배열 가변성 | var = mutable, let = immutable |
| void | 함수 반환에만 사용. 값으로 사용 불가 |
| 변환 | 안전(i32→i64): 직접, 위험(i64→i32): Result |
| channel recv | Result\<T, string\> (Actor panic 대비) |
| TypeChecker | 14종 에러 잡음 |
| 런타임 | 인덱스/나누기/오버플로우 = panic |

### AI를 위한 타입 규칙 한 문장

```
"타입이 맞으면 컴파일된다. 컴파일되면 타입 에러가 없다."
```

---

# 요약

| 결정 | 내용 |
|------|------|
| 분류 | 정적, 강타입, 구조체만 structural |
| 추론 | 변수 초기화만. 함수 시그니처 필수 |
| 변환 | 묵시적 없음. 축소 변환은 Result |
| Option/Result | 하드코딩. 사용자 제네릭 없음 |
| 구조체 | structural typing, 서브타이핑 없음 |
| 배열 | 동종, var 가변 / let 불변 |
| channel recv | Result<T, string> 반환 |
| void | 함수 반환에만. 값 불가 |
| TypeChecker | 14종 정적 에러 |
| string | Copy (불변이므로 공유 안전) |
