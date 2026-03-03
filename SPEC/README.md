# FreeLang v4 Language Specification

**Language-Independent Definition**

**Version**: 1.0
**Status**: Stable
**Last Updated**: 2026-03-03

---

## 🎯 목적

FreeLang v4는 **특정 런타임 환경에 종속되지 않는 추상적 언어 설계**로 정의됩니다.

이 SPEC 체계는:
- **다양한 구현 환경(TypeScript, C, Go, Rust, Zig 등)에서 동일한 언어 동작을 보장**
- **언어 설계와 구현의 분리**
- **언어 검증 및 형식 명세(Formal Specification)**

를 목표로 합니다.

---

## 📚 SPEC 체계

### Core Specifications (기본 명세)

| SPEC | 제목 | 상태 | 담당 범위 |
|------|------|------|---------|
| **SPEC_04** | Lexer (토큰화) | Stable | 소스코드 → 토큰 스트림 |
| **SPEC_05** | Parser (구문 분석) | Stable | 토큰 → 추상 구문 트리(AST) |
| **SPEC_06** | Type System (타입 시스템) | Stable | 타입 정의, 타입 호환성 |
| **SPEC_07** | Move Semantics (이동 의미론) | Stable | 메모리 소유권, Copy/Move 규칙 |
| **SPEC_08** | Scope & Environment (스코프) | Stable | 변수 바인딩, 환경 관리 |

### Feature Specifications (기능 명세)

| SPEC | 제목 | Phase | 상태 | 파일 |
|------|------|-------|------|------|
| **SPEC_09** | Struct System | 8.1 | ✅ Stable | SPEC_09_STRUCT_SYSTEM.md |
| **SPEC_10** | First-Class Functions | 8.2 | ✅ Stable | SPEC_10_FIRST_CLASS_FUNCTIONS.md |
| **SPEC_11** | Control Flow (while, for...of) | 8.3, 8.4 | ✅ Stable | SPEC_11_CONTROL_FLOW.md |

---

## 📖 SPEC 읽기 가이드

### 1단계: 기본 개념 이해
```
SPEC_04 (Lexer) → SPEC_05 (Parser) → SPEC_06 (Type)
        ↓
SPEC_07 (Move) → SPEC_08 (Scope)
```

**목적**: 언어의 기초 구조와 타입 시스템 이해

### 2단계: 기능별 명세 학습
```
SPEC_09 (Struct) → 복합 자료형 구현
SPEC_10 (Functions) → 고차 프로그래밍
SPEC_11 (Control Flow) → 실행 흐름 제어
```

**목적**: 각 기능의 정확한 동작 규칙 학습

### 3단계: 구현
```
명세 → 참조 구현(TypeScript) → 다른 언어 구현
```

**목적**: 명세를 기반으로 다양한 런타임에서 구현

---

## 🔑 핵심 개념

### 1. Language-Independent Definition

**정의**: 특정 프로그래밍 언어나 런타임 환경에 종속되지 않는 추상적 언어 구조와 동작 규칙

**구성 요소**:
- **문법(Syntax)**: BNF, EBNF로 표현된 기호와 구조
- **의미론(Semantics)**: 실행 시 동작을 수학적으로 정의
- **타입 규칙(Type Rules)**: 타입 검사 규칙 (형식: 자연 추론)
- **제약(Constraints)**: 유효성 검사 및 오류 조건

### 2. 추상 명세의 구성

각 SPEC은 다음 구조를 따릅니다:

```
1. 개념(Concept)
   └─ 언어적 정의, 핵심 특성

2. 문법(Syntax)
   └─ BNF / EBNF 형식

3. 의미론(Semantics)
   └─ 실행 알고리즘, 상태 변화

4. 타입 규칙(Type Rules)
   └─ 자연 추론(Natural Deduction) 형식

5. 제약(Constraints)
   └─ 오류 조건, 유효성 규칙

6. 예제(Examples)
   └─ 명세의 구체적 적용
```

### 3. 다양한 구현의 일관성 보장

**문제**: 다양한 언어에서 구현할 때 동작 차이 발생

**해결책**: 명세에 정의된 의미론을 그대로 따름

```
SPEC 정의 → Implementation A (TypeScript) ✓
         → Implementation B (C) ✓
         → Implementation C (Go) ✓
         → Implementation D (Rust) ✓
```

---

## 📋 각 SPEC의 주요 내용

### SPEC_09: Struct System (구조체 시스템)

**주요 내용**:
- 복합 자료형 정의
- 필드 기반 구조
- 인스턴스 생성과 필드 접근
- Move 의미론 적용

**문제 해결**:
- "필드명 중복은 불가능한가?" → 명확한 제약 정의
- "Struct 초기화 규칙은?" → 의미론으로 정의
- "다른 언어에서 구현 가능한가?" → 추상 명세로 언어 독립성 보장

**참조**: SPEC_06 (타입), SPEC_07 (Move), SPEC_08 (스코프)

---

### SPEC_10: First-Class Functions (일급 함수)

**주요 내용**:
- 함수를 값으로 취급
- 함수 타입 표기
- 고차 함수 (HOF)
- 클로저와 환경 캡처
- 렉시컬 스코핑

**문제 해결**:
- "함수를 변수에 저장하는 방법은?" → 함수 타입과 할당 의미론
- "클로저는 어떻게 동작하는가?" → 환경 캡처 규칙 정의
- "고차 함수는 어떻게 타입 검사하는가?" → 타입 규칙으로 정의

**참조**: SPEC_06 (타입), SPEC_07 (Move), SPEC_08 (스코프)

---

### SPEC_11: Control Flow (제어 흐름)

**주요 내용**:

#### While 루프
- 조건 기반 반복
- 루프 스코프
- break, continue 처리

#### for...of 루프
- 이터러블 순회
- Iterator 프로토콜
- 배열과 문자열 지원
- 루프 변수 불변성

**문제 해결**:
- "while 조건이 항상 참이면?" → 명확한 실행 절차
- "for...of에서 루프 변수를 수정할 수 있는가?" → 불변성 제약 정의
- "break와 continue는 중첩 루프에서 어떻게 동작하는가?" → 의미론으로 정의
- "빈 배열을 순회하면?" → 기저 사례 명시

**참조**: SPEC_06 (타입), SPEC_08 (스코프)

---

## 🔗 상호 참조 맵

```
SPEC_04 (Lexer)
    ↓
SPEC_05 (Parser) ←→ [SPEC_09, SPEC_10, SPEC_11]
    ↓
SPEC_06 (Type System)
    ├─→ [SPEC_09 (Struct 타입), SPEC_10 (Function 타입)]
    ↓
SPEC_07 (Move Semantics)
    ├─→ [SPEC_09 (Struct 이동), SPEC_10 (Function 이동)]
    ↓
SPEC_08 (Scope & Environment)
    ├─→ [SPEC_09 (필드 접근), SPEC_10 (클로저), SPEC_11 (루프 스코프)]
```

---

## 📐 형식 명세 표기법

### BNF / EBNF

```
A → B C          # A는 B 다음에 C로 구성
A → B | C        # A는 B 또는 C
A → B*           # A는 B를 0회 이상 반복
A → B+           # A는 B를 1회 이상 반복
A → B?           # A는 B를 0또는 1회
```

### 자연 추론 (Natural Deduction)

```
        Premise1    Premise2
        ─────────   ──────────
        Conclusion
```

**예시**:
```
⊢ obj: Struct S { ..., name: Type, ... }

⊢ obj.name : Type
```

### 의미론 표기

```
Algorithm: NAME
Input: params
State: state_variables
Output: results

1. Step 1
2. Step 2
   a. Substep a
   b. Substep b
3. Step 3
```

---

## ✅ 검증 체크리스트

명세의 **완성도**를 평가하는 체크리스트:

### 각 SPEC마다

- [ ] 개념 정의 명확
- [ ] 문법(BNF/EBNF) 완전
- [ ] 의미론 알고리즘 상세
- [ ] 타입 규칙 형식화
- [ ] 제약 조건 명시
- [ ] 예제 다양
- [ ] 다른 SPEC과 일관성

### 전체 체계마다

- [ ] 모든 언어 기능 포함
- [ ] 순환 참조 없음
- [ ] 기본 → 응용 순서 일관성
- [ ] 다양한 런타임 구현 가능

---

## 🚀 다음 단계

### Phase 1: 현재 (완료)
✅ SPEC_09, SPEC_10, SPEC_11 작성

### Phase 2: 추가 명세 작성
- [ ] SPEC_12: Pattern Matching (패턴 매칭)
- [ ] SPEC_13: Error Handling (에러 처리)
- [ ] SPEC_14: Standard Library (표준 라이브러리)

### Phase 3: VM/ISA 정의
- [ ] ISA_v1.0: Instruction Set Architecture
- [ ] VM_Execution: 가상 머신 실행 모델

### Phase 4: 다양한 구현
- [ ] C 구현
- [ ] Go 구현
- [ ] Rust 구현

---

## 📞 상호 참조 요청

이 SPEC 체계를 학습하거나 구현할 때:

1. **기본부터 시작**: SPEC_04 → SPEC_05 → SPEC_06
2. **각 SPEC의 "상호 참조" 섹션** 확인
3. **예제 학습**: 각 SPEC의 예제로 개념 이해
4. **다중 언어 구현**: 명세 → 참조 구현(TypeScript) → 다른 언어

---

## 📄 문서 목록

```
SPEC/
├── README.md (this file)
├── SPEC_09_STRUCT_SYSTEM.md
├── SPEC_10_FIRST_CLASS_FUNCTIONS.md
├── SPEC_11_CONTROL_FLOW.md
├── [SPEC_12_PATTERN_MATCHING.md (예정)]
├── [SPEC_13_ERROR_HANDLING.md (예정)]
├── [ISA_v1.0.md (예정)]
```

---

## 📌 핵심 원칙

### 1. 언어 독립성
- **NOT**: "TypeScript에서 구현하는 방법"
- **YES**: "언어 구현에 무관하게 동작하는 추상 규칙"

### 2. 정확성
- BNF/EBNF로 문법 정의
- 자연 추론으로 타입 규칙 정의
- 알고리즘으로 의미론 정의

### 3. 명확성
- 각 규칙의 "왜"를 설명
- 예제로 개념 구체화
- 제약으로 오류 조건 명시

### 4. 일관성
- 모든 SPEC이 동일한 구조 따름
- 상호 참조 명확
- 중복 없음

---

## 🔄 버전 관리

| 버전 | 날짜        | 변경사항                  | 상태     |
|------|-----------|------------------------|---------|
| 1.0  | 2026-03-03 | SPEC_09, 10, 11 초판 작성 | Stable  |

---

## 📧 기여 및 피드백

이 SPEC 체계를 사용하거나 개선하려면:

1. **문제 보고**: 명세의 모호한 부분 지적
2. **개선 제안**: 더 명확한 표현 제시
3. **구현 피드백**: 다양한 언어에서 구현 시 발견사항

---

## 📚 참고 자료

### 형식 명세 학습
- [TaPL: Types and Programming Languages](https://www.cis.upenn.edu/~bcpierce/tapl/)
- [PFPL: Practical Foundations for Programming Languages](https://www.cs.cmu.edu/~rwh/pfpl/)

### 언어 설계
- [Language Design Patterns](https://en.wikipedia.org/wiki/Programming_language_design)
- [ISO/IEC 14977: EBNF](https://www.iso.org/standard/26153.html)

---

**FreeLang v4는 순수하게 추상적 언어로서, 다양한 런타임 환경에서 동일한 동작을 보장합니다.**

🎯 **Language-Independent. Implementation-Agnostic. Formally Specified.**
