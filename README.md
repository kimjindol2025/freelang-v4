# FreeLang v4

**Language-Independent Programming Language Definition**

> "추상적 언어 설계로, 다양한 런타임(C, Go, Rust, Zig 등)에서 동일한 동작을 보장한다."

**Status**: ✅ Phase 8.4 완료 (Language-Independent SPEC 정의 완료)

---

## 🎯 개요

**FreeLang v4**는:
- **일급 함수, 구조체, while/for...of, 패턴 매칭**을 지원하는 **정적 타입 언어**
- **null 없음, 묵시적 변환 없음, use-after-move 컴파일 에러**
- **특정 런타임에 종속되지 않는 추상 명세(Language-Independent Definition)**로 정의

```
source.fl → Lexer → Parser → TypeChecker → [Compiler → VM (구현 선택)]
```

---

## 🚀 빠른 시작

```bash
# TypeScript 참조 구현
npm run build
npm test

# 예제 실행
npx ts-node src/main.ts examples/hello.fl
```

---

## 💡 코드 예시

### Struct (Phase 8.1)
```freelang
struct Point { x: f64, y: f64 }
var p = Point { x: 1.0, y: 2.0 }
var dist = sqrt(p.x * p.x + p.y * p.y)
```

### 일급 함수 & 고차 함수 (Phase 8.2)
```freelang
var add: fn(i32, i32) -> i32 = fn(a, b) -> i32 { a + b }
var multiply: fn(i32, i32) -> i32 = fn(a, b) -> i32 { a * b }

fn apply(f: fn(i32, i32) -> i32, x: i32, y: i32) -> i32 {
  return f(x, y)
}

var result = apply(add, 3, 4)  // 7
```

### While & for...of (Phase 8.3, 8.4)
```freelang
var i = 0
while i < 5 {
  println(str(i))
  i = i + 1
}

for x of [1, 2, 3, 4, 5] {
  println(str(x * 2))
}

for ch of "hello" {
  println(ch)
}
```

---

## ✨ 핵심 기능

| 기능 | 내용 | Phase |
|------|------|-------|
| **타입 시스템** | i32, i64, f64, bool, string, [T], struct, fn, Option\<T\>, Result\<T,E\> | 1-6 |
| **메모리 관리** | Scope Drop + Move semantics (GC 없음) | 7 |
| **구조체** | 필드 정의, 인스턴스 생성, 필드 접근 | **8.1** ✅ |
| **일급 함수** | 함수 리터럴, 고차 함수, 클로저 | **8.2** ✅ |
| **루프 & 제어** | while, for...in, for...of, break, continue | **8.3-8.4** ✅ |
| **패턴 매칭** | match + 7종 패턴 (예정) | 8.5 |
| **에러 처리** | Result\<T,E\> + ? 연산자, panic | 8.6 |
| **동시성** | Actor + Channel (계획) | Phase 9 |

## 📊 구현 현황

### 1부: 형식 명세 (SPEC) - ✅ 완료

| SPEC | 제목 | 내용 | 상태 |
|------|------|------|------|
| SPEC_04-08 | 기본 명세 | Lexer, Parser, Type, Memory, Scope | ✅ Stable |
| **SPEC_09** | **Struct System** | **복합 자료형 (Phase 8.1)** | **✅ Stable** |
| **SPEC_10** | **First-Class Functions** | **함수 리터럴, 고차 함수, 클로저 (Phase 8.2)** | **✅ Stable** |
| **SPEC_11** | **Control Flow** | **while, for...of, break, continue (Phase 8.3-8.4)** | **✅ Stable** |

**특징**: Language-Independent Definition (다양한 런타임 구현 가능)

### 2부: TypeScript 참조 구현 (8 Phases 완료)

| Phase | 기능 | 파일 | LOC | Tests | 상태 |
|-------|------|------|-----|-------|------|
| 1-3 | 기본 (Lexer, Parser, TypeChecker) | 3개 | ~2,100 | ~200 | ✅ |
| 4-7 | Compiler, VM, Stdlib | 4개 | ~4,000 | ~130 | ✅ |
| **8.1** | **Struct System** | `ast.ts`, `parser.ts`, `checker.ts` | +80 | **25/25** ✅ |
| **8.2** | **First-Class Functions** | 동일 파일들 | +120 | **25/25** ✅ |
| **8.3** | **While Loops** | 동일 파일들 | +60 | **18/18** ✅ |
| **8.4** | **for...of Loops** | 동일 파일들 | +70 | **20/20** ✅ |
| **합계** | | | **~6,400** | **~423** | ✅ 100% |

## 📁 프로젝트 구조

```
freelang-v4/
├── SPEC/                           # Language-Independent SPEC 문서
│   ├── README.md                   # SPEC 체계 및 학습 가이드
│   ├── SPEC_09_STRUCT_SYSTEM.md    # 구조체 (Phase 8.1)
│   ├── SPEC_10_FIRST_CLASS_FUNCTIONS.md  # 일급 함수 (Phase 8.2)
│   └── SPEC_11_CONTROL_FLOW.md     # 루프 제어 (Phase 8.3-8.4)
├── src/
│   ├── lexer.ts                    # 토큰화 (50 토큰, 18 키워드)
│   ├── ast.ts                      # AST 노드 정의
│   ├── parser.ts                   # RD + Pratt 파서 (Struct, Functions, Loops)
│   ├── checker.ts                  # 타입 체커 (Move/Copy + Struct/Functions)
│   ├── compiler.ts                 # AST → 바이트코드 (45 opcodes)
│   ├── vm.ts                       # Stack VM + stdlib (50 내장 함수)
│   ├── main.ts                     # CLI 진입점
│   ├── for-of.test.ts              # for...of 테스트 (20/20 ✅)
│   └── [struct.test.ts, function-literal.test.ts, while-loop.test.ts, ...]
├── examples/
│   ├── hello.fl
│   ├── factorial.fl
│   └── fizzbuzz.fl
├── dist/                           # 컴파일된 JavaScript
├── tsconfig.json
├── package.json
└── README.md
```

---

## ✅ 테스트 현황

```bash
npm run build          # TypeScript → JavaScript 컴파일
npm test              # 전체 테스트 실행
```

### 테스트 통계

| Phase | 테스트 파일 | 통과 | 실패 | 상태 |
|-------|----------|------|------|------|
| 1-3 | lexer, parser, checker | ~200 | 0 | ✅ |
| 4-7 | compiler, vm | ~130 | 0 | ✅ |
| **8.1** | **struct.test.ts** | **25/25** | **0** | **✅** |
| **8.2** | **function-literal.test.ts** | **25/25** | **0** | **✅** |
| **8.3** | **while-loop.test.ts** | **18/18** | **0** | **✅** |
| **8.4** | **for-of.test.ts** | **20/20** | **0** | **✅** |
| **합계** | | **~423/423** | **0** | **✅ 100%** |

---

## 🔍 Language-Independent SPEC의 의미

### 1. 추상 명세 (Abstract Specification)

FreeLang v4는 **TypeScript 구현과 독립적으로** BNF, 의미론, 타입 규칙으로 정의됨.

```
SPEC (언어 독립)
  ├─→ TypeScript 구현 (참조 구현)
  ├─→ C 구현 (가능)
  ├─→ Go 구현 (가능)
  └─→ Rust 구현 (가능)

결과: 모든 구현에서 동일한 언어 동작 보장
```

### 2. 형식 명세 (Formal Specification)

각 SPEC은 다음을 포함:
- **BNF/EBNF**: 문법 정의
- **의미론**: 실행 알고리즘
- **타입 규칙**: 자연 추론(Natural Deduction)
- **제약**: 오류 조건 및 유효성

### 3. 다중 구현 가능 (Implementation Agnostic)

언어 설계자가 아닌 **다른 개발자도** SPEC을 읽고 자신의 언어로 구현 가능.

---

## 📈 구현 로드맵

### ✅ 완료 (Phase 8.4)
- [x] Struct System
- [x] First-Class Functions
- [x] While & for...of Loops
- [x] Language-Independent SPEC

### 🔄 진행 중
- [ ] Pattern Matching (SPEC_12, Phase 8.5)
- [ ] Error Handling (SPEC_13, Phase 8.6)

### 🚀 계획
- [ ] Standard Library Definition (SPEC_14)
- [ ] ISA v1.0 (Instruction Set Architecture)
- [ ] C 구현 (기존 c-server 기반)
- [ ] 성능 최적화 (레지스터 할당, JIT)
- [ ] 표준 라이브러리 (파일 I/O, 네트워킹, 암호화)

---

## 📊 총 규모

```
SPEC 문서: ~3,000 LOC (형식 명세)
TypeScript: ~6,400 LOC (참조 구현)
테스트:     ~423 assertions (100% 통과)

총합:      ~9,400 LOC + 423 tests
```
