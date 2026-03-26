# FreeLang v4 — Spec 10: 모듈성 & 확장성 10Q 10A

**참조**: SPEC_01 페르소나, SPEC_02 Core Language, SPEC_08 스코프

---

## Q1. v4에 모듈 시스템이 있는가?

**A:** 없다. 1 파일 = 1 프로그램.

```
v4:
  program.fl → 컴파일 → 실행
  (단일 파일)

없는 것:
  import, require, use, include
  module, package, namespace
  pub, private, export
  파일 간 의존성
```

왜 없는가:
```
1. v4의 8개 Phase에 모듈 시스템이 없다
   Phase 1: Lexer
   Phase 2: Parser
   Phase 3: AST Validator
   Phase 4: TypeChecker
   Phase 5: IR Generator
   Phase 6: Bytecode Compiler
   Phase 7: VM
   Phase 8: Actor Runtime
   → 모듈 해석(Module Resolution) Phase가 없음

2. v4의 목표 프로그램 규모
   CLI 도구: 200-500줄
   API 서버: 500-1000줄
   데이터 파이프라인: 300-800줄
   → 단일 파일로 충분한 규모

3. 모듈 시스템 구현 비용
   파일 탐색, 순환 의존성 검사, 이름 충돌 해결, 가시성 규칙
   → 최소 2-3주 추가 개발
   → v4 범위를 벗어남
```

솔직한 평가:
```
1000줄 이상의 프로그램을 v4로 만들면 → 단일 파일이 관리 불가능해짐
이건 v4의 명시적 한계. "큰 프로그램은 v4로 만들지 마라."
v5에서 모듈 시스템 추가.
```

---

## Q2. 표준 라이브러리(stdlib)는 어디까지 제공하는가?

**A:** 내장 함수로 제공. import 없이 사용.

### 입출력 (I/O)

```freelang
println(value)                        // 표준 출력 + 줄바꿈
print(value)                          // 표준 출력 (줄바꿈 없음)
var content = read_file("path")?      // 파일 읽기 → Result<string, string>
write_file("path", content)?          // 파일 쓰기 → Result<void, string>
var line = read_line()?               // 표준 입력 한 줄 → Result<string, string>
```

### 타입 변환

```freelang
i64(x)          // i32 → i64
f64(x)          // i32/i64 → f64
i32(x)          // i64/f64/string → Result<i32, string>
str(x)          // 모든 타입 → string
```

### 배열 연산

```freelang
arr.length()            // → i32
arr.push(item)          // 끝에 추가 (in-place, var만)
arr.pop()               // 마지막 제거 → Option<T>
arr.slice(start, end)   // 부분 배열 → [T]
arr.clone()             // 깊은 복사
```

### 문자열 연산

```freelang
s.length()              // 문자 수 → i32
s.char_at(i)            // i번째 문자 → Option<string>
s.slice(start, end)     // 부분 문자열 → string
s.contains(sub)         // 포함 여부 → bool
s.split(delim)          // 분할 → [string]
s.trim()                // 양쪽 공백 제거 → string
s.to_upper()            // 대문자 → string
s.to_lower()            // 소문자 → string
```

### 수학

```freelang
abs(x)                  // 절대값
min(a, b)               // 최소
max(a, b)               // 최대
pow(base, exp)          // 거듭제곱 → f64
sqrt(x)                 // 제곱근 → f64
```

### 유틸리티

```freelang
range(start, end)       // → [i32]
channel()               // 새 채널 생성
panic(message)          // Actor 종료
typeof(x)               // 타입 이름 → string (디버깅용)
```

총 내장 함수: **약 30개**. 이 이상은 v5 stdlib.

---

## Q3. 사용자 정의 타입(struct, enum 등)은 어떻게 확장하는가?

**A:** 확장할 수 없다. 구조체는 리터럴로만 생성.

```freelang
// 구조체 "선언"은 없다
// 사용할 때 바로 리터럴로 생성:
var point = { x: 10, y: 20 }
var person = { name: "Kim", age: 30 }

// "타입 별칭"도 없다
// type Point = { x: i32, y: i32 }  ❌ 없음

// "메서드"도 없다
// point.distance(other)  ❌ 없음
// → 대신: distance(point, other) 함수로
```

왜 struct 선언이 없는가:
```
struct 선언이 있으면:
  struct Point { x: i32, y: i32 }
  → 타입 이름 등록, 생성자, 메서드 바인딩, 가시성...
  → 모듈 시스템 없이는 이름 충돌 관리 불가

v4: 구조체 = 값. 이름 없는 값.
  var p = { x: 1, y: 2 }
  → 타입은 { x: i32, y: i32 } (structural)
  → 선언 불필요, 이름 충돌 없음
```

한계:
```
같은 구조를 여러 번 쓸 때:
  var p1 = { x: 1, y: 2, z: 3 }
  var p2 = { x: 4, y: 5, z: 3 }
  var p3 = { x: 7, y: 8, z: 3 }
  → 매번 전체 구조를 반복 → 중복

v5 해결: type alias 또는 struct 선언
```

---

## Q4. 함수를 값으로 다룰 수 있는가? (일급 함수, 클로저)

**A:** v4에서 불가.

```freelang
// ❌ 함수를 변수에 할당
var f = add           // 컴파일 에러

// ❌ 함수를 인자로 전달
fn apply(f: fn(i32) -> i32, x: i32) { ... }  // 컴파일 에러

// ❌ 클로저
var adder = fn(x) { return x + 1 }  // 컴파일 에러

// ❌ 콜백
on_event(fn() { println("done") })  // 컴파일 에러
```

왜 없는가:
```
일급 함수가 있으면:
  - 함수 타입 정의 필요: (i32, i32) -> i32
  - 클로저: 외부 변수 캡처 → Move/Copy 규칙 적용
  - 고차 함수: map, filter, reduce
  → 타입 시스템, 메모리 모델 모두 복잡해짐

v4: 함수는 선언하고 호출만 한다.
  fn add(a: i32, b: i32): i32 { return a + b }
  var result = add(1, 2)
  → 끝.
```

map/filter가 필요하면?:
```freelang
// map 대신:
var result: [i32] = []
for item in items {
  result.push(item * 2)
}

// filter 대신:
var result: [i32] = []
for item in items {
  if item > 0 {
    result.push(item)
  }
}
```

장황하다. 하지만 AI에게는:
```
map(items, fn(x) { x * 2 })
vs
for item in items { result.push(item * 2) }

두 번째가 "각 줄이 정확히 무엇을 하는지" 명확.
AI가 고차 함수의 의미를 잘못 추론하는 버그 없음.
```

---

## Q5. 외부 라이브러리/패키지를 사용할 수 있는가?

**A:** v4에서 불가. FFI도 없다.

```
v4에서 사용 가능한 것:
  - 내장 함수 (~30개)
  - 사용자 정의 함수
  - 이상 끝.

v4에서 사용 불가능한 것:
  - npm 패키지
  - pip 패키지
  - C 라이브러리 (FFI 없음, Spec 03)
  - 네트워크 HTTP 클라이언트 (내장 안 됨)
  - 데이터베이스 드라이버 (내장 안 됨)
```

왜 이렇게 제한적인가:
```
패키지 시스템이 있으면:
  - 패키지 레지스트리
  - 의존성 해석
  - 버전 관리
  - 보안 검증
  → 언어 자체보다 생태계 구축에 더 많은 시간

v4: 언어 자체를 완성하는 데 집중
  패키지 = v5+
```

v4로 만들 수 있는 현실적인 프로그램:
```
✅ 파일 읽고 가공해서 쓰기 (ETL)
✅ 표준 입출력 기반 CLI 도구
✅ 계산/알고리즘 (피보나치, 정렬, 검색)
✅ Actor 패턴 동시성 데모
✅ 간단한 데이터 파이프라인

❌ HTTP 서버 (네트워크 없음)
❌ 데이터베이스 연결 (드라이버 없음)
❌ 웹 클라이언트 (HTTP 클라이언트 없음)
❌ JSON 파싱 (파서 내장 안 됨)
```

솔직한 평가:
```
"v4는 프로그래밍 언어의 MVP다."
"모든 것을 할 수 있는 언어가 아니라, 핵심이 제대로 동작하는 언어다."
"HTTP 서버를 만들 수 없지만, 타입 안전한 파일 처리를 만들 수 있다."
```

---

## Q6. v4에서 v5로의 확장 경로는?

**A:** v4의 각 제한이 v5에서 어떻게 풀리는지 맵.

| v4 제한 | v5 추가 | 우선순위 |
|---------|---------|---------|
| 모듈 없음 | `import`, 파일 분할, 가시성(pub) | 1 (필수) |
| 패키지 없음 | 패키지 매니저, 레지스트리 | 2 |
| FFI 없음 | C FFI (unsafe 블록 추가) | 3 |
| HTTP 없음 | stdlib HTTP 클라이언트/서버 | 4 |
| Borrow 없음 | &, &mut, Borrow Checker | 5 |
| 일급 함수 없음 | 클로저, 고차 함수 | 6 |
| struct 선언 없음 | type alias, struct 선언, 메서드 | 7 |
| 제네릭 없음 | 사용자 정의 제네릭 | 8 |
| trait 없음 | trait/interface | 9 |
| break 없음 | break, continue, while | 10 |

v4 → v5 호환성:
```
v4 코드는 v5에서 그대로 컴파일되어야 한다.

v5가 추가하는 것:
  - 새 키워드 (import, pub, trait, while, break ...)
  - 새 타입 (사용자 제네릭, trait)
  - 새 연산자 (&, &mut)

v4 코드는 이것들을 사용하지 않으므로 호환.
단, v5의 새 키워드가 v4에서 변수명으로 쓰였다면 → 충돌
→ 예약어 관리 필요
```

---

## Q7. v4의 테스트 프레임워크는?

**A:** 내장 테스트 없음. assert 함수만 제공.

```freelang
// 테스트용 assert
fn test_add() {
  assert(add(1, 2) == 3, "add should return 3")
  assert(add(0, 0) == 0, "add of zeros")
}

fn main() {
  test_add()
  println("all tests passed")
}
```

assert 동작:
```
assert(condition: bool, message: string)

condition이 true → 아무것도 안 함
condition이 false → panic(message)
```

왜 테스트 프레임워크가 없는가:
```
테스트 프레임워크:
  - #[test] 어트리뷰트
  - test runner
  - describe/it 블록
  - mock, stub
  → 이 모두가 언어 기능 (어트리뷰트, 리플렉션 등) 필요

v4: assert + 수동 호출로 충분
  AI가 "test_함수명()" 패턴으로 테스트 작성
  main에서 호출
```

---

## Q8. 디버깅 지원은?

**A:** println 디버깅 + typeof + 스택 트레이스.

```freelang
// 값 출력
println(x)                    // 42
println(str(x) + " items")   // "42 items"

// 타입 확인
println(typeof(x))            // "i32"
println(typeof(arr))          // "[i32]"
println(typeof(opt))          // "Option<string>"

// panic 시 스택 트레이스 (자동)
panic: index out of bounds
  at process (main.fl:12)
  at main (main.fl:5)
Actor 0 terminated
```

없는 것:
```
❌ 브레이크포인트
❌ 스텝 실행
❌ 변수 워치
❌ REPL
❌ 소스맵
```

v5에서:
```
✅ REPL (대화형 실행)
✅ 소스맵 (bytecode ↔ 소스 라인 매핑)
✅ 디버거 (스텝 실행, 변수 조회)
```

---

## Q9. 성능 프로파일링은?

**A:** v4에서 없음. VM 레벨 타이밍만 가능.

```
v4에서 할 수 있는 것:
  1. 전체 실행 시간 측정 (외부: time ./program)
  2. println으로 구간 타이밍 (수동)

v4에서 할 수 없는 것:
  ❌ 함수별 실행 시간
  ❌ 메모리 사용량 조회
  ❌ 핫스팟 분석
  ❌ GC 통계 (GC 없으므로 해당 없음)
```

---

## Q10. v4의 한계를 정리하면?

**A:** 의도적 한계와 그 이유.

### 의도적 한계 (설계 결정)

| 한계 | 이유 | 영향 |
|------|------|------|
| 단일 파일 | 모듈 시스템 미구현 | 1000줄 이상 관리 어려움 |
| 내장 함수 ~30개 | stdlib 최소화 | HTTP, JSON, DB 불가 |
| 일급 함수 없음 | 타입/메모리 복잡도 감소 | map/filter 수동 |
| struct 선언 없음 | 모듈 없이 이름 관리 불가 | 중복 리터럴 |
| 오버로딩 없음 | 이름 = 함수 1:1 | 장황한 이름 |
| break 없음 | 루프 탈출 버그 방지 | 빈 루프 성능 낭비 |
| while 없음 | 무한 루프 방지 | 유연성 저하 |
| 패키지 없음 | 생태계 미구축 | 모든 것을 직접 구현 |
| FFI 없음 | unsafe 제거 | C 라이브러리 사용 불가 |
| Borrow 없음 | 구현 복잡도 감소 | clone 남발 |

### v4가 증명해야 하는 것

```
v4의 존재 의의는 "이 언어의 핵심이 올바르게 동작하는가?"를 증명하는 것이다.

증명 대상:
  ✅ 타입 시스템이 안전한가? (묵시적 변환 없음, null 없음)
  ✅ Move semantics가 올바른가? (use-after-move 컴파일 에러)
  ✅ Actor가 격리되는가? (메모리 공유 없음)
  ✅ panic이 Actor만 죽이는가?
  ✅ for...in이 무한 루프를 방지하는가?
  ✅ Result + ?가 에러를 강제 처리하는가?

증명 안 해도 되는 것:
  ❌ 대규모 프로젝트에서 쓸 수 있는가? (v5)
  ❌ 생태계가 풍부한가? (v5+)
  ❌ Go/Rust 성능에 근접하는가? (v5+ AOT)
```

### 최종 한 문장

```
"v4는 프로그래밍 언어의 핵(core)이다.
 핵이 올바르면 v5에서 살(flesh)을 붙일 수 있다.
 핵이 틀리면 아무리 살을 붙여도 무너진다."
```

---

# 요약

| 결정 | 내용 |
|------|------|
| 모듈 시스템 | v4 없음. 1 파일 = 1 프로그램 |
| 표준 라이브러리 | 내장 함수 ~30개 (I/O, 변환, 배열, 문자열, 수학) |
| 사용자 타입 | struct 선언 없음. 리터럴로만 생성 |
| 일급 함수 | 없음. 선언+호출만 |
| 외부 패키지 | 없음. FFI 없음 |
| 테스트 | assert 함수만 |
| 디버깅 | println + typeof + 스택 트레이스 |
| v5 확장 경로 | 모듈 → 패키지 → FFI → HTTP → Borrow → 클로저 → 제네릭 |
| v4 → v5 호환 | v4 코드는 v5에서 그대로 컴파일 |
| v4의 목적 | 핵심(core)이 올바르게 동작하는지 증명 |
