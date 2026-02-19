# FreeLang v1/v2/v3 실패 분석 → v4 교훈

## 수치 비교

| 항목 | v1 | v2 | v3 | v4 |
|------|-----|-----|-----|-----|
| 소스 파일 | 304 | 344 | 94 | 11 |
| 소스 LOC | 109,515 | 115,628 | 34,905 | 5,764 |
| 커밋 | 406 | 402 | 73 | 21 |
| Phase | 25 | 24 | 9 | 6 |
| 폴더 (src/) | 32 | 55 | 1 (flat) | 1 |
| 테스트 결과 | 140 실패 | OOM Killed | 9 통과 | **0 실패 (334)** |
| 파서 개수 | 1 (split) | 6 | 1 | 1 (699줄) |
| 디스크 | 317 MB | ~300 MB | ~5 MB | ~1 MB |

## v1 실패 원인

### 1. 컴파일러가 5개 (어느 것도 미완성)
- `src/compiler/` — SimpleParser + CGenerator (토이 수준)
- `src/parser/` — 2,132줄 (별도)
- `src/vm/` — compiler.ts + vm.ts (별도)
- `src/interpreter/` — 2,887줄 (별도)
- `src/codegen/` — LLVM, C, multi-backend (별도)

파이프라인이 연결 안 됨. 각각 독립적으로 존재.

### 2. 토크나이저가 정규식 split
```typescript
// v1: 공백 포함 문자열 깨짐, 2글자 연산자 미처리
const parts = trimmed.replace(/([(){}\[\];:,])/g, ' $1 ').split(/\s+/);
```

### 3. stdlib 159개 파일이 전부 TypeScript 래퍼
```typescript
// FreeLang 코드에서 호출 경로 없음
static abs(x: number): number { return globalThis.Math.abs(x); }
```

### 4. Phase 10에서 v1.0.0 선언 후 Phase 25까지 무한 확장
Swagger, ORM, MongoDB, gRPC, WebSocket, CI/CD... 마지막 커밋이 Phase 25 Revert.

### 5. 테스트 10.5% 실패 (140/1,338), 6분 40초 소요

## v2 실패 원인

### 1. v1보다 폴더 더 늘어남 (32 → 55)
`type-checker/`, `type-system/`, `types/` 3개 공존. `analyzer/`에 38개 파일.

### 2. 파서 6개 (안 되면 새로 만들기 반복)
```
parser.ts           1,397줄
one-pass-parser.ts    819줄
partial-parser.ts     675줄
block-parser.ts       459줄
async-parser.ts       359줄
expression-completer  613줄
합계:               5,279줄
```

### 3. Phase 폴더가 src/ 안에 16개 혼재
```
src/phase-6/ src/phase-8/ src/phase-9/ src/phase-10/ (2.5MB!)
src/phase-11/ ~ src/phase-24/
```
작업 단위와 코드 구조 구분 불가.

### 4. 테스트 OOM Killed (82,386줄 테스트가 메모리 초과로 끝까지 못 돌아감)

## v3 실패 원인

### 1. 규모는 줄었지만 (34,905 LOC) 73커밋에 Phase 9까지 확장
### 2. CSI (Claude Self-Interrogation) 등 언어 외 기능에 집중
### 3. "v3.0.0 Release Ready" 선언 후에도 계속 기능 추가
### 4. 테스트 9개뿐 (커버리지 부족)

## v4가 다르게 한 것

| 문제 | v1/v2/v3 | v4 |
|------|---------|-----|
| 설계 | 코드부터 침 | **설계 10 Step 먼저** |
| 파이프라인 | 분리/중복 | **1개 연결 (Lexer→Parser→Checker→Compiler→VM)** |
| 범위 | Phase 무한 확장 | **6 Phase로 끝** |
| 파서 | 여러 개 (안 되면 새로) | **1개 (RD+Pratt, 699줄)** |
| 폴더 | 32~55개 | **src/ 1개 (11파일)** |
| 테스트 | 실패/OOM/부족 | **334개 0 실패** |
| 완성 | 미완성 | **E2E 실행 (factorial, fizzbuzz, fibonacci)** |

## 핵심 교훈

```
v1: "만들면서 설계하자" → 파이프라인 미연결
v2: "v1 교훈으로 더 잘 하자" → v1보다 더 비대해짐
v3: "이번엔 작게 하자" → 그래도 Phase 9까지 확장
v4: "설계 먼저. 6 Phase. 끝." → 5,764 LOC에 334 tests 0 failures
```

## v5 참고 자료

- **AST Patterns**: https://gogs.dclub.kr/kim/ast-patterns.git
  - 8가지 AST 구현 패턴 (Classic Tree, Tagged Union, Flat, Arena, Immutable, Green-Red Tree 등)
  - v4는 #2 Tagged Union 사용 중
  - v5 성능 최적화 시 #4 Flat AST 또는 #5 Arena AST 검토
