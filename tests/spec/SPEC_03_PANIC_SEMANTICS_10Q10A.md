# FreeLang v4 — Spec 03B: Panic Semantics 10Q 10A

**배경**: Spec 03(추상화 수준) 리뷰에서 panic 의미론이 미정의로 식별됨. 이 문서에서 확정.

---

## Q1. panic과 Result의 경계는 어디인가?

**A:** 예측 가능한 실패는 Result. 프로그래머 논리 오류는 panic.

```
Result<T, E> (복구 가능, 예측 가능):
  - 파일 읽기 실패       → Err("file not found")
  - 네트워크 타임아웃     → Err("timeout")
  - 파싱 실패            → Err("invalid format")
  - channel 상대 Actor 종료 → Err("actor terminated")

panic (복구 불가, 논리 오류):
  - 배열 인덱스 범위 초과  → panic: index out of bounds
  - 0으로 나누기          → panic: divide by zero
  - 정수 오버플로우        → panic: integer overflow
  - 스택 오버플로우        → panic: stack overflow
  - 메모리 부족           → panic: out of memory
  - use after move        → 컴파일 타임에 잡지만, 만약 VM에 도달하면 panic
```

판단 기준:

```
"이 상황이 발생하면, 호출자가 합리적으로 복구할 수 있는가?"

  YES → Result
    파일이 없으면 → 다른 경로 시도, 기본값 사용
    파싱 실패하면 → 에러 메시지 출력, 재시도

  NO → panic
    arr[5]인데 배열 길이가 3이면 → 코드 자체가 틀림
    10 / 0이면 → 논리 오류. "0이 아닌 값으로 다시 나누기"는 의미 없음
```

AI 관점에서 이 구분이 중요한 이유:
- panic이 발생하면 AI는 **코드를 수정**해야 한다 (버그)
- Result.Err가 발생하면 AI는 **처리 로직을 추가**해야 한다 (정상 흐름)
- 이 둘을 섞으면 AI가 버그와 정상 에러를 구분 못한다

---

## Q2. panic은 Actor를 죽이는가, VM을 죽이는가?

**A:** 해당 Actor만 죽인다. VM은 계속 실행.

```
Actor 격리 원칙:

  Actor A: panic("index out of bounds")
  → Actor A 상태: "dead"
  → Actor A의 스택, 로컬 변수 해제
  → Actor A가 소유한 채널의 송신 끝: 닫힘

  Actor B: (영향 없음, 계속 실행)
  Actor C: (영향 없음, 계속 실행)
  VM: (계속 스케줄링)
```

왜 Actor 격리인가:
```
AI Agent는 여러 작업을 동시에 spawn한다.

spawn { fetch_data() }     // Actor 1
spawn { process_queue() }  // Actor 2
spawn { health_check() }   // Actor 3

fetch_data()에서 인덱스 오류 발생 →
  ❌ 전체 VM 종료 → process_queue, health_check도 죽음
  ✅ Actor 1만 종료 → Actor 2, 3은 계속 실행
```

예외: VM 자체의 구조적 오류

```
VM panic (전체 종료):
  - bytecode가 손상됨 (invalid opcode)
  - VM 내부 스택 불일치 (sp가 음수)
  - 상수 테이블 인덱스 범위 초과

이건 FreeLang 코드의 버그가 아니라 VM 구현의 버그다.
이 경우만 전체 종료. 사용자 코드 panic과 구분한다.
```

---

## Q3. panic 시 스택 트레이스는 어떤 형식인가?

**A:** AI가 읽기 쉬운 최소 형식. 3줄 이내.

```
panic: index out of bounds (index: 5, length: 3)
  at get_item (data.fl:42)
  at process (main.fl:15)
Actor 1 terminated
```

형식 정의:
```
Line 1: "panic: " + 메시지 + (선택적 상세 정보)
Line 2~N: "  at " + 함수명 + " (" + 파일:줄 + ")"
마지막 줄: "Actor " + ID + " terminated"
```

스택 트레이스 깊이 제한: **최대 10 프레임**.

```
✅ 좋은 트레이스:
  panic: divide by zero
    at calc_average (stats.fl:8)
    at summarize (report.fl:22)
    at main (main.fl:5)
  Actor 0 terminated

❌ 나쁜 트레이스 (너무 긴):
  panic: divide by zero
    at calc_average (stats.fl:8)
    at helper1 (utils.fl:100)
    at helper2 (utils.fl:200)
    ... (20줄 더)
  → 최대 10 프레임으로 잘림
  → "  ... 15 more frames" 표시
```

왜 10 프레임 제한인가:
- AI가 30줄짜리 스택 트레이스를 파싱하는 건 비효율적
- 핵심은 "어디서 발생했는가" (상위 2-3 프레임)
- 나머지는 노이즈

포함하지 않는 정보:
```
❌ Actor 간 호출 관계 (보안/복잡도)
❌ 채널 상태 (관련 없음)
❌ 메모리 주소 (Spec 03: 주소 숨김)
❌ 바이트코드 오프셋 (사용자에게 무의미)
```

---

## Q4. 채널 상대 Actor가 panic하면 어떻게 되는가?

**A:** 채널에 ActorPanic 신호 삽입. 수신 측은 Result.Err로 받는다.

```
시나리오:

  var ch: channel<i32> = channel()

  // Actor 1 (생산자)
  spawn {
    ch.send(42)       // 정상 전송
    var x = arr[100]   // panic: index out of bounds
    ch.send(99)        // 실행 안 됨 (Actor 이미 dead)
  }

  // Actor 2 (소비자)
  spawn {
    var a = ch.recv()   // Ok(42) — 정상 수신
    var b = ch.recv()   // Err("actor terminated") — 상대 Actor dead
  }
```

채널 동작 규칙:

```
Actor가 panic으로 죽을 때:
  1. 해당 Actor가 소유한 모든 채널의 "송신 끝"을 닫는다
  2. 닫힌 채널에 ActorPanic 마커를 삽입한다
  3. 대기 중인 수신자를 깨운다

CHAN_RECV 동작:
  - 버퍼에 값이 있으면 → Ok(value)
  - 버퍼 비어있고 송신 끝 열려있으면 → 대기 (waiting)
  - 버퍼 비어있고 송신 끝 닫힘(panic) → Err("actor terminated")

CHAN_SEND 동작:
  - 수신 측 Actor가 살아있으면 → 정상 전송
  - 수신 측 Actor가 dead → panic("send on closed channel")
```

왜 recv는 Err이고 send는 panic인가:
```
recv:
  "상대가 죽었으니 더 이상 값이 안 온다" → 예측 가능 → Result.Err
  호출자가 합리적으로 처리 가능 (기본값 사용, 다른 Actor에 요청)

send:
  "죽은 Actor에게 값을 보내려 함" → 논리 오류
  이 코드는 상대 Actor가 살아있다고 가정하고 있음 → 코드가 틀림
```

---

## Q5. 0으로 나누기는 왜 panic인가?

**A:** 로직 오류이기 때문.

```freelang
fn average(items: [i32]): i32 {
  var sum = 0
  for item in items {
    sum = sum + item
  }
  return sum / items.length()   // items가 빈 배열이면?
}
```

```
average([])
→ sum = 0, length = 0
→ 0 / 0
→ panic: divide by zero
  at average (math.fl:5)
```

왜 Result가 아닌가:
```
var result = 10 / x   // x가 0일 수 있다면?

Result로 하면:
  var result = try_div(10, x)?   // 매번 ? 연산자 필요
  → 모든 나눗셈에 에러 처리 → 코드 오염

panic으로 하면:
  var result = 10 / x   // x가 0이면 panic
  → AI는 나누기 전에 x != 0을 확인해야 한다는 것을 학습
  → 방어 코드:
    if x != 0 { return sum / x } else { return 0 }
```

AI 관점:
- panic은 "이 코드에 버그가 있다"는 신호
- AI가 panic을 보면 **코드를 수정**한다 (나누기 전에 0 검사 추가)
- Result로 감싸면 AI가 "정상 에러구나"로 인식 → 진짜 수정을 안 한다

정수 나눗셈과 부동소수점 나눗셈:
```
i32 / 0  → panic: divide by zero
i64 / 0  → panic: divide by zero
f64 / 0.0 → panic: divide by zero

IEEE 754와 다르다:
  f64 / 0.0은 보통 Infinity 또는 NaN을 반환
  FreeLang v4는 이를 허용하지 않는다 → panic
  이유: NaN이 전파되면 AI가 추적하기 어렵다
```

---

## Q6. 정수 오버플로우 panic의 구체적 동작은?

**A:** 연산 직후 검사, 즉시 panic.

```freelang
var x: i32 = 2147483647   // i32 최대값
var y = x + 1              // panic 발생 지점
```

```
panic: integer overflow (i32: 2147483647 + 1)
  at main (calc.fl:2)
Actor 0 terminated
```

검사 대상 연산:
```
i32:
  + - * → 오버플로우 검사
  / % → 0 나누기 검사 + 오버플로우 검사 (i32.MIN / -1)
  단항 - → i32.MIN의 부정 → 오버플로우

i64:
  동일

f64:
  + - * / → Infinity 또는 NaN 결과 시 panic
  (IEEE 754 특수값 금지)
```

왜 wrapping이 아닌가:
```
C/Java 방식: 2147483647 + 1 = -2147483648 (조용히 감싸기)
→ AI가 결과를 받고 "왜 음수지?" → 디버깅 시간 낭비

FreeLang v4: panic → AI가 즉시 "오버플로우 발생"을 인지
→ 타입을 i64로 변경하거나 범위 검사 추가
```

VM 구현:
```typescript
case OP.ADD_I32: {
  const b = this.pop().val as number;
  const a = this.pop().val as number;
  const result = a + b;
  // 32비트 범위 검사
  if (result > 2147483647 || result < -2147483648) {
    this.actorPanic(`integer overflow (i32: ${a} + ${b})`);
    return;
  }
  this.push({ tag: "i32", val: result });
  break;
}
```

---

## Q7. 스택 오버플로우는 어떻게 감지하는가?

**A:** 호출 프레임 수 제한. Actor별 1,000 프레임.

```freelang
fn recurse(n: i32): i32 {
  return recurse(n + 1)   // 무한 재귀
}
recurse(0)
```

```
panic: stack overflow (depth: 1000)
  at recurse (infinite.fl:2)
  at recurse (infinite.fl:2)
  at recurse (infinite.fl:2)
  ... 997 more frames
Actor 0 terminated
```

구현:
```typescript
callFunction(funcIdx: number, argCount: number) {
  if (this.currentActor.frames.length >= 1000) {
    this.actorPanic("stack overflow (depth: 1000)");
    return;
  }
  // 정상 호출 진행
}
```

왜 1,000인가:
```
실제 프로그램에서 1,000 깊이 재귀 = 거의 확실히 무한 재귀

정상 재귀 예시:
  피보나치(30) → 깊이 30
  트리 순회(1000 노드) → 깊이 ~10 (균형 트리)
  퀵소트(10000) → 깊이 ~14 (평균)

1,000이면 정상 프로그램은 걸리지 않는다.
```

설정 가능 여부: **v4에서 불가**. 고정 1,000.
이유:
- AI가 이 값을 조정할 이유가 없다
- "깊이 10,000으로 올려줘" = 무한 재귀를 숨기려는 것
- v5에서 필요 시 설정 가능하게 확장

---

## Q8. 메모리 부족은 어떻게 처리하는가?

**A:** Actor별 메모리 한도. 초과 시 해당 Actor panic.

```
Actor 메모리 제한:
  기본값: 64MB per Actor
  (VM 전체가 아니라 Actor별)

초과 시:
  panic: out of memory (Actor 2, used: 64MB, limit: 64MB)
  → Actor 2 종료, 메모리 해제
  → 다른 Actor 영향 없음
```

메모리 추적 대상:
```
추적하는 것:
  - 배열 할당: [i32] 원소 수 × 4바이트
  - 문자열 생성: 바이트 수
  - 구조체: 필드 크기 합

추적 안 하는 것:
  - 스택 프레임 (별도 깊이 제한)
  - 상수 테이블 (공유 자원)
  - VM 내부 구조 (사용자 코드 아님)
```

```freelang
// 메모리 폭탄 예시
fn bomb() {
  var arr: [i32] = []
  for i in range(0, 100_000_000) {
    arr = arr.push(i)   // 400MB 시도
  }
}
```

```
panic: out of memory (Actor 0, used: 64MB, limit: 64MB)
  at bomb (bomb.fl:4)
Actor 0 terminated
```

왜 64MB인가:
```
CLI 도구, API 서버 용도에서:
  64MB = 1,600만 개의 i32 배열
       = 대부분의 데이터 처리에 충분

64MB를 넘는 경우 = 데이터를 스트리밍으로 처리해야 함
→ AI가 "전부 메모리에 올리지 말고 청크로 처리하라"는 교훈
```

---

## Q9. main Actor가 panic하면 전체 프로그램은?

**A:** main Actor panic = 프로그램 종료.

```
프로그램 시작:
  main() → Actor 0 (main Actor)

Actor 0가 panic하면:
  1. 모든 자식 Actor에 종료 신호 전송
  2. 스택 트레이스 출력
  3. 프로세스 종료 코드 1
```

```freelang
fn main() {
  spawn { long_running_task() }  // Actor 1
  spawn { another_task() }       // Actor 2

  var x = arr[100]   // panic!
}
```

```
panic: index out of bounds (index: 100, length: 0)
  at main (main.fl:5)
Actor 0 (main) terminated
Shutting down: 2 child actors terminated
Process exited with code 1
```

왜 main panic = 전체 종료인가:
```
main은 프로그램의 진입점이다.
main이 죽었는데 자식 Actor만 남아있는 것은 의미 없다.
→ 자식은 main이 설정한 컨텍스트에 의존
→ 고아 Actor는 정의되지 않은 상태

Go도 main goroutine 종료 시 전체 종료.
Erlang은 다르지만 (supervisor tree), v4에서 supervisor는 범위 밖.
```

자식 Actor가 panic하면?
```
spawn { panic("oops") }   // Actor 1 종료
// main은 계속 실행

단, main이 Actor 1의 결과를 기다리고 있었다면:
var ch = channel()
spawn { ch.send(result) }  // Actor 1이 panic하면 send 안 됨
var val = ch.recv()         // Err("actor terminated")
```

---

## Q10. panic 전체 흐름을 요약하면?

**A:** 결정 테이블 + 흐름도.

### panic 원인과 동작

| 원인 | 메시지 | 범위 | 복구 |
|------|--------|------|------|
| 배열 인덱스 초과 | `index out of bounds (index: N, length: M)` | Actor | 불가 |
| 0 나누기 | `divide by zero` | Actor | 불가 |
| 정수 오버플로우 | `integer overflow (i32: A + B)` | Actor | 불가 |
| f64 NaN/Infinity | `floating point error` | Actor | 불가 |
| 스택 오버플로우 | `stack overflow (depth: 1000)` | Actor | 불가 |
| 메모리 부족 | `out of memory (Actor N, ...)` | Actor | 불가 |
| 닫힌 채널에 send | `send on closed channel` | Actor | 불가 |
| main Actor panic | (위 원인 중 하나) | 전체 프로그램 | 불가 |
| VM 내부 오류 | `internal VM error: ...` | 전체 VM | 불가 |

### panic 흐름도

```
에러 발생
  │
  ├─ 컴파일 타임에 잡히는가?
  │   YES → 컴파일 에러 (코딩 단계에서 수정)
  │   NO ↓
  │
  ├─ 예측 가능한 실패인가? (파일 없음, 네트워크 등)
  │   YES → Result<T, E> 반환 (호출자가 처리)
  │   NO ↓
  │
  ├─ 프로그래머 논리 오류인가? (인덱스, 0 나누기, 오버플로우 등)
  │   YES → panic
  │       │
  │       ├─ main Actor인가?
  │       │   YES → 전체 프로그램 종료 (exit code 1)
  │       │   NO → 해당 Actor만 종료
  │       │         → 소유 채널 닫기
  │       │         → 상대 Actor에 Err 전파
  │       │
  │       └─ 스택 트레이스 출력 (최대 10 프레임)
  │
  └─ VM 내부 오류인가?
      YES → 전체 VM 종료 (이건 FreeLang의 버그)
```

### AI를 위한 핵심 규칙

```
1. panic을 보면 → 코드를 수정해라 (버그다)
2. Err를 보면 → 처리 로직을 추가해라 (정상 흐름이다)
3. panic은 catch 할 수 없다 → 사전에 방어해라
4. Actor panic은 격리된다 → 다른 작업에 영향 없다
5. main panic은 전체 종료다 → main에서는 특히 조심해라
```

---

# 요약

| 결정 | 내용 |
|------|------|
| panic vs Result | 논리 오류 = panic, 예측 가능 실패 = Result |
| panic 범위 | Actor 단위 격리 (main 제외) |
| main panic | 전체 프로그램 종료 |
| 스택 트레이스 | 최대 10 프레임, 함수명 + 파일:줄 |
| 채널 상대 panic | recv → Err, send → panic |
| 0 나누기 | panic (i32, i64, f64 모두) |
| 오버플로우 | panic (wrapping 아님) |
| f64 NaN/Infinity | panic (IEEE 754 특수값 금지) |
| 스택 깊이 | Actor별 1,000 프레임 고정 |
| 메모리 한도 | Actor별 64MB 기본 |
| VM 내부 오류 | 전체 VM 종료 (다른 종류) |
