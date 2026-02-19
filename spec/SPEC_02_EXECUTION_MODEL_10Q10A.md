# FreeLang v4 — Spec 02: 실행 모델 10Q 10A

---

## Q1. 왜 Bytecode VM인가?

**A:** 소거법.

| 방식 | 개발 비용 | 성능 | 디버깅 | v4 적합성 |
|------|----------|------|--------|-----------|
| Tree-Walking Interpreter | 1주 | Python 0.5x | 쉬움 | ❌ 너무 느림 |
| **Bytecode VM** | **3-4주** | **Python 5-20x** | **보통** | **✅ 채택** |
| JIT (Baseline) | 2개월 | Python 30-50x | 어려움 | ❌ 개발 비용 |
| AOT (LLVM) | 3개월+ | Go/Rust급 | 매우 어려움 | ❌ v4 범위 초과 |

Tree-Walking은 AST 노드를 직접 순회하면서 실행한다. 구현은 쉽지만 함수 호출마다 재귀가 발생하고, 분기마다 타입 검사를 한다. 느리다.

Bytecode VM은 AST를 플랫한 명령어 배열로 변환한다. 분기는 오프셋 점프. 함수 호출은 프레임 푸시. 타입 검사는 컴파일 시점에 끝났으므로 런타임에 안 한다. Tree-Walking 대비 10-40배 빠르다.

JIT는 Bytecode를 런타임에 기계어로 변환한다. 성능은 좋지만 구현에 2개월+. v4 범위를 벗어난다.

---

## Q2. Stack VM인가 Register VM인가?

**A:** Stack VM.

| 방식 | 장점 | 단점 |
|------|------|------|
| **Stack VM** | 구현 단순, 코드 생성 단순 | 명령어 수 많음 |
| Register VM | 명령어 수 적음, 성능 약간 상위 | 레지스터 할당 복잡 |

Stack VM을 선택하는 이유:

```
1. 코드 생성이 단순하다
   AST → Bytecode 변환 시 레지스터 할당 알고리즘이 불필요.
   값은 스택에 push, 연산 결과도 스택에 push. 그게 끝.

2. Pratt Parser와 궁합이 좋다
   식 "1 + 2 * 3"의 Bytecode:
     PUSH_I32 1
     PUSH_I32 2
     PUSH_I32 3
     MUL_I32        # 스택: [1, 6]
     ADD_I32        # 스택: [7]
   AST의 후위 순회(post-order) = Bytecode 순서. 직관적.

3. v4의 성능 목표(Python 10x)에 충분하다
   Stack VM과 Register VM의 차이: 1.2-1.5배.
   Python 대비 10배에서 이 차이는 무의미.
```

---

## Q3. VM의 핵심 구조는?

**A:**

```typescript
class VM {
  // 코드
  bytecode: Uint8Array     // 명령어 배열
  constants: Value[]        // 상수 테이블 (문자열, 함수 등)

  // 실행 상태
  ip: number               // Instruction Pointer (현재 명령어 위치)
  stack: Value[]            // 오퍼랜드 스택
  sp: number               // Stack Pointer

  // 호출 스택
  frames: CallFrame[]       // 함수 호출 프레임
  fp: number                // Frame Pointer

  // Actor
  actors: Actor[]           // 실행 중인 Actor 목록
  channels: Channel[]       // 활성 채널 목록
}

type CallFrame = {
  returnAddr: number        // 복귀 주소 (ip)
  baseSlot: number          // 이 프레임의 스택 시작 위치
  locals: Value[]           // 로컬 변수 슬롯
}

type Value =
  | { tag: "i32"; val: number }
  | { tag: "i64"; val: bigint }
  | { tag: "f64"; val: number }
  | { tag: "bool"; val: boolean }
  | { tag: "str"; val: string }
  | { tag: "arr"; val: Value[] }
  | { tag: "struct"; fields: Map<string, Value> }
  | { tag: "some"; val: Value }
  | { tag: "none" }
  | { tag: "ok"; val: Value }
  | { tag: "err"; val: Value }
  | { tag: "chan"; id: number }
  | { tag: "void" }
```

---

## Q4. 명령어 실행 루프는?

**A:** fetch-decode-execute.

```typescript
run() {
  while (true) {
    const op = this.bytecode[this.ip++]   // fetch

    switch (op) {                          // decode + execute
      case OP.PUSH_I32: {
        const val = this.readI32()
        this.push({ tag: "i32", val })
        break
      }
      case OP.ADD_I32: {
        const b = this.pop()               // 오른쪽 피연산자
        const a = this.pop()               // 왼쪽 피연산자
        this.push({ tag: "i32", val: a.val + b.val })
        break
      }
      case OP.JUMP_IF_FALSE: {
        const offset = this.readI32()
        const cond = this.pop()
        if (!cond.val) this.ip += offset
        break
      }
      case OP.CALL: {
        const funcIdx = this.readI32()
        const argCount = this.readI32()
        this.callFunction(funcIdx, argCount)
        break
      }
      case OP.HALT:
        return
      // ... 나머지 ~50개 명령어
    }
  }
}
```

타입 검사가 없다. TypeChecker가 이미 다 했다. VM은 실행만 한다.

---

## Q5. 함수 호출은 어떻게 작동하는가?

**A:** CallFrame 기반.

```
호출 전 스택:
  [... arg1, arg2, arg3]

CALL func_idx 3 실행:

1. CallFrame 생성
   { returnAddr: ip, baseSlot: sp-3, locals: [arg1, arg2, arg3, ...] }

2. frames에 push

3. ip를 함수 시작 주소로 점프

4. 함수 내에서 LOAD_LOCAL 0 = arg1, LOAD_LOCAL 1 = arg2 ...

RETURN 실행:

1. 반환값을 스택에서 가져옴

2. frames에서 pop

3. ip를 returnAddr로 복원

4. 스택을 baseSlot로 되돌림

5. 반환값을 스택에 push
```

```
예: add(10, 20)

  PUSH_I32 10
  PUSH_I32 20
  CALL 0 2          # 함수 0번, 인자 2개
  # 여기로 돌아옴, 스택에 30이 있음

함수 0번 (add):
  LOAD_LOCAL 0       # 10
  LOAD_LOCAL 1       # 20
  ADD_I32            # 30
  RETURN
```

---

## Q6. 분기(if/match)는 어떻게 작동하는가?

**A:** JUMP + JUMP_IF_FALSE.

```
if x > 10 { a() } else { b() }

  LOAD_LOCAL 0         # x
  PUSH_I32 10
  GT                   # x > 10 → bool
  JUMP_IF_FALSE +8     # false면 else로 점프
  # then branch
  CALL a 0
  JUMP +4              # else 건너뛰기
  # else branch
  CALL b 0
  # 합류점
```

match:

```
match opt {
  Some(v) => v + 1
  None => 0
}

  LOAD_LOCAL 0           # opt
  MATCH_TAG "some"       # Some이면 → 값을 스택에, true push
  JUMP_IF_FALSE +6       # None이면 점프
  # Some(v) branch
  PUSH_I32 1
  ADD_I32
  JUMP +3               # None branch 건너뛰기
  # None branch
  POP                    # opt 제거
  PUSH_I32 0
  # 합류점
```

---

## Q7. Actor/spawn은 VM에서 어떻게 구현되는가?

**A:** 협력적 스케줄링(cooperative scheduling).

```
실제 OS 스레드를 만들지 않는다.
Actor는 VM 내부의 "가상 실행 단위"다.
```

```typescript
type Actor = {
  id: number
  ip: number              // 이 Actor의 현재 명령어 위치
  stack: Value[]
  frames: CallFrame[]
  state: "running" | "waiting" | "done"
  waitingOn: number | null  // 대기 중인 channel id
}

class VM {
  actors: Actor[] = []
  currentActor: number = 0

  schedule() {
    // Round-robin
    while (this.actors.some(a => a.state !== "done")) {
      const actor = this.actors[this.currentActor]

      if (actor.state === "running") {
        this.runSlice(actor, 1000)  // 1000 명령어 실행 후 양보
      }

      if (actor.state === "waiting") {
        this.tryWakeup(actor)       // channel에 값 있으면 깨움
      }

      this.currentActor = (this.currentActor + 1) % this.actors.length
    }
  }
}
```

```
SPAWN 실행:

1. 새 Actor 생성 (별도 ip, stack, frames)
2. actors 배열에 추가
3. 원래 Actor는 SPAWN 다음 명령어로 계속

CHAN_SEND 실행:

1. 스택에서 값 pop
2. channel 버퍼에 추가
3. 이 channel을 기다리는 Actor가 있으면 상태를 "running"으로 변경

CHAN_RECV 실행:

1. channel 버퍼에 값이 있으면 → pop해서 스택에 push
2. 버퍼가 비어있으면 → 현재 Actor 상태를 "waiting"으로, 다음 Actor로 전환
```

OS 스레드 없음. Node.js의 이벤트 루프와 유사. 단, I/O 비동기가 아니라 명시적 channel 기반.

---

## Q8. 메모리 해제는 VM에서 어떻게 일어나는가?

**A:** 스코프 종료 시 MOVE 검사 + 즉시 해제.

```
GC 없다. Reference counting 없다.
스코프(CallFrame)가 끝나면 해당 locals를 해제한다.
```

```typescript
// RETURN 또는 블록 종료 시
releaseFrame(frame: CallFrame) {
  for (const local of frame.locals) {
    if (local !== null && !local.moved) {
      this.free(local)    // 즉시 해제
    }
    // moved된 값은 이미 다른 곳이 소유. 해제 안 함.
  }
}
```

```
MOVE 명령어:

  LOAD_LOCAL 0          # 값을 스택에 복사
  MOVE 0                # local[0]을 null로 마킹 (소유권 이전)
  STORE_LOCAL 1         # 새 위치에 저장

  이후 LOAD_LOCAL 0 시도 → 런타임 에러 (use after move)
  (TypeChecker가 이미 잡아야 하지만, VM에서도 방어)
```

---

## Q9. 성능을 구체적으로 어디까지 기대할 수 있는가?

**A:** 정직한 추산.

```
기준: CPython 3.12 = 1.0x

FreeLang v4 VM (TypeScript 구현):
  산술 연산:    5-10x   (타입 검사 없음, 직접 연산)
  함수 호출:    3-8x    (프레임 push/pop만, 인자 boxing 없음)
  배열 순회:    5-15x   (인덱스 직접 접근)
  문자열 처리:  2-5x    (JS 엔진 string에 위임)
  동시성:       측정 불가 (Python GIL vs FreeLang Actor)

종합 추정: Python 대비 5-15x

제한 요인:
  - VM이 TypeScript(Node.js)로 돌아감
  - Node.js 자체가 V8 위에서 동작
  - 이중 간접 실행 (Source → Bytecode → Node.js → V8)
```

```
이건 괜찮은가?

CLI 도구, API 서버 용도에서:
  Python 5-15x면 → 요청당 1ms → 0.1-0.2ms
  초당 5,000-10,000 요청 가능
  → 충분하다.
```

Go급(Python 30-50x)은 v5에서 AOT 컴파일러로.

---

## Q10. 이 실행 모델이 악마 테스트를 통과할 수 있는가?

**A:** 검증.

### 악마 테스트 #2

```freelang
var ch: channel<Result<i32, string>> = channel()

spawn {
  ch.send(Ok(42))
}

spawn {
  match ch.recv() {
    Ok(n) => println(n)
    Err(e) => println(e)
  }
}
```

VM 실행 흐름:

```
Actor 0 (main):
  CHAN_NEW           → ch (id=0)
  STORE_LOCAL 0
  SPAWN [actor 1]   → Actor 1 생성
  SPAWN [actor 2]   → Actor 2 생성
  HALT

Actor 1:
  LOAD_LOCAL 0       # ch
  PUSH_I32 42
  WRAP_OK            # Ok(42)
  CHAN_SEND           # ch에 Ok(42) 전송
  HALT

Actor 2:
  LOAD_LOCAL 0       # ch
  CHAN_RECV           # 값 수신 (Actor 1이 보내기 전이면 waiting)
  MATCH_TAG "ok"     # Ok면 값 추출
  JUMP_IF_FALSE +3
  PRINT              # 42 출력
  JUMP +2
  PRINT              # 에러 출력
  HALT
```

스케줄러 실행:
```
1. Actor 0: 채널 생성, Actor 1,2 생성, HALT
2. Actor 1: Ok(42) 전송, HALT
3. Actor 2: ch.recv() → Ok(42) 수신, match → 42 출력, HALT
```

통과 가능: ✅

### 악마 테스트 #3

```freelang
fn process(items: [i32]): Result<i32, string> {
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

Bytecode:

```
  PUSH_I32 0
  STORE_LOCAL 1         # sum = 0
  LOAD_LOCAL 0          # items
  ARRAY_LEN
  PUSH_I32 0            # index = 0
  # loop start:
  DUP
  LOAD_LOCAL 0
  ARRAY_LEN
  LT
  JUMP_IF_FALSE +end    # index >= len → 루프 종료
  LOAD_LOCAL 0
  ARRAY_GET              # items[index]
  CALL validate 1        # validate(item) → Result
  MATCH_TAG "ok"
  JUMP_IF_FALSE +err
  # Ok branch
  LOAD_LOCAL 1
  ADD_I32
  STORE_LOCAL 1          # sum = sum + v
  JUMP +continue
  # Err branch
  WRAP_ERR
  RETURN                 # return Err(e)
  # continue
  PUSH_I32 1
  ADD_I32                # index++
  JUMP -loop_start
  # end
  LOAD_LOCAL 1
  WRAP_OK
  RETURN                 # return Ok(sum)
```

통과 가능: ✅

---

# 요약

| 결정 | 내용 |
|------|------|
| 실행 방식 | Bytecode VM |
| VM 종류 | Stack VM |
| 스케줄링 | 협력적 (Round-robin, 1000 insn/slice) |
| 스레드 | 없음 (Actor = VM 내부 가상 단위) |
| 메모리 | Scope Drop + Move 마킹 (GC 없음) |
| 성능 | Python 5-15x |
| 악마 테스트 | 통과 가능 (검증 완료) |
