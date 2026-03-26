# FreeLang v4 — Spec 07: 메모리 관리 10Q 10A

**참조**: SPEC_02 메모리 모델 (frozen), SPEC_03B Panic Semantics, SPEC_06 타입 시스템

---

## Q1. FreeLang v4의 메모리 관리 모델은?

**A:** Scope Drop + Move. GC 없음. Borrow Checker 없음.

```
메모리 관리 방식 비교:

| 방식 | 언어 | 장점 | 단점 | v4? |
|------|------|------|------|-----|
| Manual (malloc/free) | C | 최대 제어 | 버그 원천 | ❌ |
| GC (Tracing) | Java, Go | 편리 | 일시 정지, 메모리 과다 | ❌ |
| GC (RefCount) | Python, Swift | 즉시 해제 | 순환 참조, 오버헤드 | ❌ |
| Ownership + Borrow | Rust | 안전+성능 | 학습 곡선 극심 | ❌ (v5) |
| **Scope Drop + Move** | **FreeLang v4** | **단순+안전** | **유연성 제한** | **✅** |
```

Scope Drop + Move란:
```
1. 변수가 스코프를 벗어나면 → 자동 해제
2. Move 타입은 할당/전달 시 → 소유권 이전, 원본 사용 불가
3. Copy 타입은 할당/전달 시 → 값 복사, 양쪽 다 사용 가능
4. Borrow(&) 없음 → "빌려주기" 불가, "주거나" "복사"만 가능
```

왜 GC가 아닌가:
```
GC 문제:
  - GC 일시 정지 → API 서버 응답 시간 불규칙
  - 메모리 2-3배 과다 사용 (GC가 수집할 때까지 유지)
  - AI가 "GC가 알아서 하겠지" → 메모리 누수 무관심

Scope Drop 장점:
  - 해제 시점이 명확 (스코프 끝 = 해제)
  - AI가 메모리 수명을 코드 구조로 예측 가능
  - 추가 메모리 오버헤드 없음
```

왜 Borrow Checker가 아닌가:
```
Rust Borrow Checker:
  fn first(v: &Vec<i32>) -> &i32 { &v[0] }
  → lifetime, &, &mut, 'a 개념 필요
  → AI가 borrow 규칙과 싸우면서 "fight the borrow checker" 현상
  → v4 구현 비용: 3개월+

v4 대신:
  - Borrow 없이 Move 또는 Clone으로 해결
  - 유연성은 떨어지지만 이해하기 쉬움
  - v5에서 Borrow Checker 추가
```

---

## Q2. Copy 타입과 Move 타입의 경계는?

**A:** 고정 크기 + 스택 할당 = Copy. 가변 크기 + 힙 할당 = Move. string은 예외(Copy).

```
Copy 타입 (값 복사):
  i32     4 byte   스택
  i64     8 byte   스택
  f64     8 byte   스택
  bool    1 byte   스택
  string  가변     힙 (하지만 Copy 취급)

Move 타입 (소유권 이전):
  [T]         가변   힙
  { fields }  가변   힙
  channel<T>  참조   VM 내부
  Option<T>   T에 따름
  Result<T,E> T,E에 따름
```

string이 Copy인 이유 (SPEC_06 결정):
```
string은 불변(immutable)이다.

var s1 = "hello"
var s2 = s1       // s1의 참조를 공유 (내부적으로)
println(s1)       // ✅ 사용 가능
println(s2)       // ✅ 사용 가능

불변이므로 s1도 s2도 "hello"를 변경할 수 없다.
→ 공유해도 안전 → Copy처럼 동작
→ AI가 "문자열 할당했는데 원본 못 쓴다?" 혼란 없음

내부 구현: 참조 카운팅 또는 인터닝 (사용자에게 안 보임)
```

Option/Result의 Copy/Move:
```
Option<i32>   → Copy (내부가 Copy)
Option<[i32]> → Move (내부가 Move)

Result<i32, string>     → Copy (둘 다 Copy)
Result<[i32], string>   → Move (하나라도 Move)

규칙: 내부 타입 중 하나라도 Move면 전체가 Move
```

---

## Q3. Scope Drop은 정확히 어떻게 동작하는가?

**A:** 스코프(블록) 종료 시 해당 스코프의 로컬 변수를 역순으로 해제.

```freelang
fn process() {
  var a = [1, 2, 3]      // a 생성 (힙 할당)
  var b = "hello"         // b 생성 (힙, 불변)
  var c = { x: 1, y: 2 } // c 생성 (힙 할당)

  if true {
    var d = [4, 5, 6]     // d 생성
    // d 사용
  }                        // ← d 해제 (if 블록 종료)

  // d 여기서 사용 불가 (스코프 밖)
  // a, b, c 사용 가능

}                          // ← c 해제, b 해제(참조 감소), a 해제
```

해제 순서: **역순 (LIFO)**
```
생성: a → b → c → d
해제: d → c → b → a

역순인 이유:
  나중에 생성된 변수가 먼저 생성된 변수를 참조할 수 있음.
  역순 해제하면 참조가 유효한 상태에서 해제.
  (v4에서 참조는 없지만, 원칙 유지)
```

VM에서의 구현:
```typescript
// 함수 반환 또는 블록 종료 시
releaseScope(locals: Value[]) {
  for (let i = locals.length - 1; i >= 0; i--) {
    const val = locals[i];
    if (val === null) continue;     // 이미 move됨
    if (val.tag === "str") {
      // string: 참조 카운트 감소 (0이면 해제)
    } else if (val.tag === "arr" || val.tag === "struct") {
      // 힙 메모리 해제
      this.heap.free(val);
    }
    // Copy 타입(i32, f64, bool): 스택에서 자동 제거, 별도 해제 불필요
  }
}
```

---

## Q4. Move의 정확한 동작은?

**A:** 소유권 이전. 원본은 null 마킹. 컴파일 타임에 use-after-move 검사.

```freelang
var a = [1, 2, 3]    // a가 소유
var b = a             // 소유권: a → b로 이전

// 컴파일러 내부 상태:
//   a: moved (사용 불가)
//   b: [1, 2, 3] (소유)

println(a)            // ❌ 컴파일 에러: use after move
println(b)            // ✅ [1, 2, 3]
```

Move가 발생하는 상황 (전부):
```
1. 변수 할당
   var b = a           // a → b move

2. 함수 인자 전달
   consume(a)          // a → 함수 파라미터로 move

3. 함수 반환
   return a            // a → 호출자에게 move

4. 배열 원소로 삽입
   arr.push(a)         // a → 배열 내부로 move

5. 구조체 필드로 할당
   var s = { data: a } // a → 구조체 필드로 move

6. 채널 전송
   ch.send(a)          // a → 채널 버퍼로 move
```

Move 검사는 컴파일 타임 ONLY (Spec 03B 확정):
```
TypeChecker:
  1. 각 변수의 "moved" 상태 추적
  2. 할당/전달/반환 시 moved 마킹
  3. 이후 사용 시도 → 컴파일 에러

VM:
  Move 검사 안 함.
  VM에 도달한 코드는 이미 TypeChecker를 통과했으므로
  use-after-move가 존재할 수 없다.
  (방어적으로 null 체크는 할 수 있지만, 에러로 잡지 않음)
```

---

## Q5. clone은 어떻게 동작하는가?

**A:** 깊은 복사(deep copy). Move 타입을 복제할 때 사용.

```freelang
var a = [1, 2, 3]
var b = a.clone()     // a의 깊은 복사 → b
println(a)            // ✅ a 여전히 사용 가능
println(b)            // ✅ b는 독립된 복사본

// 함수에 원본 유지하면서 전달
fn process(data: [i32]) { ... }
process(a.clone())    // 복사본 전달
println(a)            // ✅ a 살아있음
```

clone의 동작:
```
배열 clone:
  [1, 2, 3].clone() → 새 배열 [1, 2, 3] (별도 메모리)
  재귀적: [[1, 2], [3, 4]].clone() → 내부 배열도 복사

구조체 clone:
  { name: "Kim", scores: [90, 85] }.clone()
  → 새 구조체, name은 string이므로 참조 공유(불변), scores는 깊은 복사

Option/Result clone:
  Some([1, 2]).clone() → Some([1, 2]의 clone)
  Ok([1, 2]).clone() → Ok([1, 2]의 clone)
```

clone이 없는 타입:
```
channel<T>.clone()  → ❌ 컴파일 에러
  이유: 채널은 복제할 수 없다. 채널은 두 Actor 간 1:1 연결.
  채널을 복제하면 "누가 수신하는가?" 모호해짐.
```

clone의 비용:
```
[i32] 1,000개 → O(1,000) 복사
중첩 [[ i32 ]] 1,000 × 1,000 → O(1,000,000) 복사

AI가 알아야 할 것:
  clone은 비싸다. 루프 안에서 clone하면 성능 저하.
  가능하면 Move로 소유권을 넘기는 게 효율적.
```

---

## Q6. 조건문/루프 안에서 Move는 어떻게 검사하는가?

**A:** 모든 분기에서 Move 상태를 추적. 분기마다 다르면 에러.

```freelang
var a = [1, 2, 3]

if condition {
  var b = a         // a move
} else {
  println("skip")   // a 안 움직임
}

println(a)          // ❌ 컴파일 에러
```

왜 에러인가:
```
if branch: a가 moved
else branch: a가 alive

합류점에서 a의 상태:
  condition이 true면 moved, false면 alive
  → 컴파일 타임에 condition 값 모름
  → "moved일 수도 있고 아닐 수도 있다" = 안전하지 않음
  → 에러

규칙: if/else 한쪽이라도 move하면 합류점 이후 사용 불가
```

양쪽 다 move하면?
```freelang
var a = [1, 2, 3]

if condition {
  consume(a)        // a move
} else {
  other(a)          // a move
}

// 양쪽 다 move → 합류점에서 a는 확실히 moved
println(a)          // ❌ 컴파일 에러 (당연)
```

루프에서:
```freelang
var a = [1, 2, 3]

for i in range(0, 10) {
  consume(a)        // ❌ 컴파일 에러
}
```

왜 에러인가:
```
첫 번째 반복에서 a가 move됨.
두 번째 반복에서 a는 이미 moved → use after move.

루프는 "2번 이상 실행될 수 있다"로 가정.
→ 루프 안에서 외부 Move 변수를 move하면 무조건 에러.
```

---

## Q7. 함수 반환값의 소유권은?

**A:** 호출자에게 이전.

```freelang
fn create(): [i32] {
  var arr = [1, 2, 3]    // arr 생성
  return arr              // arr의 소유권 → 호출자에게
}                          // arr은 move되었으므로 여기서 해제 안 함

var result = create()      // result가 소유
// result 사용 후 스코프 종료 시 해제
```

반환하지 않은 로컬 변수:
```freelang
fn process(): i32 {
  var temp = [1, 2, 3]    // temp 생성
  var sum = 0
  for item in temp {
    sum = sum + item
  }
  return sum               // sum(i32) 반환, temp는 반환 안 됨
}                           // ← temp 여기서 해제
```

```
반환값: 호출자에게 소유권 이전 (move 아닌 전달)
비반환 로컬: 함수 종료 시 해제
moved 로컬: 이미 이전됨, 해제 안 함 (null)
```

---

## Q8. Actor 간 메모리 격리는 어떻게 보장하는가?

**A:** Actor는 메모리를 공유하지 않는다. 채널만 통신.

```
Actor 0 (main):
  힙 영역 A: [변수들...]

Actor 1:
  힙 영역 B: [변수들...]

공유되는 것: 없음
통신: channel (값 복사 또는 소유권 이전)
```

spawn 시 캡처 규칙:
```freelang
var x = 42              // Copy
var arr = [1, 2, 3]     // Move

spawn {
  println(x)            // ✅ x는 Copy → 값 복사됨
  // Actor 1의 로컬 x = 42 (독립된 복사본)

  println(arr)           // ❌ 컴파일 에러: Move 타입 캡처 불가
}
```

Move 타입을 Actor에 전달하려면:
```freelang
var ch: channel<[i32]> = channel()
var arr = [1, 2, 3]

spawn {
  var data = ch.recv()   // 채널에서 수신 (소유권 획득)
  // data는 이 Actor의 소유
}

ch.send(arr)             // arr → 채널 → Actor 1로 이전
// arr 이후 사용 불가 (moved)
```

왜 메모리를 공유하지 않는가:
```
공유 메모리 문제:
  - 데이터 레이스 (두 Actor가 동시에 같은 배열 수정)
  - 뮤텍스/락 필요 → 데드락 가능성
  - AI가 동시성 버그를 디버깅하기 극히 어려움

격리 장점:
  - Actor 내부는 단일 스레드 실행 → 동시성 버그 불가
  - 통신은 채널로만 → 소유권 명확
  - Actor panic해도 다른 Actor 메모리 영향 없음
```

---

## Q9. 메모리 누수가 발생할 수 있는가?

**A:** 이론적으로 불가. 실질적으로도 거의 불가.

```
누수 불가 이유:
  1. 모든 변수는 스코프 소유 → 스코프 끝에 해제
  2. Move로 이전된 변수는 새 소유자 스코프에서 해제
  3. GC가 아니므로 "나중에 수집" 없음
  4. 순환 참조 불가 (포인터 없음, 참조 없음)
```

순환 참조가 왜 불가능한가:
```
다른 언어:
  var a = { next: null }
  var b = { next: a }
  a.next = b         // 순환! a → b → a

FreeLang v4:
  1. 포인터 없음 → 직접 참조 불가
  2. 구조체는 값 타입 (내부에 구조체를 넣으면 복사)
  3. 재귀적 구조체 타입 정의 불가 (struct 선언이 없으므로)

  var a = { data: 1 }
  var b = { data: 2, ref: a }   // a의 값이 복사됨 (Move)
  // b.ref를 수정해도 a에 영향 없음 (독립 복사본)
  → 순환 참조 구조 자체를 만들 수 없음
```

유일한 "누수 유사" 상황:
```freelang
for i in range(0, 1000000) {
  var arr = [0; 10000]    // 매 반복 10000 원소 할당
  // 루프 끝에서 해제됨 → 누수 아님
  // 하지만 순간 메모리 사용량이 높을 수 있음
}

→ 이건 누수가 아니라 메모리 패턴 문제
→ Actor 64MB 한도로 보호 (Spec 03B)
```

---

## Q10. 메모리 모델 전체를 요약하면?

**A:** 규칙 테이블.

### 소유권 규칙

| 상황 | 동작 |
|------|------|
| 변수 선언 | 변수가 값의 소유자 |
| 스코프 종료 | 소유한 값 해제 (역순) |
| Copy 할당 `var b = a` | 값 복사. a, b 둘 다 유효 |
| Move 할당 `var b = a` | 소유권 이전. a 무효 |
| 함수 인자 (Copy) | 값 복사 |
| 함수 인자 (Move) | 소유권 이전. 호출 후 원본 무효 |
| 함수 반환 | 호출자에게 소유권 이전 |
| clone() | 깊은 복사. 원본 유지 |
| spawn 캡처 (Copy) | 값 복사 |
| spawn 캡처 (Move) | ❌ 금지. channel로 전달 |
| channel send (Move) | 소유권 → 채널 → 수신 Actor |

### Move 검사 규칙

| 상황 | 결과 |
|------|------|
| move 후 사용 | ❌ 컴파일 에러 |
| if 한쪽만 move → 합류 후 사용 | ❌ 컴파일 에러 |
| 루프 안에서 외부 변수 move | ❌ 컴파일 에러 |
| move 후 다시 할당 | ✅ 새 값으로 부활 |
| channel clone | ❌ 컴파일 에러 |

### 해제 책임

| 자원 | 해제 주체 | 시점 |
|------|----------|------|
| Copy 타입 | 스택 프레임 | 함수 반환 시 자동 |
| Move 타입 (로컬) | 스코프 | 블록 종료 시 |
| Move 타입 (moved) | 새 소유자 | 새 소유자 스코프 종료 시 |
| Actor 메모리 | VM 스케줄러 | Actor 종료(정상/panic) 시 |
| string | 참조 카운팅 | 마지막 참조 해제 시 |

### AI를 위한 메모리 규칙 한 문장

```
"변수는 스코프가 소유한다. 스코프가 끝나면 해제된다. Move하면 원본은 죽는다."
```

---

# 요약

| 결정 | 내용 |
|------|------|
| 모델 | Scope Drop + Move (GC 없음, Borrow 없음) |
| Copy | i32, i64, f64, bool, string |
| Move | [T], { fields }, channel\<T\> |
| 해제 | 스코프 종료 시 역순 해제 |
| clone | 깊은 복사. channel 불가 |
| 순환 참조 | 불가능 (포인터 없음, 재귀 구조체 불가) |
| Actor 격리 | 메모리 공유 없음. 채널만 통신 |
| 메모리 누수 | 이론적 불가 |
| 분기 Move | 한쪽만 move해도 합류 후 사용 불가 |
| 루프 Move | 외부 변수 move 금지 |
| 검사 | 컴파일 타임 ONLY |
