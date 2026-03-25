# 📦 FreeLang V4 폴더 구조 및 빠른 가이드

**최종 업데이트**: 2026-03-26
**버전**: v1.0-STABLE
**총 코드**: ~12,412줄

---

## 🎯 빠른 네비게이션

### 핵심 파일 (5분 안에 이해)
```
src/main.ts              ← CLI 진입점 (freelang 명령어)
  ├─ src/lexer.ts       ← 토큰화 (문자 → 토큰)
  ├─ src/parser.ts      ← 파싱 (토큰 → AST)
  ├─ src/checker.ts     ← 타입 검사 (타입 검증)
  ├─ src/compiler.ts    ← 컴파일 (AST → 바이트코드)
  └─ src/vm.ts          ← 실행 (바이트코드 → 결과)
```

### 폴더 구조
```
freelang-v4/
├─ src/
│  ├─ main.ts           (53줄) - CLI 진입점
│  ├─ lexer.ts          (200줄) - 토큰화
│  ├─ parser.ts         (400줄) - AST 생성
│  ├─ checker.ts        (600줄) - 타입 검사
│  ├─ compiler.ts       (800줄) - 바이트코드 생성
│  ├─ vm.ts             (700줄) - 스택 VM 실행
│  ├─ ast.ts            (100줄) - AST 타입 정의
│  ├─ ir-gen.ts         (200줄) - IR 중간 표현 생성
│  ├─ ir.ts             (150줄) - IR 타입 정의
│  │
│  ├─ runtime/
│  │  ├─ vm.ts          (실행 엔진 상세 구현)
│  │  ├─ bytecode.ts    (바이트코드 인코딩/디코딩)
│  │  └─ value.ts       (런타임 값 타입)
│  │
│  ├─ [테스트 파일들]
│  │  ├─ lexer.test.ts
│  │  ├─ parser.test.ts
│  │  ├─ checker.test.ts
│  │  ├─ compiler.test.ts
│  │  ├─ vm.test.ts
│  │  ├─ *-jest.test.ts (Jest 테스트)
│  │  └─ ...
│  │
│  └─ [데이터베이스 테스트]
│     ├─ db-100m-full.ts
│     ├─ db-100m-streaming.ts
│     └─ ...
│
├─ dist/                 ← 빌드 결과물 (JavaScript + source maps)
│  ├─ main.js
│  ├─ lexer.js
│  ├─ parser.js
│  ├─ checker.js
│  ├─ compiler.js
│  ├─ vm.js
│  └─ ... (모든 .ts 파일의 .js 버전)
│
├─ package.json          ← npm 설정 (bin: freelang)
├─ tsconfig.json         ← TypeScript 설정
├─ jest.config.js        ← Jest 테스트 설정
├─ LANGUAGE_INDEPENDENT_SPEC.md  ← 언어 정식 스펙
├─ STATUS.md             ← 현재 상태 리포트
├─ README.md             ← 사용 가이드
├─ STRUCTURE.md          ← 이 파일
└─ CLAUDE.md             ← Claude AI 가이드
```

---

## 🔄 파이프라인 흐름

### 코드 실행 흐름 (한눈에)

```
freelang code.fl
    │
    ├─1. Lexer (src/lexer.ts)
    │   "let x = 10;" → [LET, IDENT, ASSIGN, NUMBER, ...]
    │
    ├─2. Parser (src/parser.ts)
    │   [LET, IDENT, ...] → { type: 'VarDecl', name: 'x', value: 10 }
    │
    ├─3. TypeChecker (src/checker.ts)  [선택사항: --no-check]
    │   AST → 타입 검증 (i32, string, bool 등)
    │
    ├─4. Compiler (src/compiler.ts)
    │   AST → 바이트코드 (OpCode 시퀀스)
    │   OpCode: CONST, STORE, ADD, CALL, RETURN 등
    │
    └─5. VM (src/vm.ts)
        바이트코드 → 스택 기반 실행 → 결과 출력
```

### 예: `println("Hello")`

```
Input: println("Hello");

1. Lexer
   → [IDENT("println"), LPAREN, STRING("Hello"), RPAREN, SEMICOLON]

2. Parser
   → { type: 'ExprStmt', expr: { type: 'Call', name: 'println', args: ["Hello"] } }

3. TypeChecker
   → println 함수 검증 (string 파라미터 확인)

4. Compiler
   → [CONST "Hello", CALL println]

5. VM
   → 스택에 "Hello" push → println 함수 호출 → "Hello" 출력
```

---

## 📊 파일 크기 및 역할

| 파일 | 줄수 | 역할 | 난이도 |
|------|------|------|--------|
| **main.ts** | 50 | CLI 진입점 | ⭐ |
| **lexer.ts** | 200 | 토큰화 | ⭐⭐ |
| **parser.ts** | 400 | 파싱 (AST 생성) | ⭐⭐⭐ |
| **checker.ts** | 600 | 타입 검사 | ⭐⭐⭐ |
| **compiler.ts** | 800 | 바이트코드 생성 | ⭐⭐⭐⭐ |
| **vm.ts** | 700 | 실행 엔진 | ⭐⭐⭐⭐ |
| **ir-gen.ts** | 200 | IR 생성 | ⭐⭐⭐ |
| **ir.ts** | 150 | IR 타입 | ⭐⭐ |
| **ast.ts** | 100 | AST 타입 정의 | ⭐ |

---

## 🧪 테스트 구조

### Jest 테스트 (권장)
```
src/vm-jest.test.ts        ← 81개 테스트 (47.58% 커버리지)
src/compiler-jest.test.ts  ← 42개 테스트 (46.52% 커버리지)
src/checker-jest.test.ts   ← 23개 테스트 (53.75% 커버리지)
src/parser-jest.test.ts    ← 25개 테스트 (70.48% 커버리지)
```

### 단위 테스트 (ts-node용)
```
src/lexer.test.ts
src/parser.test.ts
src/checker.test.ts
src/compiler.test.ts
src/vm.test.ts
```

### 통합 테스트
```
src/struct.test.ts
src/struct-jest.test.ts
src/function-literal.test.ts
src/for-of.test.ts
src/while-loop.test.ts
```

### 벤치마크 테스트
```
src/db-100m-full.ts        ← 100M 행 데이터베이스 (인덱스 O)
src/db-100m-no-index.ts    ← 100M 행 (인덱스 X)
src/db-100m-streaming.ts   ← 스트리밍 모드
```

---

## 🚀 빠른 시작

### 1. 코드 읽기 (이 순서대로)
```
1. src/main.ts          (진입점 이해)
2. src/ast.ts           (데이터 구조)
3. src/lexer.ts         (토큰화)
4. src/parser.ts        (파싱)
5. src/compiler.ts      (컴파일)
6. src/vm.ts            (실행)
7. src/checker.ts       (타입 체크)
```

### 2. 테스트 실행
```bash
npm test                # Jest 테스트 실행 (모든 파일)
npm test -- vm          # VM 테스트만
npm test -- compiler    # Compiler 테스트만
npm test -- --coverage  # 커버리지 리포트
```

### 3. 코드 실행
```bash
npm start code.fl       # 코드 파일 실행
node dist/main.js code.fl  # CLI 직접 실행
```

---

## 🔑 핵심 개념 (30초 정리)

### 1. **AST (Abstract Syntax Tree)**
코드를 트리 구조로 변환
```
let x = 10;
        ↓
  VarDecl
   /    \
  x      10
```

### 2. **OpCode (Operation Code)**
바이트코드: 실행 명령어
```
OpCode.CONST      → 상수 로드
OpCode.STORE      → 변수 저장
OpCode.LOAD       → 변수 로드
OpCode.ADD        → 더하기
OpCode.CALL       → 함수 호출
OpCode.RETURN     → 반환
```

### 3. **스택 VM (Virtual Machine)**
메모리 스택에서 값을 push/pop하며 실행
```
CONST 10    → 스택: [10]
CONST 20    → 스택: [10, 20]
ADD         → 스택: [30]
PRINT       → 출력: 30
```

### 4. **Type System**
`i32`, `f64`, `string`, `bool`, `array`, `struct`
- 변수는 선언 시 타입 명시 (또는 추론)
- 타입 검사 필수 (--no-check로 스킵 가능)

---

## 📚 참고 문서

| 문서 | 목적 |
|------|------|
| **LANGUAGE_INDEPENDENT_SPEC.md** | 언어 공식 정의 (문법, 타입 시스템, 의미론) |
| **STATUS.md** | 현재 상태 및 완성도 리포트 |
| **README.md** | 사용자 가이드 |
| **STRUCTURE.md** | 폴더 구조 (이 파일) |

---

## ⚡ 자주 찾는 것

### "특정 기능은 어디에 있나?"

| 찾는 것 | 파일 | 라인 |
|--------|------|------|
| `println` 구현 | vm.ts | 빌트인 함수 목록 |
| `let` 키워드 | lexer.ts → parser.ts | 변수 선언 |
| 타입 검사 | checker.ts | TypeChecker.check() |
| 배열 지원 | compiler.ts | ARRAY_SET/ARRAY_GET |
| 함수 호출 | compiler.ts | CALL 명령어 |
| 에러 처리 | checker.ts, compiler.ts | 에러 배열 반환 |

### "코드를 수정하려면?"

1. **언어 문법 추가** → `parser.ts` 수정
2. **새 OpCode 추가** → `compiler.ts`, `vm.ts` 수정
3. **타입 규칙 추가** → `checker.ts` 수정
4. **빌트인 함수 추가** → `vm.ts`의 `case 'function_name':` 추가

---

## 🎓 학습 경로

### Level 1: 이해 (1-2시간)
- [ ] main.ts 읽기
- [ ] 파이프라인 흐름 이해
- [ ] 간단한 예제 (println, 산술) 작동 확인

### Level 2: 분석 (3-5시간)
- [ ] lexer.ts → parser.ts → compiler.ts 읽기
- [ ] 각 단계에서 데이터 변환 이해
- [ ] 테스트 케이스 분석

### Level 3: 수정 (5-10시간)
- [ ] 버그 수정 시도
- [ ] 새 기능 추가 (예: 새 연산자)
- [ ] 테스트 작성

### Level 4: 확장 (10+ 시간)
- [ ] 새 언어 기능 (채널, async 등)
- [ ] 최적화 (JIT, 캐싱)
- [ ] 표준 라이브러리 확대

---

## 🔗 다른 프로젝트와의 연결

```
freelang-v4/          ← 이 폴더
    ↓ (dist/에서 npm 모듈로 제공)
freelang-playground/  ← Playground IDE가 이것을 사용
    ↓ (require('./freelang-runner.js'))
웹 브라우저에서 FreeLang 코드 실행 가능
```

---

**이 파일을 북마크하세요!** 🔖
V4 폴더에 오면 항상 이 파일을 먼저 읽고 시작하세요.
