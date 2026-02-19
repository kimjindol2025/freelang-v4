# FreeLang v4

**"AI가 생성한 코드가 컴파일을 통과하면, 그 코드는 안전하다."**

## 개요

AI-First 프로그래밍 언어. null 없음, 묵시적 변환 없음, use-after-move 컴파일 에러.

```
source.fl → Lexer → Parser → TypeChecker → Compiler → VM
```

## 실행

```bash
npx ts-node src/main.ts examples/hello.fl
npx ts-node src/main.ts examples/factorial.fl
npx ts-node src/main.ts examples/fizzbuzz.fl --dump-bc
```

## 코드 예시

```freelang
fn factorial(n: i32): i32 {
  if n <= 1 { return 1 }
  return n * factorial(n + -1)
}

for i in range(1, 11) {
  println(str(i) + "! = " + str(factorial(i)))
}
```

```freelang
fn sum(arr: [i32]): i32 {
  var total: i32 = 0
  for x in arr {
    total = total + x
  }
  return total
}

var nums = [1, 2, 3, 4, 5]
println(str(sum(nums)))
```

## 핵심 기능

| 기능 | 내용 |
|------|------|
| 타입 | i32, i64, f64, bool, string, [T], {fields}, Option\<T\>, Result\<T,E\>, channel\<T\> |
| 메모리 | Scope Drop + Move semantics (GC 없음) |
| 동시성 | Actor + Channel (cooperative scheduling) |
| 에러 | Result\<T,E\> + ? 연산자, panic = Actor만 죽임 |
| 루프 | for...in only (무한 루프 방지) |
| 내장 함수 | 50개 (I/O, 암호화, JSON, 문자열, 배열, 수학, 유틸리티) |

## 구현 현황

### 1부: 설계 명세 (10 Steps 완료)

| Step | 문서 | 핵심 결정 |
|------|------|----------|
| 1 | SPEC_01 페르소나 | 타겟: AI 에이전트 |
| 2 | SPEC_02 Core Language | Stack VM, 45 opcodes |
| 3 | SPEC_03 ISA + Panic | 바이트코드 확정 |
| 4 | SPEC_04 Lexical | 50 토큰, 13 키워드 |
| 5 | SPEC_05 Syntax | RD + Pratt 하이브리드 |
| 6 | SPEC_06 Type System | 10종 타입 |
| 7 | SPEC_07 Memory | Move/Copy 분리 |
| 8 | SPEC_08 Scope | 블록 스코프, 전방참조 |
| 9 | SPEC_09 Control Flow | for...in, Result + ? |
| 10 | SPEC_10 Modularity | v4 = 핵, v5 = 살 |

### 2부: 구현 (7 Phases 완료)

| Phase | 파일 | LOC | Tests | 설명 |
|-------|------|-----|-------|------|
| 1. Lexer | `lexer.ts` | 452 | 37 | Tokenization (50 tokens) |
| 2. Parser/AST | `ast.ts` + `parser.ts` | 784 | 116 | RD + Pratt Parser |
| 3. TypeChecker | `checker.ts` | 881 | 46 | Type System (Move/Copy) |
| 4. Compiler | `compiler.ts` | 785 | 54 | AST → Bytecode (45 ops) |
| 5. VM | `vm.ts` | 1,050 | 62 | Stack VM + Actor scheduling |
| 6. CLI | `main.ts` | 92 | - | CLI Entry Point |
| 7. Core Libraries | `vm.ts` | +570 | +19 | 20 stdlib functions |
| **합계** | | **6,934** | **334** | Phase 7: 50개 내장 함수 |

## 프로젝트 구조

```
freelang-v4/
├── spec/                    # 설계 명세 (18개 문서, 9,136 LOC)
├── src/
│   ├── lexer.ts             # 토큰화 (50 토큰)
│   ├── ast.ts               # AST 노드 정의
│   ├── parser.ts            # RD + Pratt 파서
│   ├── checker.ts           # 타입 체커 (Move/Copy 추적)
│   ├── compiler.ts          # AST → 바이트코드 (45 opcodes)
│   ├── vm.ts                # Stack VM (Actor scheduling)
│   ├── main.ts              # CLI 진입점
│   ├── lexer.test.ts        # 37 tests
│   ├── parser.test.ts       # 116 tests
│   ├── checker.test.ts      # 46 tests
│   ├── compiler.test.ts     # 54 tests
│   └── vm.test.ts           # 62 tests
├── examples/
│   ├── hello.fl
│   ├── factorial.fl
│   └── fizzbuzz.fl
├── tsconfig.json
└── README.md
```

## 테스트

```bash
npx ts-node src/lexer.test.ts
npx ts-node src/parser.test.ts
npx ts-node src/checker.test.ts
npx ts-node src/compiler.test.ts
npx ts-node src/vm.test.ts
```

334 assertions, 0 failures.

## 50개 내장 함수 (Phase 7)

### I/O (3개)
`println`, `print`, `read_line`

### 파일 (2개)
`read_file`, `write_file`

### 타입 변환 (4개)
`str`, `i32`, `i64`, `f64`

### 배열 (8개)
`push`, `pop`, `length`, `slice`, `clone`, `reverse`, `sort`, `unique`

### 문자열 (9개)
`length`, `contains`, `split`, `trim`, `to_upper`, `to_lower`, `char_at`, `starts_with`, `ends_with`, `replace`

### 암호화 & 인코딩 (6개)
`md5`, `sha256`, `sha512`, `base64_encode`, `base64_decode`, `hmac`

### JSON (4개)
`json_parse`, `json_stringify`, `json_validate`, `json_pretty`

### 수학 (5개)
`abs`, `min`, `max`, `pow`, `sqrt`, `gcd`, `lcm`

### 유틸리티 (4개)
`range`, `uuid`, `timestamp`, `typeof`

### 에러 & 동시성 (2개)
`assert`, `panic`

### 채널 (2개)
`channel`, `recv`, `send`

## v4의 한계 (의도적)

모듈/import 없음, FFI 없음, 일급 함수 없음, struct 선언 없음, while/break 없음 → v5에서 추가. v4 코드는 v5에서 그대로 컴파일 보장.

## 총계

```
명세:  9,136 LOC (18개 문서)
코드:  6,934 LOC (11개 파일 + Phase 7)
예제:    200 LOC (9개 .fl 파일)
테스트:  334개 assertions
합계: 16,204 LOC + 334 tests

Phase 7 추가:
- 20개 내장 함수 (Crypto, JSON, 문자열, 배열, 수학, 유틸리티)
- 50개 총 내장 함수
- 19개 새로운 테스트
- 6개 예제 파일
```
