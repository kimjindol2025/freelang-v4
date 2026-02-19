# FreeLang v4 — Spec 09: 제어 흐름 & 에러 처리 10Q 10A

**참조**: SPEC_02 BNF, SPEC_03B Panic Semantics, SPEC_05 구문론, SPEC_06 타입 시스템

---

## Q1. 제어 흐름 구조는 총 몇 가지인가?

**A:** 6가지. 이 이상 없다.

```
1. if / else       조건 분기
2. match           패턴 매칭
3. for...in        반복
4. return          함수 반환
5. ? 연산자        에러 전파
6. spawn           Actor 생성 (비동기 제어)
```

없는 것과 이유:

| 없는 것 | 대체 | 이유 |
|---------|------|------|
| while | for...in range() | 무한 루프 방지 |
| loop | for...in range() | 무한 루프 방지 |
| break | 조건문으로 감싸기 | goto 변형 제거 |
| continue | 조건문으로 감싸기 | goto 변형 제거 |
| try/catch | Result + ? | 예외 흐름 제거 |
| throw | panic (복구 불가) | 예외 흐름 제거 |
| goto | 없음 | 당연히 없음 |
| switch | match | match가 상위 호환 |
| async/await | spawn + channel | Actor 모델로 대체 |

---

## Q2. if/else의 정확한 실행 의미론은?

**A:** 조건은 반드시 bool. truthy/falsy 없음.

```freelang
// 조건 = bool만 허용
if x > 0 {           // ✅ x > 0 → bool
  println("positive")
} else if x == 0 {   // ✅ else if 체이닝
  println("zero")
} else {
  println("negative")
}

// truthy 없음
if 1 { ... }          // ❌ 컴파일 에러: i32는 bool이 아님
if "hello" { ... }    // ❌ 컴파일 에러: string은 bool이 아님
if arr.length() { }   // ❌ 컴파일 에러: i32는 bool이 아님
```

if 식(expression)의 규칙:
```freelang
// if가 값을 반환할 때
var sign = if x > 0 { "positive" } else { "negative" }

규칙:
  1. else 필수 (모든 경로에서 값 반환해야 하므로)
  2. then과 else의 반환 타입 동일
  3. 블록의 마지막 식이 반환값

// else 없으면 에러
var y = if x > 0 { 1 }   // ❌ 컴파일 에러: else 없음 → 타입 불완전
```

if 문(statement)의 규칙:
```freelang
// 문으로 사용할 때
if x > 0 {
  println("yes")
}
// else 생략 가능 (값 반환 안 하므로)
```

단축 평가(short-circuit):
```freelang
if x != 0 && 10 / x > 5 {
  // x가 0이면 10/x 평가 안 함 (&&는 왼쪽이 false면 멈춤)
}

if x == 0 || safe_default() {
  // x가 0이면 safe_default() 평가 안 함 (||는 왼쪽이 true면 멈춤)
}
```

---

## Q3. for...in의 정확한 실행 의미론은?

**A:** 컬렉션의 각 원소를 순서대로 방문. 원소는 Copy/Clone.

```freelang
// 기본: 배열 순회
for item in [10, 20, 30] {
  println(item)   // 10, 20, 30
}

// 범위 반복
for i in range(0, 5) {
  println(i)      // 0, 1, 2, 3, 4
}

// 구조체 배열 순회
var people = [{ name: "A", age: 1 }, { name: "B", age: 2 }]
for person in people {
  println(person.name)   // "A", "B"
}
```

반복 변수와 원본의 관계:
```
Copy 타입 배열: for item in [1, 2, 3]
  → item은 원소의 Copy. 원본 배열 영향 없음.

Move 타입 배열: for item in [{ x: 1 }, { x: 2 }]
  → item은 원소의 Clone. 원본 배열 유지.
  → 왜? 루프가 여러 번 돌아야 하므로 원소를 move하면 안 됨.

실질적으로: for...in은 항상 원본 배열을 보존한다.
  → AI가 "루프 돌리면 원본이 사라지나?" 걱정 안 해도 됨.
```

range 함수:
```
range(start, end) → [start, start+1, ..., end-1]
range(0, 5) → [0, 1, 2, 3, 4]
range(0, 0) → [] (빈 배열, 0회 반복)
range(5, 3) → [] (start >= end이면 빈 배열)
```

break 없이 조기 종료가 필요하면?
```freelang
// break가 있었다면:
for item in items {
  if item < 0 { break }
  process(item)
}

// FreeLang v4에서:
var found = false
for item in items {
  if !found && item >= 0 {
    process(item)
  }
  if item < 0 {
    found = true
  }
}
```

솔직한 평가: 이건 확실히 불편하다. break가 없으면 "나머지 반복은 빈 루프"가 된다. 성능 낭비. 하지만 "AI가 루프 탈출 지점을 잘못 설정하는 버그"를 원천 차단하는 대가다. v4의 의도적 트레이드오프.

---

## Q4. match의 정확한 실행 의미론은?

**A:** 위에서 아래로 순서대로 매칭. 첫 번째 일치하는 arm 실행.

```freelang
match x {
  1 => println("one"),
  2 => println("two"),
  _ => println("other"),
}
```

실행 순서:
```
1. x를 평가
2. 첫 번째 패턴(1)과 비교 → 일치하면 실행, 종료
3. 두 번째 패턴(2)과 비교 → 일치하면 실행, 종료
4. _와 비교 → 항상 일치 → 실행, 종료
```

**fall-through 없음**. C의 switch처럼 다음 case로 넘어가지 않는다.

패턴 매칭 의미론:

```
리터럴 패턴: 1, "hello", true
  → 값이 정확히 일치하는지 검사

Ident 패턴: x
  → 항상 매칭. 값을 x에 바인딩.

Ok(p):
  → Result가 Ok이면 매칭. 내부 값을 p에 바인딩.

Err(p):
  → Result가 Err이면 매칭. 내부 값을 p에 바인딩.

Some(p):
  → Option이 Some이면 매칭. 내부 값을 p에 바인딩.

None:
  → Option이 None이면 매칭.

_:
  → 항상 매칭. 값 바인딩 안 함.
```

중첩 패턴:
```freelang
match result {
  Ok(Some(v)) => println(v),    // Result가 Ok이고 내부가 Some
  Ok(None) => println("none"),  // Result가 Ok이고 내부가 None
  Err(e) => println(e),         // Result가 Err
}
```

exhaustiveness 위반 시:
```freelang
match opt {
  Some(x) => x,
  // None 누락 → ❌ 컴파일 에러
}
```

---

## Q5. ? 연산자의 정확한 실행 의미론은?

**A:** Result/Option을 검사하고, 에러면 현재 함수에서 즉시 반환.

```freelang
fn process(): Result<i32, string> {
  var data = read_file("test.txt")?   // read_file이 Err면 여기서 반환
  var parsed = parse(data)?            // parse가 Err면 여기서 반환
  return Ok(parsed + 1)
}
```

? on Result:
```
expr?

1. expr를 평가 → Result<T, E>
2. Ok(v)이면 → v를 반환 (계속 진행)
3. Err(e)이면 → 현재 함수에서 Err(e) 반환 (조기 종료)

전제 조건:
  현재 함수의 반환 타입이 Result<_, E>여야 함
  E 타입이 일치해야 함
  아니면 → ❌ 컴파일 에러
```

? on Option:
```
expr?

1. expr를 평가 → Option<T>
2. Some(v)이면 → v를 반환
3. None이면 → 현재 함수에서 None 반환

전제 조건:
  현재 함수의 반환 타입이 Option<_>여야 함
```

? 를 main에서 쓰면?
```freelang
fn main() {
  var data = read_file("test.txt")?   // ❌ 컴파일 에러
  // main의 반환 타입이 void이므로 ? 사용 불가
}

// 해결:
fn main() {
  match read_file("test.txt") {
    Ok(data) => println(data),
    Err(e) => println("error: " + e),
  }
}
```

? 의 바이트코드:
```
SPEC_03 Bytecode ISA에서:
  TRY 연산자 → 스택 최상단의 Result/Option 검사
  Ok/Some → 내부 값 스택에 push
  Err/None → RETURN 실행 (Err/None을 반환값으로)
```

---

## Q6. return의 실행 의미론은?

**A:** 현재 함수에서 즉시 반환. 블록 중첩과 무관하게 함수 탈출.

```freelang
fn find(items: [i32], target: i32): Option<i32> {
  for item in items {
    if item == target {
      return Some(item)    // 함수 전체에서 즉시 반환
    }
  }
  return None
}
```

return 규칙:
```
1. return <expr> → 함수의 반환 타입과 expr 타입 일치 필수
2. return (값 없음) → 함수 반환 타입이 void일 때만
3. 함수 끝에 도달 = 암묵적 return
   - void 함수: 자동 return
   - 비-void 함수: ❌ 컴파일 에러 (반환문 누락)
```

블록의 마지막 식 vs return:
```freelang
fn add(a: i32, b: i32): i32 {
  a + b       // ← 이게 반환값이 되나?
}

v4 결정: 아니다. 명시적 return 필수.

fn add(a: i32, b: i32): i32 {
  return a + b   // ✅ 명시적
}
```

왜 암묵적 반환을 금지하는가:
```
Rust:
  fn add(a: i32, b: i32) -> i32 { a + b }   // 마지막 식이 반환값

FreeLang v4:
  명시적 return만 허용.

이유:
  AI가 "이 함수가 값을 반환하는가?" 판단할 때
  return 키워드가 있으면 → 반환
  없으면 → void
  → 즉, return의 존재 유무만 보면 된다. 마지막 식이 뭔지 추론할 필요 없음.

예외: if/match 식에서는 마지막 식이 반환값.
  var x = if cond { 1 } else { 2 }
  → 이건 식이므로 블록 내 마지막 값이 식의 결과.
  → 함수 반환과는 다른 규칙. 식의 값 ≠ 함수의 반환.
```

---

## Q7. panic의 제어 흐름은?

**A:** 즉시 Actor 종료. 이후 코드 실행 안 함. catch 불가.

```freelang
fn risky(x: i32): i32 {
  if x == 0 {
    panic("x cannot be zero")   // ← 여기서 Actor 종료
  }
  return 100 / x                // x == 0이면 여기 도달 안 함
}
```

panic 제어 흐름 (Spec 03B 재확인):
```
1. panic 발생
2. 현재 함수 실행 중단
3. 호출 스택 해제 (Scope Drop 실행)
   - 각 프레임의 로컬 변수 해제
   - move되지 않은 값만 해제
4. 스택 트레이스 출력
5. Actor 종료 (main이면 프로그램 종료)
```

panic 시 Scope Drop이 보장되는가?
```
✅ 보장된다.

panic이 발생하면:
  현재 프레임 → 부모 프레임 → ... → Actor 루트 프레임
  각 프레임에서 로컬 변수를 해제

이유:
  메모리 누수 방지
  파일 핸들, 네트워크 연결 등은 v4에서 OS가 프로세스 종료 시 회수
  (v4에서 RAII/destructor 없음 — v5에서 추가)
```

panic vs return 비교:
```
return:
  - 현재 함수만 종료
  - 호출자가 반환값 받음
  - 정상 흐름

panic:
  - Actor 전체 종료
  - 호출자도 종료됨
  - 비정상 흐름, 복구 불가
```

---

## Q8. 동시성 제어 흐름(spawn + channel)은?

**A:** spawn은 새 Actor 생성. channel은 동기적 송수신.

```freelang
var ch: channel<i32> = channel()

// Actor 1: 생산자
spawn {
  for i in range(0, 5) {
    ch.send(i)           // 값 전송
  }
}

// Actor 0 (main): 소비자
for _ in range(0, 5) {
  match ch.recv() {
    Ok(val) => println(val),
    Err(e) => println("error: " + e),
  }
}
```

channel 동작의 제어 흐름:
```
ch.send(value):
  버퍼에 공간 있음 → 즉시 반환, 다음 명령 실행
  버퍼 꽉 참 → 현재 Actor 일시 정지 (waiting)
  수신 Actor dead → panic

ch.recv():
  버퍼에 값 있음 → Ok(value) 반환, 다음 명령 실행
  버퍼 비어있음 → 현재 Actor 일시 정지 (waiting)
  송신 Actor dead + 버퍼 비어있음 → Err("actor terminated")
```

channel 버퍼 크기:
```
v4 기본: 무제한 버퍼 (unbounded)

이유:
  유한 버퍼(bounded) → send도 blocking → 데드락 가능성 증가
  무제한 버퍼 → send는 항상 즉시 → 데드락 위험 감소
  단, 메모리 사용량 증가 → Actor 64MB 한도로 보호

v5에서: channel(capacity: 10) 같은 유한 버퍼 옵션 추가 검토
```

데드락 가능성:
```
v4에서 데드락이 발생하는 경우:

  Actor A: ch1.recv()  // ch1에서 대기
  Actor B: ch2.recv()  // ch2에서 대기
  // A가 ch2에 send하고, B가 ch1에 send해야 하는데 둘 다 recv에서 멈춤

v4에서 데드락 방지:
  - 감지: 없음 (v4 범위 밖)
  - 예방: AI에게 "한 Actor가 여러 채널을 동시에 recv하지 마라" 권고
  - 타임아웃: 없음 (v5 검토)

현실적으로: v4의 단순한 Actor 패턴에서 데드락은 드묾
```

---

## Q9. 에러 전파 체인은 어떻게 작동하는가?

**A:** ? 연산자가 연쇄적으로 Result/Option을 전파.

```freelang
fn read_config(): Result<string, string> {
  var path = find_config()?        // Option → None이면 반환?
  // 잠깐. find_config가 Option인데 이 함수는 Result를 반환.
  // → ❌ 컴파일 에러: Option의 ?는 Option 반환 함수에서만 사용 가능
}
```

? 호환성 규칙:
```
함수 반환 타입이 Result<T, E>:
  Result<_, E>에 ? → ✅ (Err(e) 전파)
  Option<_>에 ? → ❌ (타입 불호환)

함수 반환 타입이 Option<T>:
  Option<_>에 ? → ✅ (None 전파)
  Result<_, _>에 ? → ❌ (타입 불호환)

함수 반환 타입이 void/i32/...:
  ?에 ? → ❌ (전파할 곳 없음)
```

에러 전파 체인 예:
```freelang
fn step1(): Result<string, string> {
  return Ok("data")
}

fn step2(data: string): Result<i32, string> {
  return Ok(42)
}

fn step3(n: i32): Result<bool, string> {
  return Ok(n > 0)
}

fn pipeline(): Result<bool, string> {
  var a = step1()?       // Err면 즉시 Err 반환
  var b = step2(a)?      // Err면 즉시 Err 반환
  var c = step3(b)?      // Err면 즉시 Err 반환
  return Ok(c)
}

// pipeline() 호출 시:
// step1 성공 → step2 성공 → step3 성공 → Ok(true)
// step1 성공 → step2 실패 → Err("...") 즉시 반환
```

에러 타입 통일:
```
모든 step이 같은 E 타입 (string)을 써야 ? 체이닝 가능.

step1: Result<string, string>
step2: Result<i32, string>      // E = string
step3: Result<bool, string>     // E = string

만약 step2가 Result<i32, i32>이면?
  → step2()? 의 Err(i32)를 pipeline()의 Err(string)으로 전파 불가
  → ❌ 컴파일 에러

해결: 에러 타입을 통일하거나, match로 변환.
  match step2(a) {
    Ok(v) => v,
    Err(code) => return Err(str(code)),  // i32 → string 변환
  }
```

---

## Q10. 제어 흐름 전체를 요약하면?

**A:** 제어 흐름 맵.

```
프로그램 시작
  │
  ├─ fn main() 실행 (Actor 0)
  │
  ├─ 순차 실행 (기본)
  │   문1 → 문2 → 문3 → ...
  │
  ├─ 분기
  │   if cond { A } else { B }
  │   match expr { pattern => body }
  │
  ├─ 반복
  │   for item in collection { body }
  │   (break 없음, 끝까지 순회)
  │
  ├─ 함수 호출/반환
  │   call → 새 프레임 push → 실행 → return → 프레임 pop
  │
  ├─ 에러 전파
  │   expr? → Ok이면 계속, Err이면 현재 함수 return Err
  │
  ├─ 동시성
  │   spawn { ... } → 새 Actor 생성
  │   ch.send(v) → 값 전송 (blocking if full)
  │   ch.recv() → 값 수신 (blocking if empty) → Result
  │
  ├─ panic
  │   → Actor 종료 (main이면 프로그램 종료)
  │   → catch 불가
  │
  └─ 프로그램 종료
      main의 마지막 문 실행 후 → 자식 Actor 종료 → exit 0
      main panic → exit 1
```

### 결정 테이블

| 제어 흐름 | 동작 | 비고 |
|-----------|------|------|
| if/else | bool 조건만, truthy 없음 | else 없으면 문만 가능 |
| if 식 | else 필수, 타입 일치 | 마지막 식이 값 |
| match | 위→아래 순서 매칭 | exhaustiveness 강제 |
| for...in | 컬렉션 전체 순회 | break/continue 없음 |
| return | 명시적 필수 | 암묵적 반환 없음 |
| ? | Result/Option 전파 | 반환 타입 호환 필수 |
| panic | Actor 종료, 복구 불가 | Scope Drop 보장 |
| spawn | 새 Actor 생성 | Copy 캡처만 |
| channel | 무제한 버퍼, 동기 수신 | recv = Result |
| && \|\| | 단축 평가 | 왼쪽이 결정하면 오른쪽 안 평가 |

---

# 요약

| 결정 | 내용 |
|------|------|
| 제어 구조 | 6가지 (if, match, for, return, ?, spawn) |
| 조건 | bool만. truthy/falsy 없음 |
| 반복 | for...in만. break/continue/while 없음 |
| 함수 반환 | 명시적 return 필수. 암묵적 반환 없음 |
| 에러 처리 | Result + ?. try/catch 없음 |
| ? 호환성 | Result 함수에서 Result만, Option 함수에서 Option만 |
| panic | Actor 종료. Scope Drop 보장. catch 불가 |
| channel 버퍼 | 무제한 (v4). 유한 버퍼는 v5 |
| 데드락 감지 | 없음 (v4 범위 밖) |
| 단축 평가 | && 와 \|\| 지원 |
