# SPEC_09: Struct System (구조체 시스템)

**Version**: 1.0
**Status**: Stable
**Phase**: 8.1
**Date**: 2026-03-03

---

## 목차
1. [개념](#개념)
2. [문법](#문법)
3. [의미론](#의미론)
4. [타입 규칙](#타입-규칙)
5. [제약](#제약)
6. [예제](#예제)

---

## 개념

**Struct**는 관련된 데이터 항목들을 **하나의 이름 단위로 묶는 복합 자료형**입니다.

### 핵심 특성
- **필드 기반**: 이름과 타입으로 정의된 필드의 집합
- **타입 안전성**: 각 필드는 명시적 타입 선언 필수
- **구조적 동등성**: 동일한 필드 구조 = 동일한 타입 (구조적 타입 체계)
- **값 타입**: Struct 인스턴스는 값으로 취급 (Move 의미론 적용)

---

## 문법

### 1. Struct 선언

```
StructDecl = "struct" IDENT "{" FieldDeclList "}"

FieldDeclList = ε | Field ("," Field)*

Field = IDENT ":" TypeAnnotation
```

### 2. Struct 인스턴스 생성 (Struct Literal)

```
StructLit = IDENT "{" FieldInitList "}"

FieldInitList = ε | FieldInit ("," FieldInit)*

FieldInit = IDENT ":" Expr
```

### 3. 필드 접근

```
FieldAccess = Expr "." IDENT
```

---

## 의미론

### 규칙 1: Struct 선언 (Definition)

**입력**: StructDecl
**처리**:
1. Struct 이름 IDENT를 현재 스코프에 등록
2. 각 Field의 이름과 타입을 Struct 정의에 저장
3. 같은 이름의 Struct 중복 선언 → **오류**

**출력**: Struct 타입 등록 완료

---

### 규칙 2: Struct 인스턴스 생성

**입력**: StructLit (구조체명 + 필드 값들)
**처리**:
1. 구조체명이 정의되어 있는지 확인
2. 필드 초기값을 순서대로 평가
3. 제공된 필드 수 = 정의된 필드 수 확인
   - 부족 → **오류**: 필드 누락
   - 초과 → **오류**: 정의되지 않은 필드
4. 각 필드값의 타입이 정의된 타입과 일치하는지 확인
5. 모든 검사 통과 → Struct 값 생성

**출력**: Struct 인스턴스 (메모리상 필드 값들의 연속)

---

### 규칙 3: 필드 접근

**입력**: FieldAccess (객체.필드명)
**처리**:
1. 객체의 타입이 Struct인지 확인
2. 필드명이 Struct 정의에 존재하는지 확인
3. 필드의 타입 반환

**출력**: 필드값 및 그 타입

---

### 규칙 4: Struct 할당 및 이동

**입력**: Struct 값의 변수 할당
**처리**:
1. Struct는 **Move 타입** (SPEC_07 참조)
2. 할당 시 **소유권 이전** (Move)
   - 이전 변수는 더 이상 접근 불가
3. 함수 인자로 전달 시 이동 의미론 적용
4. 함수 반환값도 이동

**제약**: Copy 타입이 아니므로 명시적 이동만 허용

---

## 타입 규칙

### T-StructDecl (Struct 선언)

```
Field_i = (name_i: Type_i) for i = 1..n

Struct S { Field_1, Field_2, ..., Field_n } ⊢
  S: Struct { name_1: Type_1, name_2: Type_2, ..., name_n: Type_n }
```

### T-StructLit (Struct 인스턴스)

```
Struct S { name_1: Type_1, ..., name_n: Type_n } ⊢
  ⊢ init_i: Type_i  for i = 1..n

⊢ S { name_1: init_1, ..., name_n: init_n } : S
```

### T-FieldAccess (필드 접근)

```
⊢ obj: Struct S { ..., name: Type, ... }

⊢ obj.name : Type
```

---

## 제약

### C1. 필드 이름 중복 금지

```
Struct S {
    x: i32
    x: f64  // ❌ 오류: 필드명 중복
}
```

### C2. 타입 위반 금지

```
Struct Point { x: f64, y: f64 }
var p = Point { x: 1, y: 2.0 }  // ❌ 오류: x는 f64, 1은 i32
```

### C3. 필드 누락/초과 금지

```
Struct Person { name: string, age: i32 }
var p1 = Person { name: "Alice" }           // ❌ 오류: age 필드 누락
var p2 = Person { name: "Bob", age: 30, id: 1 }  // ❌ 오류: id 필드 정의 없음
```

### C4. 구조체는 값 타입

```
var s1 = Point { x: 1.0, y: 2.0 }
var s2 = s1  // s1의 소유권이 s2로 이동
var s3 = s1  // ❌ 오류: s1은 이미 moved
```

### C5. 중첩 Struct 가능

```
Struct Address { street: string, city: string }
Struct Person { name: string, address: Address }
```

---

## 예제

### 예제 1: 기본 Struct 선언 및 인스턴스

**의도**: 2D 좌표를 나타내는 Point 구조체

**의미론**:
- Point Struct 정의: x, y 필드 (각 f64)
- Point 인스턴스 생성: p1, p2
- 필드 접근: p1.x, p1.y

**제약 확인**:
- 필드 이름 중복 없음 ✓
- 필드 타입 일치 ✓
- 모든 필드 제공됨 ✓

---

### 예제 2: 중첩 Struct

**의도**: Address를 포함하는 Person 구조체

**의미론**:
- Address는 Struct ✓
- Person.address는 Address 타입 ✓
- 중첩된 필드 접근: person.address.city

**제약 확인**:
- 타입 정의 순서 (Address → Person) ✓

---

### 예제 3: Struct 이동 의미론

**의도**: Struct는 Move 타입임을 검증

**의미론**:
- s1 생성 시 Point 메모리 할당
- s2 = s1: s1의 소유권 → s2로 이동
- s1 이후 접근 불가능

**제약**:
- Move 타입 검증 필수 ✓

---

## 상호 참조

- **SPEC_06**: 타입 시스템 (Struct 타입의 정의)
- **SPEC_07**: Move 의미론 (Struct는 Move 타입)
- **SPEC_08**: 스코프 관리 (Struct 선언의 스코프 규칙)
- **SPEC_11**: 제어 흐름 (Struct와 조건/반복문)

---

## 변경 이력

| 버전 | 날짜        | 변경사항        |
|------|-----------|-------------|
| 1.0  | 2026-03-03 | 초판 작성      |

---

## 참고: AST 매핑 (참조 구현)

이 명세는 다음과 같이 AST로 구현됩니다:

```typescript
// Struct 선언
type StructDecl = {
  kind: "struct_decl"
  name: string
  fields: Array<{ name: string, type: TypeAnnotation }>
}

// Struct 인스턴스
type StructLit = {
  kind: "struct_lit"
  structName: string
  fields: Array<{ name: string, value: Expr }>
}

// 필드 접근
type FieldAccess = {
  kind: "field_access"
  object: Expr
  field: string
}
```
