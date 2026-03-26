# FreeLang v4 - Phase 3: Parser Design (20Q 20A)

## 1️⃣ 파서의 근본 목표는?

**A:** Lexer가 생성한 Token Stream을 입력받아 **BNF 문법 규칙을 따르는 Abstract Syntax Tree(AST)를 생성**하는 것.

```
Tokens (stream) → Parser (LL(1) Recursive Descent) → AST (tree)
```

---

## 2️⃣ LL(1) Recursive Descent를 선택한 이유?

**A:**
- Lookahead 1개로 모든 선택 가능 (BNF가 LL(1))
- 파서 코드가 BNF와 1:1 대응 (가독성 최고)
- 에러 복구가 쉬움 (FIRST/FOLLOW 명확)
- 디버깅 용이 (스택 트레이스 = 파싱 경로)

---

## 3️⃣ Parser 클래스의 기본 구조는?

**A:**
```typescript
class Parser {
  private tokens: Token[]
  private pos: number = 0
  private errors: ParseError[] = []

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): Program {
    return this.parseProgram()
  }
}
```

---

## 4️⃣ 현재 토큰을 조회하는 방법은?

**A:**
```typescript
private current(): Token {
  return this.pos < this.tokens.length
    ? this.tokens[this.pos]
    : { type: 'EOF', value: '' }
}

private peek(offset: number = 1): Token {
  const idx = this.pos + offset
  return idx < this.tokens.length
    ? this.tokens[idx]
    : { type: 'EOF', value: '' }
}
```

---

## 5️⃣ 토큰을 소비하는 방법은?

**A:**
```typescript
private consume(expectedType: string): Token {
  const token = this.current()
  if (token.type !== expectedType) {
    this.error(`Expected ${expectedType}, got ${token.type}`)
  }
  this.pos++
  return token
}

private match(...types: string[]): boolean {
  return types.includes(this.current().type)
}

private advance(): Token {
  return this.tokens[this.pos++]
}
```

---

## 6️⃣ 에러 처리 원칙은?

**A:**
- **Non-stopping parser**: 첫 에러에서 멈추지 않음
- **모든 에러 수집**: 배열에 저장
- **복구 전략**: Synchronize (다음 statement까지 스킵)
- **에러 반환**: `{ ast: null, errors: [...] }`

```typescript
private synchronize() {
  this.advance()
  while (!this.isAtEnd()) {
    if (this.match('SEMICOLON')) {
      this.advance()
      return
    }
    if (this.match('KEYWORD')) {
      return
    }
    this.advance()
  }
}
```

---

## 7️⃣ Program 파싱의 구조는?

**A:**
```typescript
private parseProgram(): Program {
  const statements: Statement[] = []

  while (!this.isAtEnd()) {
    const stmt = this.parseStatement()
    if (stmt) statements.push(stmt)
  }

  return {
    type: 'Program',
    statements
  }
}
```

---

## 8️⃣ Statement 파싱은 어떻게 구분하는가?

**A:** FIRST token으로 결정 (LL(1))

```typescript
private parseStatement(): Statement | null {
  if (this.match('VAR', 'LET', 'CONST')) {
    return this.parseVarDecl()
  }
  if (this.match('FN')) {
    return this.parseFnDecl()
  }
  if (this.match('IF')) {
    return this.parseIfStmt()
  }
  if (this.match('MATCH')) {
    return this.parseMatchStmt()
  }
  if (this.match('SPAWN')) {
    return this.parseSpawnStmt()
  }
  if (this.match('RETURN')) {
    return this.parseReturnStmt()
  }
  if (this.match('LBRACE')) {
    return this.parseBlock()
  }
  // Expression statement
  const expr = this.parseExpr()
  this.consume('SEMICOLON')
  return { type: 'ExprStmt', expr }
}
```

---

## 9️⃣ 변수 선언을 파싱하는 방법은?

**A:**
```typescript
private parseVarDecl(): VarDecl {
  const kindToken = this.advance() // var|let|const
  const name = this.consume('IDENTIFIER').value

  let type: Type | null = null
  if (this.match('COLON')) {
    this.advance()
    type = this.parseType()
  }

  this.consume('ASSIGN')
  const init = this.parseExpr()
  this.consume('SEMICOLON')

  return {
    type: 'VarDecl',
    kind: kindToken.value,
    name,
    varType: type,
    init
  }
}
```

---

## 🔟 함수 선언을 파싱하는 방법은?

**A:**
```typescript
private parseFnDecl(): FnDecl {
  this.consume('FN')
  const name = this.consume('IDENTIFIER').value

  let typeParams: string[] = []
  if (this.match('LT')) { // <
    this.advance()
    typeParams = this.parseTypeParams()
    this.consume('GT')
  }

  this.consume('LPAREN')
  const params = this.parseParams()
  this.consume('RPAREN')

  let returnType: Type | null = null
  if (this.match('COLON')) {
    this.advance()
    returnType = this.parseType()
  }

  const body = this.parseBlock()

  return {
    type: 'FnDecl',
    name,
    typeParams,
    params,
    returnType,
    body
  }
}
```

---

## 1️⃣1️⃣ 매개변수 파싱은?

**A:**
```typescript
private parseParams(): Parameter[] {
  const params: Parameter[] = []

  if (!this.match('RPAREN')) {
    do {
      if (this.match('COMMA')) this.advance()

      const name = this.consume('IDENTIFIER').value
      this.consume('COLON')
      const paramType = this.parseType()

      params.push({ name, paramType })
    } while (this.match('COMMA'))
  }

  return params
}
```

---

## 1️⃣2️⃣ 표현식 파싱 (우선순위)는?

**A:** Precedence Climbing (또는 Recursive Descent)

```typescript
private parseExpr(): Expression {
  return this.parseAssignExpr()
}

private parseAssignExpr(): Expression {
  let expr = this.parseLogicalOr()

  if (this.match('ASSIGN')) {
    this.advance()
    const right = this.parseLogicalOr() // 체이닝 금지: assign_expr 불가
    return { type: 'BinOp', op: '=', left: expr, right }
  }

  return expr
}

private parseLogicalOr(): Expression {
  let expr = this.parseLogicalAnd()

  while (this.match('OR')) {
    const op = this.advance().value
    const right = this.parseLogicalAnd()
    expr = { type: 'BinOp', op, left: expr, right }
  }

  return expr
}

// ... 나머지 우선순위도 동일 패턴
```

---

## 1️⃣3️⃣ Comparison vs Generic 충돌은 어떻게 해결하는가?

**A:** Lookahead 1 + Type Context

```typescript
private parseComparison(): Expression {
  let expr = this.parseAdditive()

  while (this.match('LT', 'GT', 'LE', 'GE')) {
    // LT를 만났을 때
    if (this.current().type === 'LT') {
      // Lookahead: 다음 토큰이 type인가?
      if (this.isTypeStart(this.peek())) {
        // Generic <T> → parseComparison 여기서 멈춤
        // 상위 함수(parseType)에서 처리
        break
      }
    }

    const op = this.advance().value
    const right = this.parseAdditive()
    expr = { type: 'BinOp', op, left: expr, right }
  }

  return expr
}

private isTypeStart(token: Token): boolean {
  return ['IDENTIFIER', 'I32', 'I64', 'F32', 'F64',
          'STRING', 'BOOL', 'VOID', 'LBRACKET', 'LBRACE'].includes(token.type)
}
```

---

## 1️⃣4️⃣ Postfix Expression (함수 호출, 배열 인덱싱) 파싱은?

**A:**
```typescript
private parsePostfixExpr(): Expression {
  let expr = this.parsePrimary()

  while (true) {
    if (this.match('LPAREN')) {
      // Function call
      this.advance()
      const args = this.parseArgs()
      this.consume('RPAREN')
      expr = { type: 'Call', func: expr, args }
    }
    else if (this.match('LBRACKET')) {
      // Array indexing
      this.advance()
      const index = this.parseExpr()
      this.consume('RBRACKET')
      expr = { type: 'Index', array: expr, index }
    }
    else if (this.match('DOT')) {
      // Field access or method call
      this.advance()
      const field = this.consume('IDENTIFIER').value

      if (this.match('LPAREN')) {
        // Method call: expr.field(args)
        this.advance()
        const args = this.parseArgs()
        this.consume('RPAREN')
        expr = { type: 'MethodCall', object: expr, method: field, args }
      } else {
        // Field access: expr.field
        expr = { type: 'FieldAccess', object: expr, field }
      }
    }
    else if (this.match('QUESTION')) {
      // Try operator: expr?
      this.advance()
      expr = { type: 'Try', expr }
    }
    else {
      break
    }
  }

  return expr
}
```

---

## 1️⃣5️⃣ Primary Expression은?

**A:**
```typescript
private parsePrimary(): Expression {
  // Literal
  if (this.match('INTEGER')) {
    return { type: 'Literal', value: parseInt(this.advance().value) }
  }
  if (this.match('FLOAT')) {
    return { type: 'Literal', value: parseFloat(this.advance().value) }
  }
  if (this.match('STRING')) {
    return { type: 'Literal', value: this.advance().value }
  }
  if (this.match('TRUE')) {
    this.advance()
    return { type: 'Literal', value: true }
  }
  if (this.match('FALSE')) {
    this.advance()
    return { type: 'Literal', value: false }
  }

  // Identifier
  if (this.match('IDENTIFIER')) {
    return { type: 'Identifier', name: this.advance().value }
  }

  // Array literal
  if (this.match('LBRACKET')) {
    return this.parseArrayLiteral()
  }

  // Map literal
  if (this.match('LBRACE')) {
    return this.parseMapLiteral()
  }

  // Grouped expression
  if (this.match('LPAREN')) {
    this.advance()
    const expr = this.parseExpr()
    this.consume('RPAREN')
    return expr
  }

  // If expression
  if (this.match('IF')) {
    return this.parseIfExpr()
  }

  // Match expression
  if (this.match('MATCH')) {
    return this.parseMatchExpr()
  }

  // Spawn expression
  if (this.match('SPAWN')) {
    return this.parseSpawnExpr()
  }

  this.error(`Unexpected token: ${this.current().type}`)
  return { type: 'Error' }
}
```

---

## 1️⃣6️⃣ Block vs Map Literal 구분은?

**A:** Context에 따라 구분

```typescript
private parseBlock(): Block {
  this.consume('LBRACE')

  const statements: Statement[] = []
  while (!this.match('RBRACE')) {
    statements.push(this.parseStatement())
  }

  this.consume('RBRACE')
  return { type: 'Block', statements }
}

private parseMapLiteral(): MapLiteral {
  this.consume('LBRACE')

  const entries: MapEntry[] = []
  while (!this.match('RBRACE')) {
    const key = this.consume('IDENTIFIER').value
    this.consume('COLON')
    const value = this.parseExpr()
    entries.push({ key, value })

    if (this.match('COMMA')) this.advance()
  }

  this.consume('RBRACE')
  return { type: 'MapLiteral', entries }
}

// 호출 시점:
// - statement 문맥: parseBlock() 호출
// - expression 문맥: parseMapLiteral() 호출
```

---

## 1️⃣7️⃣ Match Expression 파싱은?

**A:**
```typescript
private parseMatchExpr(): MatchExpr {
  this.consume('MATCH')
  const scrutinee = this.parseExpr()
  this.consume('LBRACE')

  const arms: MatchArm[] = []
  while (!this.match('RBRACE')) {
    const pattern = this.parsePattern()
    this.consume('ARROW')
    const body = this.parseExpr()

    arms.push({ pattern, body })

    if (!this.match('RBRACE')) {
      this.consume('COMMA')
    }
  }

  // Exhaustiveness 검사 (semantic phase)
  this.consume('RBRACE')

  return {
    type: 'MatchExpr',
    scrutinee,
    arms
  }
}

private parsePattern(): Pattern {
  if (this.match('IDENTIFIER')) {
    const name = this.advance().value
    if (this.match('LPAREN')) {
      // Constructor pattern: Ok(...), Some(...)
      this.advance()
      const pattern = this.parsePattern()
      this.consume('RPAREN')
      return { type: 'ConstructorPattern', constructor: name, pattern }
    }
    return { type: 'IdentifierPattern', name }
  }
  if (this.match('UNDERSCORE')) {
    this.advance()
    return { type: 'WildcardPattern' }
  }
  // Literal pattern
  return this.parsePrimary()
}
```

---

## 1️⃣8️⃣ Type 파싱은?

**A:**
```typescript
private parseType(): Type {
  let baseType = this.parseTypeBase()

  // Generic type: Type<T, U>
  if (this.match('LT') && this.isTypeStart(this.peek())) {
    this.advance()
    const typeParams: Type[] = []

    do {
      if (this.match('COMMA')) this.advance()
      typeParams.push(this.parseType())
    } while (this.match('COMMA'))

    this.consume('GT')
    baseType = { type: 'GenericType', base: baseType, params: typeParams }
  }

  // Array type: [T]
  if (this.match('LBRACKET')) {
    this.advance()
    const elemType = this.parseType()
    this.consume('RBRACKET')
    baseType = { type: 'ArrayType', elem: elemType }
  }

  return baseType
}

private parseTypeBase(): Type {
  if (this.match('IDENTIFIER')) {
    return { type: 'NamedType', name: this.advance().value }
  }
  if (this.match('I32', 'I64', 'F32', 'F64', 'STRING', 'BOOL', 'VOID')) {
    return { type: 'PrimitiveType', name: this.advance().value }
  }
  this.error('Expected type')
  return { type: 'UnknownType' }
}
```

---

## 1️⃣9️⃣ If Statement 파싱은?

**A:**
```typescript
private parseIfStmt(): IfStmt {
  this.consume('IF')
  const condition = this.parseExpr()
  const consequent = this.parseBlock()

  let alternate: Block | IfStmt | null = null
  if (this.match('ELSE')) {
    this.advance()
    if (this.match('IF')) {
      // else if
      alternate = this.parseIfStmt()
    } else {
      // else block
      alternate = this.parseBlock()
    }
  }

  return {
    type: 'IfStmt',
    condition,
    consequent,
    alternate
  }
}
```

---

## 2️⃣0️⃣ Parser의 전체 흐름과 테스트 전략은?

**A:**
```typescript
// Parser 실행 흐름
class Parser {
  parse(): ParseResult {
    try {
      const program = this.parseProgram()
      return {
        success: this.errors.length === 0,
        ast: program,
        errors: this.errors
      }
    } catch (e) {
      return {
        success: false,
        ast: null,
        errors: [...this.errors, { message: e.message }]
      }
    }
  }
}

// 테스트 전략
const testCases = [
  // Priority: 우선순위 테스트
  { input: "var a = 1 + 2 * 3", expect: BinOp(+, 1, BinOp(*, 2, 3)) },
  { input: "var a = 2 ** 3 ** 2", expect: BinOp(**, 2, BinOp(**, 3, 2)) },

  // Assignment: 체이닝 금지
  { input: "a = b = c", expect: error },

  // Generic vs <: Generic 우선
  { input: "fn foo<T>(x: List<T>) { }", expect: GenericFn },

  // Block vs Map: Context 구분
  { input: "var m = { a: 1, b: 2 }", expect: MapLiteral },
  { input: "{ var a = 1 }", expect: Block },

  // Postfix: 연속 호출
  { input: "arr[0].foo().bar", expect: MethodCall(...) },

  // Match: exhaustiveness는 semantic phase
  { input: "match x { Ok(v) => v, _ => 0 }", expect: MatchExpr },

  // Error recovery: 여러 에러 수집
  { input: "var a b c", expect: [error1, error2] }
]
```

---

## 📊 Parser 구현 체크리스트

- [ ] Parser 클래스 (pos, tokens, errors)
- [ ] 토큰 조회/소비 함수
- [ ] 에러 수집 및 복구
- [ ] Statement 분기
- [ ] Expression 우선순위 (8단계)
- [ ] Postfix 통합 처리
- [ ] Block vs Map 구분
- [ ] Generic vs < 구분
- [ ] Type 파싱
- [ ] Pattern 파싱
- [ ] 모든 규칙의 파싱 함수
- [ ] 단위 테스트 (20+ cases)
- [ ] 통합 테스트

---

## 다음 단계

✅ Phase 2: Syntax (BNF)
✅ Phase 3: Parser Design (20Q20A)
⏳ Phase 3-2: LL(1) Conflict 분석
⏳ Phase 4: AST 구조 설계
