# 🏗️ FreeLang 완전한 언어: 아키텍처

**목표**: FreeLang 전체 스택의 아키텍처 설명
**대상**: 아키텍트, 구현자

---

## 📐 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    User Application                      │
│        (REST API, GraphQL, CLI, WebSocket)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Application Layer (FreeLang)                │
│  ┌────────────┬────────────┬────────────┬─────────────┐ │
│  │   HTTP     │ Database   │  Cache     │  WebSocket  │ │
│  │  Handlers  │  Queries   │  Logic     │  Handlers   │ │
│  └────────────┴────────────┴────────────┴─────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│          Infrastructure Layer (FreeLang)                 │
│  ┌────────────┬────────────┬────────────┬─────────────┐ │
│  │ HTTP Svr   │ DB Driver  │ Cache Mgr  │ Stream Mgr  │ │
│  │ (http.free)│(sql.free)  │(cache.free)│(stream.free)│ │
│  └────────────┴────────────┴────────────┴─────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│          Core/StdLib Layer (FreeLang)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ async.free │ error.free │ types.free │ util.free │  │
│  │ fs.free    │ json.free  │ string.free│ array.free │ │
│  │ math.free  │ object.free│ path.free  │ proc.free  │ │
│  └───────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│    Type System & Semantics Layer                         │
│    (SPEC_04: Lexer, SPEC_05: Parser, SPEC_06: Types)    │
│    (SPEC_07: Move, SPEC_08: Scope)                       │
│    (SPEC_09-13: Features)                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            FreeLang Compiler                             │
│  ┌──────────┬──────────┬──────────┬─────────────────┐  │
│  │  Lexer   │  Parser  │   Type   │   ISA Generator │  │
│  │(SPEC_04) │(SPEC_05) │ Checker  │                 │  │
│  │          │          │(SPEC_06) │                 │  │
│  └──────────┴──────────┴──────────┴─────────────────┘  │
│                           │                             │
│                    Optimization Pass                     │
│                  (Dead code elimination,                 │
│                   Register allocation,                   │
│                   Constant folding)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│           ISA v1.0 (Instruction Set)                     │
│  22 Instructions: ADD, SUB, MUL, DIV, LOAD, STORE,      │
│                  MOV, JMP, JMP_IF, CALL, RET, PUSH, POP,│
│                  TRY_BEGIN, TRY_END, RAISE, CATCH,      │
│                  FOR_INIT, FOR_NEXT, CMP, NOP, HALT     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              C VM (Single Runtime)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Registers: R0-R7 (8개, 32-bit 각)                │  │
│  │ Memory: 4KB VM 메모리                            │  │
│  │ Stack: 1K 엔트리 스택                           │  │
│  │ Flags: Z, C, S, E, L                            │  │
│  │ Exception Handling: setjmp/longjmp              │  │
│  │ Async Queue: delay 기반 스케줄링                 │  │
│  └──────────────────────────────────────────────────┘  │
│  (main_extended.c + 확장)                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│           Machine Execution                              │
│  (Native CPU 명령어 실행)                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 데이터 흐름

### 1. 컴파일 시점 (Compile Time)

```
FreeLang 소스코드 (.free)
    ↓
Lexer (SPEC_04)
    ├─ 토큰화 (tokenization)
    └─ 키워드/연산자/식별자 분류
    ↓
Token Stream
    ↓
Parser (SPEC_05)
    ├─ 구문 분석 (syntax analysis)
    └─ 추상 구문 트리(AST) 생성
    ↓
Abstract Syntax Tree (AST)
    ↓
Type Checker (SPEC_06, SPEC_07, SPEC_08)
    ├─ 타입 검사
    ├─ Move semantics 적용
    └─ Scope & binding 검증
    ↓
Type-Checked AST
    ↓
ISA Generator
    ├─ AST → ISA v1.0 명령어 시퀀스 변환
    ├─ 레지스터 할당
    ├─ 레이블 해석
    └─ 바이트코드 생성
    ↓
Bytecode (uint8[])
    ↓
Optimizer
    ├─ Dead code elimination
    ├─ Constant folding
    └─ Instruction scheduling
    ↓
Optimized Bytecode
```

### 2. 런타임 (Runtime)

```
Optimized Bytecode
    ↓
C VM (main_extended.c)
    ├─ Fetch (바이트코드 읽기)
    ├─ Decode (명령어 디코딩)
    ├─ Execute (실행)
    │  ├─ 산술 연산: ADD, SUB, MUL, DIV
    │  ├─ 메모리 접근: LOAD, STORE
    │  ├─ 제어 흐름: JMP, JMP_IF, CALL, RET
    │  ├─ 예외 처리: TRY_BEGIN, TRY_END, RAISE, CATCH
    │  └─ Async: async_queue_add, async_queue_process
    └─ 결과 저장 (레지스터/메모리)
    ↓
Program Output
```

---

## 🎯 Layer별 책임

### Layer 1: Application (프로젝트별 로직)

**책임**:
- REST API 엔드포인트
- 비즈니스 로직
- GraphQL 스키마
- CLI 명령어

**예시**:
```freelang
// projects/api/handlers.free
async fn handleGetUser(req: Request) -> Response {
  let user = db.query("SELECT * FROM users WHERE id = ?", req.id)
  if user == null {
    return Response { status: 404, body: "Not found" }
  }
  return Response { status: 200, body: user }
}
```

### Layer 2: Infrastructure (공유 인터페이스)

**책임**:
- HTTP 서버 구현
- Database 드라이버
- Cache 관리자
- Stream 처리

**예시**:
```freelang
// stdlib/http.free
struct HttpServer {
  port: int,
  handlers: object,
  routes: array<Route>
}

async fn listen(server: HttpServer, port: int) -> void {
  // HTTP 서버 시작
  // 요청 수신
  // 핸들러 호출
  // 응답 전송
}
```

### Layer 3: Core/StdLib (재사용 가능한 기능)

**책임**:
- Async/Promise
- Error handling
- Type conversions
- String/Array/Object 조작
- 파일 시스템 접근

**예시**:
```freelang
// stdlib/async.free
async fn delay(ms: uint) -> void {
  let start = now()
  while (now() - start < ms) {
    // Wait
  }
}

// stdlib/string.free
fn toUpperCase(s: string) -> string {
  // 문자열을 대문자로 변환
}
```

### Layer 4: Type System & Semantics

**책임**:
- 타입 정의 (SPEC_06)
- Move semantics (SPEC_07)
- Scope & binding (SPEC_08)
- 고급 기능 (SPEC_09-13)

**정의**:
```
Type System:
  - Primitive: int, bool, string, float
  - Composite: struct, array, object
  - Function: fn(T) -> U
  - Generic: T, U, V (타입 변수)

Move Semantics:
  - Copy: 원시 타입, 자동 복사
  - Move: 소유권 이전
  - Borrow: 임시 참조 (아직 미구현)

Scope Rules:
  - 렉시컬 스코핑
  - 섀도우 허용
  - 함수 매개변수 바인딩
```

### Layer 5: Compiler

**책임**:
- 파일 읽기
- 파싱
- 타입 검사
- 바이트코드 생성
- 최적화

**컴포넌트**:
```
Lexer (6단계)
  1. 입력: 소스코드 문자
  2. 처리: 토큰 인식
  3. 출력: Token[]

Parser (5단계)
  1. 입력: Token[]
  2. 처리: 구문 분석
  3. 출력: Program AST

Type Checker (7단계)
  1. 입력: Program AST
  2. 처리: 타입 검사
  3. 출력: Type-checked AST

ISA Generator (10단계)
  1. 입력: Type-checked AST
  2. 처리: ISA 코드 생성
  3. 출력: Bytecode[]

Optimizer (5단계)
  1. 입력: Bytecode[]
  2. 처리: 최적화 패스
  3. 출력: Optimized Bytecode[]
```

### Layer 6: ISA v1.0

**책임**:
- 22개 명령어 정의
- 바이트코드 포맷
- 명령어 인코딩

**명령어 분류**:
```
데이터 이동 (4개): NOP, MOV, LOAD, STORE
산술 연산 (4개): ADD, SUB, MUL, DIV
제어 흐름 (4개): JMP, JMP_IF, CALL, RET
스택 (2개): PUSH, POP
비교 (1개): CMP
예외 처리 (4개): TRY_BEGIN, TRY_END, RAISE, CATCH
루프 (2개): FOR_INIT, FOR_NEXT
기본 (1개): HALT
```

### Layer 7: C VM

**책임**:
- 바이트코드 해석 및 실행
- 메모리 관리
- Exception handling
- Async queue 관리

**런타임 지원**:
```
메모리:
  - 8개 레지스터 (R0-R7)
  - 4KB VM 메모리
  - 1K 스택

상태:
  - Instruction Pointer (IP)
  - Stack Pointer (SP)
  - Flags (Z, C, S, E, L)
  - Last Error

기능:
  - setjmp/longjmp (예외 처리)
  - Async queue (비동기 작업)
  - I/O operations (표준 라이브러리)
```

---

## 🔌 모듈 간 통신

### Compiler ↔ VM

```
FreeLang Source
    ↓
(Compiler)
    ├─ Lexer: 단어 분석
    ├─ Parser: 문법 분석
    ├─ Type Checker: 타입 검사
    └─ ISA Generator: 바이트코드 생성
    ↓
Bytecode (바이트 배열)
    ↓
(VM)
    ├─ Fetch: 명령어 읽기
    ├─ Decode: 명령어 해석
    ├─ Execute: 실행
    └─ Write Back: 결과 저장
    ↓
Program Output
```

### Application ↔ StdLib

```
Application (FreeLang)
    ├─ fs.read(path) 호출
    │   ↓
    │  (StdLib: fs.free)
    │   └─ VM 파일 시스템 접근
    │   ↓
    │  (VM: I/O operations)
    │   ↓
    │  파일 내용 반환
    │
    └─ http.get(url) 호출
        ↓
       (StdLib: http.free)
        └─ VM 네트워크 접근
        ↓
       (VM: Socket operations)
        ↓
       HTTP 응답 반환
```

---

## 📊 성능 특성

### 메모리 사용량

```
Per Request (HTTP):
  Bytecode: ~100 bytes (간단한 요청)
  Stack Usage: ~100 bytes
  Memory Usage: ~50 bytes
  Total per request: ~250 bytes

Per Connection:
  Context: ~1 KB
  State: ~500 bytes
  Total per connection: ~1.5 KB
```

### 실행 시간

```
Simple Operation (a + b): ~1µs
Function Call: ~5µs
HTTP Request: ~10-50ms (네트워크 포함)
Database Query: ~1-100ms (쿼리 복잡도 따라)
```

### 컴파일 시간

```
Simple function: ~1ms
Module (100줄): ~5ms
Large project (10,000줄): ~100ms
```

---

## 🛡️ 안전성 & 신뢰성

### 메모리 안전성

```
정책:
  1. Stack overflow 감지 (SP 검사)
  2. Memory bounds 검사 (LOAD/STORE)
  3. Type safety (컴파일 시 타입 검사)

구현:
  - VM에서 경계 검사
  - Exception 발생 (범위 초과 시)
  - Graceful error handling
```

### Concurrency Safety

```
정책:
  1. No shared mutable state (각 스레드 독립)
  2. Message passing (async queue)
  3. Immutable by default

구현:
  - Move semantics (SPEC_07)
  - Async/await (SPEC_11)
  - Event loop (main_extended.c)
```

### Exception Safety

```
정책:
  1. Try-catch (SPEC_13)
  2. RAII (리소스 자동 정리)
  3. Panic safety (복구 불가능한 오류)

구현:
  - setjmp/longjmp
  - Structured error handling
  - Panic 메커니즘
```

---

## 🔄 확장성 (Extensibility)

### 새로운 명령어 추가

```
Step 1: ISA에 OpCode 추가 (isa.h)
Step 2: VM에 핸들러 구현 (vm.c)
Step 3: Compiler에 생성 규칙 추가 (isa-generator.ts)
Step 4: 테스트 작성
```

### 새로운 StdLib 모듈 추가

```
Step 1: Module 정의 (.free 파일)
Step 2: 함수 인터페이스 정의
Step 3: 구현 (FreeLang 또는 C)
Step 4: index.free에 export
Step 5: 테스트
```

### 새로운 타입 추가

```
Step 1: Type definition (SPEC_06)
Step 2: Parser 규칙 추가
Step 3: Type Checker 규칙 추가
Step 4: ISA Generator 규칙 추가
Step 5: 테스트
```

---

**Last Updated**: 2026-03-03
**Status**: 🎯 Architecture Finalized
