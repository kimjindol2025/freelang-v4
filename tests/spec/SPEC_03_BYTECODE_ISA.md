# FreeLang v4 — Spec 03: Bytecode ISA

**FROZEN. 이 문서 확정 후 변경 금지.**

---

# 1. Binary Format

## 1.1 파일 구조 (.flc)

```
┌──────────────────────┐
│ Magic Number (4B)     │  0x464C5634  "FLV4"
│ Version (2B)          │  0x0001
│ Constant Pool Size (4B)│
│ Constant Pool         │  가변 길이
│ Function Table Size (4B)│
│ Function Table        │  가변 길이
│ Entry Point (4B)      │  main 함수 인덱스
│ Bytecode Size (4B)    │
│ Bytecode              │  명령어 배열
└──────────────────────┘
```

## 1.2 엔디안

```
Little-endian (x86/ARM 기본)
```

---

# 2. Operand Encoding

## 2.1 명령어 포맷

```
모든 명령어 = 1 byte opcode + 0~N bytes operand

포맷 A: opcode만 (1B)
  [op]

포맷 B: opcode + i32 operand (5B)
  [op][i32 LE]

포맷 C: opcode + 2x i32 operand (9B)
  [op][i32 LE][i32 LE]
```

## 2.2 데이터 타입 인코딩

| 접두어 | 크기 | 용도 |
|--------|------|------|
| i32 operand | 4 byte | 상수값, 인덱스, 오프셋 |
| i64 operand | 8 byte | 큰 정수 상수 |
| f64 operand | 8 byte | 부동소수점 상수 |

---

# 3. Constant Pool

## 3.1 구조

```
Entry = [tag: 1B] [data: 가변]

Tag 0x01: i32      → 4B
Tag 0x02: i64      → 8B
Tag 0x03: f64      → 8B
Tag 0x04: string   → [length: 4B][UTF-8 bytes]
Tag 0x05: bool     → 1B (0=false, 1=true)
```

## 3.2 접근

```
PUSH_CONST <pool_index>    # constant pool에서 값 로드
```

pool_index는 i32 (4B). 최대 2^31 상수.

---

# 4. Function Table

## 4.1 구조

```
Entry = {
  name_index: i32     # constant pool의 문자열 인덱스
  arity: i32          # 매개변수 개수
  locals: i32         # 로컬 변수 슬롯 개수
  code_offset: i32    # bytecode 배열 내 시작 위치
  code_length: i32    # 명령어 길이 (bytes)
}
```

## 4.2 호출

```
CALL <func_index> <arg_count>
```

func_index로 Function Table 조회 → code_offset으로 점프.

---

# 5. Opcode Table (전체)

## 5.1 Stack 조작 (0x00-0x0F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| NOP | 0x00 | A | 아무것도 안 함 |
| POP | 0x01 | A | 스택 top 제거 |
| DUP | 0x02 | A | 스택 top 복제 |
| PUSH_CONST | 0x03 | B | constant pool[idx] → push |
| PUSH_I32 | 0x04 | B | i32 즉시값 → push |
| PUSH_TRUE | 0x05 | A | true → push |
| PUSH_FALSE | 0x06 | A | false → push |
| PUSH_NONE | 0x07 | A | None → push |
| PUSH_VOID | 0x08 | A | void → push |

## 5.2 변수 (0x10-0x1F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| LOAD_LOCAL | 0x10 | B | locals[slot] → push |
| STORE_LOCAL | 0x11 | B | pop → locals[slot] |
| LOAD_GLOBAL | 0x12 | B | globals[idx] → push |

## 5.3 산술 (0x20-0x2F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| ADD_I32 | 0x20 | A | pop b, pop a, push a+b |
| SUB_I32 | 0x21 | A | pop b, pop a, push a-b |
| MUL_I32 | 0x22 | A | pop b, pop a, push a*b |
| DIV_I32 | 0x23 | A | pop b, pop a, push a/b (정수) |
| MOD_I32 | 0x24 | A | pop b, pop a, push a%b |
| NEG_I32 | 0x25 | A | pop a, push -a |
| ADD_I64 | 0x26 | A | i64 덧셈 |
| SUB_I64 | 0x27 | A | i64 뺄셈 |
| MUL_I64 | 0x28 | A | i64 곱셈 |
| DIV_I64 | 0x29 | A | i64 나눗셈 |
| MOD_I64 | 0x2A | A | i64 나머지 |
| NEG_I64 | 0x2B | A | i64 부호 반전 |
| ADD_F64 | 0x2C | A | f64 덧셈 |
| SUB_F64 | 0x2D | A | f64 뺄셈 |
| MUL_F64 | 0x2E | A | f64 곱셈 |
| DIV_F64 | 0x2F | A | f64 나눗셈 |

## 5.4 비교 (0x30-0x3F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| EQ | 0x30 | A | pop b, pop a, push a==b |
| NE | 0x31 | A | push a!=b |
| LT_I32 | 0x32 | A | push a<b (i32) |
| GT_I32 | 0x33 | A | push a>b |
| LE_I32 | 0x34 | A | push a<=b |
| GE_I32 | 0x35 | A | push a>=b |
| LT_I64 | 0x36 | A | i64 비교 |
| GT_I64 | 0x37 | A | |
| LE_I64 | 0x38 | A | |
| GE_I64 | 0x39 | A | |
| LT_F64 | 0x3A | A | f64 비교 |
| GT_F64 | 0x3B | A | |
| LE_F64 | 0x3C | A | |
| GE_F64 | 0x3D | A | |

## 5.5 논리 (0x40-0x4F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| AND | 0x40 | A | pop b, pop a, push a&&b |
| OR | 0x41 | A | push a\|\|b |
| NOT | 0x42 | A | pop a, push !a |

## 5.6 문자열 (0x50-0x5F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| STR_CONCAT | 0x50 | A | pop b, pop a, push a+b |
| STR_LEN | 0x51 | A | pop s, push s.length |
| STR_EQ | 0x52 | A | pop b, pop a, push a==b |

## 5.7 타입 변환 (0x58-0x5F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| I32_TO_I64 | 0x58 | A | pop i32, push i64 |
| I32_TO_F64 | 0x59 | A | pop i32, push f64 |
| I64_TO_I32 | 0x5A | A | pop i64, push i32 (truncate) |
| I64_TO_F64 | 0x5B | A | pop i64, push f64 |
| F64_TO_I32 | 0x5C | A | pop f64, push i32 (floor) |
| TO_STR | 0x5D | A | pop any, push string 표현 |

## 5.8 분기 (0x60-0x6F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| JUMP | 0x60 | B | ip += offset (상대 점프) |
| JUMP_IF_FALSE | 0x61 | B | pop cond, false면 ip += offset |
| JUMP_IF_TRUE | 0x62 | B | pop cond, true면 ip += offset |

점프 오프셋: **상대 주소 (signed i32)**. 현재 ip 기준.

## 5.9 함수 (0x70-0x7F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| CALL | 0x70 | C | func_table[idx] 호출, arg_count개 인자 |
| RETURN | 0x71 | A | 스택 top을 반환값으로, 프레임 pop |
| RETURN_VOID | 0x72 | A | void 반환, 프레임 pop |

## 5.A 배열 (0x80-0x8F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| ARRAY_NEW | 0x80 | B | 스택에서 n개 pop, 배열 생성, push |
| ARRAY_GET | 0x81 | A | pop idx, pop arr, push arr[idx] |
| ARRAY_SET | 0x82 | A | pop val, pop idx, pop arr, arr[idx]=val |
| ARRAY_LEN | 0x83 | A | pop arr, push arr.length |
| ARRAY_PUSH | 0x84 | A | pop val, pop arr, arr.push(val) |

## 5.B 구조체 (0x90-0x9F)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| STRUCT_NEW | 0x90 | B | 스택에서 n개 field값 pop, 구조체 생성, push |
| STRUCT_GET | 0x91 | B | pop struct, push struct.fields[idx] |
| STRUCT_SET | 0x92 | B | pop val, pop struct, struct.fields[idx]=val |

## 5.C Option/Result (0xA0-0xAF)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| WRAP_SOME | 0xA0 | A | pop val, push Some(val) |
| WRAP_OK | 0xA1 | A | pop val, push Ok(val) |
| WRAP_ERR | 0xA2 | A | pop val, push Err(val) |
| IS_SOME | 0xA3 | A | pop opt, push opt is Some |
| IS_NONE | 0xA4 | A | pop opt, push opt is None |
| IS_OK | 0xA5 | A | pop res, push res is Ok |
| IS_ERR | 0xA6 | A | pop res, push res is Err |
| UNWRAP | 0xA7 | A | pop Option/Result, push inner (panic if None/Err) |
| TRY | 0xA8 | B | pop Result, Err이면 RETURN, Ok이면 inner push. offset=에러시 점프 |

TRY = `?` 연산자의 bytecode 표현.

## 5.D 동시성 (0xB0-0xBF)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| SPAWN | 0xB0 | B | 새 Actor 생성, code_offset으로 시작 |
| CHAN_NEW | 0xB1 | A | 새 channel 생성, push chan_id |
| CHAN_SEND | 0xB2 | A | pop val, pop chan, chan에 val 전송 (move) |
| CHAN_RECV | 0xB3 | A | pop chan, chan에서 수신 (블로킹), push val |

## 5.E 메모리 (0xC0-0xCF)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| MOVE | 0xC0 | B | locals[slot]을 null 마킹 (소유권 이전 완료) |
| CLONE | 0xC1 | A | pop val, push deep_copy(val) |
| DROP | 0xC2 | B | locals[slot] 해제 |

**MOVE는 TypeChecker가 삽입한다.** VM은 null 마킹만 실행. 검사 안 함.

## 5.F 출력/제어 (0xD0-0xDF)

| Opcode | Hex | Format | 동작 |
|--------|-----|--------|------|
| PRINT | 0xD0 | A | pop val, stdout 출력 |
| PRINTLN | 0xD1 | A | pop val, stdout 출력 + 줄바꿈 |
| HALT | 0xD2 | A | VM 종료 |
| PANIC | 0xD3 | A | pop msg, 에러 출력 + 스택 트레이스 + 종료 |

---

# 6. Opcode 요약

| 범위 | 카테고리 | 개수 |
|------|----------|------|
| 0x00-0x0F | Stack 조작 | 9 |
| 0x10-0x1F | 변수 | 3 |
| 0x20-0x2F | 산술 | 16 |
| 0x30-0x3F | 비교 | 14 |
| 0x40-0x4F | 논리 | 3 |
| 0x50-0x5F | 문자열 + 타입변환 | 9 |
| 0x60-0x6F | 분기 | 3 |
| 0x70-0x7F | 함수 | 3 |
| 0x80-0x8F | 배열 | 5 |
| 0x90-0x9F | 구조체 | 3 |
| 0xA0-0xAF | Option/Result | 9 |
| 0xB0-0xBF | 동시성 | 4 |
| 0xC0-0xCF | 메모리 | 3 |
| 0xD0-0xDF | 출력/제어 | 4 |
| **합계** | | **88** |

예약 공간: 0xE0-0xFF (16개) — 미래 확장용. v4에서 사용 금지.

---

# 7. 코드 생성 예제

## 7.1 Hello World

```freelang
fn main() {
  println("Hello, FreeLang v4!")
}
```

```
Constant Pool:
  [0] string "Hello, FreeLang v4!"
  [1] string "main"

Function Table:
  [0] { name: 1, arity: 0, locals: 0, offset: 0, length: 4 }

Bytecode:
  0000: PUSH_CONST 0       # "Hello, FreeLang v4!"
  0005: PRINTLN             # 출력
  0006: RETURN_VOID
```

## 7.2 피보나치

```freelang
fn fib(n: i32): i32 {
  if n <= 1 { return n }
  return fib(n - 1) + fib(n - 2)
}
```

```
Bytecode (fib, func_index=0):
  0000: LOAD_LOCAL 0        # n
  0005: PUSH_I32 1
  000A: LE_I32              # n <= 1
  000B: JUMP_IF_FALSE +5    # false → 재귀
  0010: LOAD_LOCAL 0        # n
  0015: RETURN              # return n

  0016: LOAD_LOCAL 0        # n
  001B: PUSH_I32 1
  0020: SUB_I32             # n - 1
  0021: CALL 0 1            # fib(n-1)
  002A: LOAD_LOCAL 0        # n
  002F: PUSH_I32 2
  0034: SUB_I32             # n - 2
  0035: CALL 0 1            # fib(n-2)
  003E: ADD_I32             # fib(n-1) + fib(n-2)
  003F: RETURN
```

## 7.3 악마 테스트 #2

```freelang
var ch: channel<Result<i32, string>> = channel()
spawn { ch.send(Ok(42)) }
match ch.recv() {
  Ok(n) => println(n)
  Err(e) => println(e)
}
```

```
main:
  0000: CHAN_NEW             # channel 생성
  0001: STORE_LOCAL 0        # ch

  0006: SPAWN +spawn1        # Actor 1 시작

  000B: LOAD_LOCAL 0         # ch
  0010: CHAN_RECV             # 수신 (블로킹)
  0011: DUP
  0012: IS_OK                # Ok인가?
  0013: JUMP_IF_FALSE +7     # Err면 점프
  0018: UNWRAP               # Ok(n) → n
  0019: PRINTLN              # n 출력
  001A: JUMP +4              # 끝으로
  001F: UNWRAP               # Err(e) → e
  0020: PRINTLN              # e 출력
  0021: HALT

spawn1:
  0000: LOAD_LOCAL 0         # ch (Copy: chan_id)
  0005: PUSH_I32 42
  000A: WRAP_OK              # Ok(42)
  000B: CHAN_SEND             # ch.send(Ok(42))
  000C: RETURN_VOID
```

---

# 8. 위험 요소 반영 (피드백 수용)

## 8.1 Move 검사 — 컴파일 타임 ONLY

```
MOVE 명령어: locals[slot] = null 마킹만 실행.
VM은 "이미 null인 slot 접근" 시 어떤 검사도 하지 않는다.
TypeChecker가 use-after-move를 전부 잡아야 한다.
VM은 신뢰한다.
```

## 8.2 Actor Slice — 동적

```
기본 slice: 256 명령어
조정 규칙:
  - CHAN_RECV에서 블로킹 → 즉시 양보 (slice 소모 무관)
  - CHAN_SEND 성공 → slice 잔여량 유지
  - Actor 수 < 4 → slice 1024로 확대
  - Actor 수 > 16 → slice 128로 축소
```

## 8.3 Value 표현 — Tagged Union 유지

```
TypeScript VM에서 NaN boxing은 불가능 (JS number = 모두 f64).
Tagged union { tag, val } 유지.
성능 영향: 산술 hot loop에서 10-20% 손실.
v5 (Rust/C VM)에서 NaN boxing 전환.
```
