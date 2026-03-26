# FreeLang v4 - Pratt Parser 설계도

## 수정 이력
- LL(1) 주장 → ❌ 삭제
- Recursive Descent Expression → Pratt Parser로 교체
- 파서 분류: **Deterministic Recursive Descent + Pratt Expression**

---

## Pratt Parser란

Vaughan Pratt (1973). Top-Down Operator Precedence.

핵심 아이디어:
- 각 토큰에 **Binding Power(BP)** 부여
- **Null Denotation(nud)**: 토큰이 prefix 위치일 때
- **Left Denotation(led)**: 토큰이 infix 위치일 때
- BP 비교로 우선순위 자동 해결

```
RD의 문제: IDENTIFIER 만나면 분기 불가 (call? index? assign?)
Pratt 해결: IDENTIFIER는 nud로 처리, 그 뒤 토큰이 led로 분기
```

---

## Binding Power 테이블

| BP | 연산자 | 결합 | 분류 |
|----|--------|------|------|
| 10 | `=` | right | assignment |
| 20 | `\|\|` | left | logical_or |
| 30 | `&&` | left | logical_and |
| 40 | `==` `!=` | left | equality |
| 50 | `<` `>` `<=` `>=` | left | comparison |
| 60 | `+` `-` | left | additive |
| 70 | `*` `/` `%` | left | multiplicative |
| 80 | `**` | right | power |
| 90 | `!` `-` `+` (unary) | prefix | unary |
| 100 | `()` `[]` `.` `?` | left | postfix |

---

## 핵심 함수: parseExpr(minBP)

```typescript
parseExpr(minBP: number = 0): Expression {
  // 1. nud: prefix 처리
  let left = this.nud()

  // 2. led: infix/postfix 반복
  while (this.getBP(this.current()) > minBP) {
    left = this.led(left)
  }

  return left
}
```

이 함수 하나로 모든 우선순위가 자동 처리됩니다.

---

## Null Denotation (nud) - prefix 위치

토큰이 식의 시작에 있을 때 호출.

```typescript
nud(): Expression {
  const token = this.current()

  switch (token.type) {
    // --- Literals ---
    case 'INTEGER':
      this.advance()
      return { kind: 'IntLiteral', value: parseInt(token.value) }

    case 'FLOAT':
      this.advance()
      return { kind: 'FloatLiteral', value: parseFloat(token.value) }

    case 'STRING':
      this.advance()
      return { kind: 'StringLiteral', value: token.value }

    case 'TRUE':
    case 'FALSE':
      this.advance()
      return { kind: 'BoolLiteral', value: token.type === 'TRUE' }

    // --- Identifier ---
    case 'IDENTIFIER':
      this.advance()
      return { kind: 'Identifier', name: token.value }

    // --- Unary prefix: !, -, + ---
    case 'BANG':
    case 'MINUS':
    case 'PLUS':
      this.advance()
      const operand = this.parseExpr(90) // BP 90 = unary
      return { kind: 'UnaryExpr', op: token.value, operand }

    // --- Grouped: (expr) ---
    case 'LPAREN':
      this.advance()
      const expr = this.parseExpr(0)
      this.expect('RPAREN')
      return expr

    // --- Array literal: [a, b, c] ---
    case 'LBRACKET':
      return this.parseArrayLiteral()

    // --- Map literal: { key: val } ---
    case 'LBRACE':
      return this.parseMapLiteral()

    // --- If expression ---
    case 'IF':
      return this.parseIfExpr()

    // --- Match expression ---
    case 'MATCH':
      return this.parseMatchExpr()

    // --- Spawn expression ---
    case 'SPAWN':
      return this.parseSpawnExpr()

    default:
      this.error(`Unexpected token in expression: ${token.type}`)
      return { kind: 'Error' }
  }
}
```

---

## Left Denotation (led) - infix/postfix 위치

왼쪽에 이미 파싱된 식이 있을 때 호출.

```typescript
led(left: Expression): Expression {
  const token = this.current()

  switch (token.type) {
    // --- Binary operators ---
    case 'PLUS': case 'MINUS':
    case 'STAR': case 'SLASH': case 'PERCENT':
    case 'EQ_EQ': case 'BANG_EQ':
    case 'LT': case 'GT': case 'LE': case 'GE':
    case 'AND_AND': case 'OR_OR': {
      const bp = this.getBP(token)
      this.advance()
      const right = this.parseExpr(bp) // left-assoc: bp, right-assoc: bp-1
      return { kind: 'BinaryExpr', op: token.value, left, right }
    }

    // --- Power (right-associative) ---
    case 'STAR_STAR': {
      const bp = this.getBP(token)
      this.advance()
      const right = this.parseExpr(bp - 1) // right-assoc
      return { kind: 'BinaryExpr', op: '**', left, right }
    }

    // --- Assignment (right-associative, no chaining enforced in semantic) ---
    case 'ASSIGN': {
      this.advance()
      const right = this.parseExpr(9) // BP 10 - 1 = right-assoc
      // Semantic check: left must be assignable (Identifier, Index, FieldAccess)
      return { kind: 'AssignExpr', target: left, value: right }
    }

    // --- Function call: expr(args) ---
    case 'LPAREN': {
      this.advance()
      const args = this.parseArgs()
      this.expect('RPAREN')
      return { kind: 'CallExpr', callee: left, args }
    }

    // --- Array index: expr[index] ---
    case 'LBRACKET': {
      this.advance()
      const index = this.parseExpr(0)
      this.expect('RBRACKET')
      return { kind: 'IndexExpr', object: left, index }
    }

    // --- Field access / method call: expr.field or expr.method(args) ---
    case 'DOT': {
      this.advance()
      const field = this.expect('IDENTIFIER').value

      if (this.current().type === 'LPAREN') {
        // Method call
        this.advance()
        const args = this.parseArgs()
        this.expect('RPAREN')
        return { kind: 'MethodCallExpr', object: left, method: field, args }
      }

      return { kind: 'FieldAccessExpr', object: left, field }
    }

    // --- Try operator: expr? ---
    case 'QUESTION': {
      this.advance()
      return { kind: 'TryExpr', expr: left }
    }

    default:
      this.error(`Unexpected infix token: ${token.type}`)
      return left
  }
}
```

---

## Binding Power 조회

```typescript
getBP(token: Token): number {
  switch (token.type) {
    case 'ASSIGN':                       return 10
    case 'OR_OR':                        return 20
    case 'AND_AND':                      return 30
    case 'EQ_EQ': case 'BANG_EQ':        return 40
    case 'LT': case 'GT':
    case 'LE': case 'GE':               return 50
    case 'PLUS': case 'MINUS':           return 60
    case 'STAR': case 'SLASH':
    case 'PERCENT':                      return 70
    case 'STAR_STAR':                    return 80
    // postfix
    case 'LPAREN':                       return 100
    case 'LBRACKET':                     return 100
    case 'DOT':                          return 100
    case 'QUESTION':                     return 100
    default:                             return 0
  }
}
```

---

## LL(1) 충돌 해결 증명

### 충돌 1: IDENTIFIER 분기

```
foo(bar)   → nud: Identifier("foo"), led: CallExpr
foo[0]     → nud: Identifier("foo"), led: IndexExpr
foo.bar    → nud: Identifier("foo"), led: FieldAccessExpr
foo = 1    → nud: Identifier("foo"), led: AssignExpr
foo + 1    → nud: Identifier("foo"), led: BinaryExpr
```

Pratt에서: nud는 항상 Identifier 반환. 그 **뒤 토큰**의 led가 자동 분기.
→ ✅ 충돌 없음

### 충돌 2: Generic<T> vs a < b

```
List<T>    → Type context에서만 발생 (parseType 함수)
a < b      → Expression context → led: BinaryExpr(op: '<')
```

Expression 내부에서 `<`는 항상 comparison.
Generic은 **Type 파싱 함수에서만** 처리 (별도 경로).
→ ✅ 충돌 없음

### 충돌 3: Assignment 체이닝

```
a = b = c
```

Pratt에서: `a = b` 파싱 후, `= c`는 BP(10) > minBP(0) 이므로 진입 가능.
하지만 **semantic phase**에서 차단:
- AssignExpr.target이 AssignExpr이면 에러

또는 parser에서 직접 차단:
```typescript
case 'ASSIGN': {
  this.advance()
  const right = this.parseExpr(10) // BP 10 = 체이닝 차단 (same BP = stop)
  return { kind: 'AssignExpr', target: left, value: right }
}
```

BP를 10으로 넘기면 right-assoc 안 됨 → 체이닝 차단.
→ ✅ 충돌 없음

### 충돌 4: Postfix 분기

```
foo()      → led: LPAREN → CallExpr
foo[0]     → led: LBRACKET → IndexExpr
foo.bar    → led: DOT → FieldAccessExpr
```

led에서 토큰 type으로 즉시 분기. Lookahead 불필요.
→ ✅ 충돌 없음

---

## Statement vs Expression (parseStatement)

Statement 시작은 **키워드로 분기** (RD 유지):

```typescript
parseStatement(): Statement {
  switch (this.current().type) {
    case 'VAR': case 'LET': case 'CONST':
      return this.parseVarDecl()
    case 'FN':
      return this.parseFnDecl()
    case 'TYPE':
      return this.parseTypeDecl()
    case 'IF':
      return this.parseIfStmt()
    case 'MATCH':
      return this.parseMatchStmt()
    case 'SPAWN':
      return this.parseSpawnStmt()
    case 'RETURN':
      return this.parseReturnStmt()
    case 'IMPORT':
      return this.parseImport()
    case 'EXPORT':
      return this.parseExport()
    case 'LBRACE':
      return this.parseBlock()
    default:
      // Fallback: expression statement
      return this.parseExprStmt()
  }
}
```

IDENTIFIER로 시작 → keyword 아님 → default → **expression statement로 진입**.
expression statement 내에서 Pratt가 알아서 처리.
→ ✅ 충돌 없음

---

## Block vs Map 구분 (Expression context)

Expression 내 `{`는 항상 Map literal.
Statement 내 `{`는 항상 Block.

```
parseStatement → LBRACE → parseBlock()
nud()         → LBRACE → parseMapLiteral()
```

호출 경로가 다르므로 충돌 없음.
→ ✅ 해결

---

## 전체 파서 구조 (최종)

```
Parser
├── parseProgram()         → RD
├── parseStatement()       → RD (keyword 분기)
│   ├── parseVarDecl()     → RD
│   ├── parseFnDecl()      → RD
│   ├── parseIfStmt()      → RD
│   ├── parseMatchStmt()   → RD
│   ├── parseBlock()       → RD
│   └── parseExprStmt()    → Pratt
├── parseExpr(minBP)       → Pratt ⭐
│   ├── nud()              → prefix dispatch
│   ├── led(left)          → infix/postfix dispatch
│   └── getBP(token)       → binding power lookup
├── parseType()            → RD (Generic<T> 여기서 처리)
└── parsePattern()         → RD
```

Statement = RD, Expression = Pratt. 각각의 장점만 사용.

---

## 테스트 케이스

```
# 우선순위
"1 + 2 * 3"         → BinOp(+, 1, BinOp(*, 2, 3))
"2 ** 3 ** 2"        → BinOp(**, 2, BinOp(**, 3, 2))   # right-assoc

# Postfix 연쇄
"arr[0].foo().bar"   → FieldAccess(MethodCall(Index(arr,0), foo, []), bar)

# Assignment 체이닝 금지
"a = b = c"          → Error (semantic) 또는 단일 assign만

# Function call
"foo(1, 2, 3)"       → CallExpr(foo, [1, 2, 3])

# Generic vs <
"a < b"              → BinOp(<, a, b)       # expression context
"List<T>"            → GenericType           # type context (parseType)

# Block vs Map
"{ x: 1, y: 2 }"    → MapLiteral            # expression context
"{ var a = 1 }"      → Block                 # statement context

# Complex
"match foo.bar() { Ok(v) => v + 1, _ => 0 }"
→ MatchExpr(MethodCall(FieldAccess(foo, bar), []), [...arms])
```

---

## 다음 단계

✅ Phase 2: BNF 문법
✅ Phase 3: Parser Design (20Q20A)
✅ Phase 3-fix: Pratt Parser 설계도
⏳ Phase 4: **AST 타입 정의 (TypeScript)**
⏳ Phase 5: **Parser 구현**
