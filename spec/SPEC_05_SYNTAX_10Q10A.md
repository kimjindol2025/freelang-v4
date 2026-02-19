# FreeLang v4 — Spec 05: 구문론 (Syntax) 10Q 10A

**참조**: SPEC_02 BNF (frozen), Pratt Parser 설계도

---

## Q1. 문(Statement)과 식(Expression)의 경계는?

**A:** 문은 선언과 제어. 식은 값을 만든다. 일부는 양쪽 다 가능.

```
문(Statement) — 값을 만들지 않는다:
  var x = 42         // 변수 선언
  fn add(a, b) {}    // 함수 선언
  for i in arr {}    // 반복
  spawn {}           // Actor 생성
  return x           // 함수 반환

식(Expression) — 값을 만든다:
  42                 // 리터럴
  x + 1              // 연산
  add(1, 2)          // 함수 호출
  arr[0]             // 인덱싱
  obj.field          // 필드 접근

양쪽 다 가능:
  if/match — 문 위치에서도, 식 위치에서도 사용 가능
```

if가 문이면서 식인 예:

```freelang
// 문으로 사용
if x > 0 {
  println("positive")
} else {
  println("negative")
}

// 식으로 사용 (값 반환)
var sign = if x > 0 { "positive" } else { "negative" }
```

왜 이렇게 설계했는가:
- 문만 있으면 → `if`로 값을 만들려면 임시 변수 필요 → 코드 불필요하게 길어짐
- 식만 있으면 → `for`나 `spawn`이 값을 반환해야 함 → 부자연스럽
- 양쪽 다 허용하면 → AI가 상황에 맞게 선택 가능

파서 구분 방법:
```
문 시작 판별 (키워드 dispatch):
  var/let/const → VarDecl
  fn            → FnDecl
  if            → IfStmt (문 위치에서)
  match         → MatchStmt
  for           → ForStmt
  spawn         → SpawnStmt
  return        → ReturnStmt
  {             → Block
  그 외         → ExprStmt (식을 문으로 감싼 것)

식 위치에서 if/match를 만나면 → IfExpr / MatchExpr
```

---

## Q2. 왜 세미콜론이 없는가?

**A:** 모든 문이 명확한 시작 토큰을 갖고 있기 때문에 필요 없다.

```
문 종류      시작 토큰      끝 판별
─────────   ────────────   ──────────────
VarDecl     var/let/const  다음 문 시작 or }
FnDecl      fn             } (블록 끝)
IfStmt      if             } (블록 끝)
MatchStmt   match          } (match 끝)
ForStmt     for            } (블록 끝)
SpawnStmt   spawn          } (블록 끝)
ReturnStmt  return         다음 문 시작 or }
Block       {              }
ExprStmt    (식 시작)      다음 문 시작 or }
```

파서의 문 종료 판별:
```
블록 내에서 문을 파싱한 후:
  다음 토큰이 } → 블록 종료
  다음 토큰이 키워드 → 새 문 시작
  다음 토큰이 식 시작 → 새 ExprStmt

→ 세미콜론 없이도 문 경계를 항상 판별 가능
```

위험한 경우가 있는가?
```freelang
var x = foo
(bar)
```

이것은:
- `foo(bar)` 함수 호출? → ❌
- `foo`이 끝나고 `(bar)` 식이 시작? → ✅

판별: `foo` 뒤에 줄바꿈이 있든 없든, `foo`는 식이고 다음 토큰 `(`는 ExprStmt의 시작이 아니라 postfix로 해석.

수정: 이 모호성은 ExprStmt 파싱 규칙으로 해결한다.
```
ExprStmt 파싱:
  1. 식을 파싱
  2. 파싱 중 postfix `(`는 함수 호출로 해석 (Pratt led)
  3. 식 파싱이 끝나면 ExprStmt 종료

결과: var x = foo(bar) 로 해석됨
```

사실 이건 `var x = foo` 다음에 `(bar)`가 오는 것이 아니라, `var x = <expr>` 에서 `<expr>`이 `foo(bar)`까지 소비. VarDecl의 init expr이 `foo(bar)`를 먹는다.

---

## Q3. 왜 Pratt Parser인가?

**A:** 식(Expression) 파싱에서 LL(1)이 불가능하기 때문.

```
LL(1) 충돌 4개:

1. IDENT 모호성
   x       → 변수 참조? 함수 호출? 배열 인덱스? 할당?
   → 다음 토큰을 봐야 결정 (1개 lookahead로 부족)

2. postfix 연속
   foo.bar[0].baz()
   → 모두 IDENT 뒤에 시작. RD로는 우선순위 처리 어려움

3. < 모호성
   x < 10     → 비교
   Option<i32> → 제네릭 (타입 위치에서)

4. 할당
   x = 10     → 할당 (= 을 만나기 전까진 식인지 할당인지 모름)
```

Pratt가 이 모든 문제를 해결하는 방법:
```
각 토큰에 두 가지 역할 부여:

nud (prefix 위치):
  IDENT → Ident 노드 반환
  INT   → IntLit 노드 반환
  "-"   → UnaryOp(-, parseExpr(90))
  "!"   → UnaryOp(!, parseExpr(90))
  "("   → 그룹 식 파싱
  "["   → 배열 리터럴
  "{"   → 구조체 리터럴

led (infix/postfix 위치):
  "+"   → BinOp(+, left, parseExpr(60))
  "("   → Call(left, parseArgs())
  "["   → Index(left, parseExpr(0))
  "."   → FieldAccess(left, expectIdent())
  "?"   → TryOp(left)
  "="   → Assignment(left, parseExpr(9))  // right assoc
```

문(Statement)은 여전히 Recursive Descent:
```
parseStmt():
  switch (current.type):
    VAR/LET/CONST → parseVarDecl()
    FN            → parseFnDecl()
    IF            → parseIfStmt()
    ...
    default       → parseExprStmt()

parseExprStmt():
  expr = parseExpr(0)  // ← 여기서 Pratt 진입
  return ExprStmt(expr)
```

**RD for statements + Pratt for expressions = 최적 조합**

---

## Q4. 연산자 우선순위와 결합 방향은?

**A:** 10단계 우선순위. C/JavaScript 관례 따름.

```
BP    연산자          결합    예시
────  ──────────────  ────    ──────────────────
10    =               right   x = y = 금지 (Q5)
20    ||              left    a || b || c
30    &&              left    a && b && c
40    == !=           left    a == b (체이닝 금지)
50    < > <= >=       left    a < b (체이닝 금지)
60    + -             left    a + b - c
70    * / %           left    a * b / c
90    ! - (unary)     prefix  -x, !flag
100   () [] . ?       postfix f(), a[i], o.f, r?
```

왜 이 순서인가:
```
수학 관례: * > + (모든 언어 동일)
논리 관례: && > || (C, Java, Rust, Go 동일)
비교와 논리: 비교 > 논리 (if x > 0 && y > 0 에서 괄호 불필요)
```

**없는 연산자**:

| 없는 것 | 이유 |
|---------|------|
| `**` (거듭제곱) | `pow(x, n)` 함수로 대체. 결합 방향 혼란 방지 |
| `&` `\|` `^` (비트) | Spec 03: 비트 연산 불필요 |
| `<<` `>>` (시프트) | Spec 03: 비트 연산 불필요 |
| `??` (null coalescing) | null 없음. Option은 match로 처리 |
| `++` `--` | 부작용 연산자 금지. `x = x + 1` 사용 |
| `+=` `-=` 등 | 복합 할당 금지. `x = x + 1` 사용 |

왜 복합 할당(`+=`)이 없는가:
```
x += 1 은 x = x + 1의 축약.

문제:
  arr[i] += 1 → arr[i] = arr[i] + 1
  이건 arr[i]를 2번 평가하는가 1번 평가하는가?
  → 언어마다 다름 → 모호성 발생

FreeLang v4: 축약 없이 명시적으로.
  arr[i] = arr[i] + 1   // 의도가 명확
```

---

## Q5. 할당은 왜 체이닝 금지인가?

**A:** `a = b = c`는 AI가 의도를 오해하기 쉽다.

```
C/JavaScript:
  a = b = c = 0    // c=0, b=0, a=0 (right-to-left)
  → 허용

FreeLang v4:
  a = b = c = 0    // ❌ 컴파일 에러
  → 금지
```

금지 이유:
```
1. AI가 "a에 b=c의 결과를 할당"인지 "a, b, c 모두 0으로"인지 헷갈림
2. 할당이 값을 반환하면 if (x = 42) 같은 버그 가능
3. FreeLang v4에서 할당은 값을 반환하지 않는다 → 식이 아닌 문

구현:
  할당은 ExprStmt 수준에서만 허용
  var x = (y = 10)  ❌ → y = 10이 값을 반환하지 않으므로 불가
```

비교 체이닝도 금지:
```
Python:
  1 < x < 10    // 허용 (x > 1 and x < 10)

FreeLang v4:
  1 < x < 10    // ❌ 컴파일 에러
  1 < x && x < 10  // ✅ 명시적
```

이유: AI가 `1 < x < 10`을 "1 < x의 결과(bool) < 10"으로 해석할 위험.

---

## Q6. `{}`가 블록과 구조체 리터럴에 모두 쓰이는데, 어떻게 구분하는가?

**A:** 문맥으로 결정. 문 위치 = 블록, 식 위치 = 구조체.

```
문 위치에서 {:
  if x > 0 { ... }        → Block
  fn foo() { ... }         → Block
  for i in arr { ... }     → Block
  spawn { ... }            → Block

식 위치에서 {:
  var s = { name: "a" }   → StructLit
  foo({ x: 1 })           → StructLit (함수 인자)
```

파서 규칙:
```
문 시작에서 { → parseBlock()
식 파싱 중 { → parseStructLit()

구분이 명확한 이유:
  - 문 시작은 항상 키워드(var, fn, if ...) 또는 식
  - { 가 문 시작에 오면 → Block
  - { 가 = 뒤, ( 뒤, [ 뒤 등 식 위치에 오면 → StructLit
```

모호한 경우가 있는가?
```
{ x: 1 }

문 위치: 이건 Block인데 내용이 "x: 1"?
  → "x" IDENT 다음 ":" → 라벨? FreeLang에 라벨 없음.
  → 파서: Block 내에서 "x :" 는 유효한 문이 아님 → 에러

식 위치: 구조체 리터럴
  → { IDENT ":" expr } → StructLit
  → 유효

결론: 문 시작에서 { 뒤에 IDENT ":" 가 오면 →
  문법적으로 Block 내 유효한 문이 아니므로 에러.
  구조체 리터럴은 반드시 식 위치에서만 나타남.
```

---

## Q7. for 루프는 왜 `for...in` 하나뿐인가?

**A:** AI에게 루프 형태 하나면 충분하다.

```
있는 것:
  for item in collection { ... }

없는 것:
  while cond { ... }           ❌
  for (var i = 0; i < n; i++) ❌ (C-style)
  loop { ... }                 ❌ (무한 루프)
  do { ... } while (cond)      ❌
```

왜 while이 없는가:
```
while은 무한 루프의 원천이다.

while true { ... }  → 종료 조건 실수 → 무한 루프
while x > 0 { ... } → x 감소 누락 → 무한 루프

for...in은 유한 컬렉션을 순회한다.
  for item in arr { ... }       → arr.length 만큼 반복, 확정
  for i in range(0, 10) { ... } → 10번, 확정

AI가 무한 루프를 만들 수 없다.
```

카운터 기반 루프는?
```
// C-style: for (var i = 0; i < 10; i++)
// FreeLang v4:
for i in range(0, 10) {
  println(i)
}

range(start, end) → [start, start+1, ..., end-1] 배열 반환
range는 표준 라이브러리 함수.
```

무한 루프가 정말 필요하면?
```
// v4에서 무한 루프 만드는 방법:
for _ in range(0, 1000000) { ... }

→ 실질적 무한이지만 상한이 있음
→ 진짜 무한 루프는 못 만듦 → 의도적
```

Actor 내 이벤트 루프:
```
spawn {
  for _ in range(0, 1000000) {
    var msg = ch.recv()   // 채널 대기 (blocking)
    process(msg)
  }
}

→ 100만 번까지만. 실무에서 충분.
→ 진짜 무한이 필요하면 v5에서 loop 추가 검토.
```

---

## Q8. match 문법의 상세 규칙은?

**A:** 패턴 매칭. 6종 패턴. exhaustiveness 강제.

```freelang
match expr {
  pattern1 => body1,
  pattern2 => body2,
  _        => default_body,
}
```

### 6종 패턴

```
1. Ident:    x       → 값을 x에 바인딩
2. Literal:  42      → 값이 42인지 검사
3. Ok(p):    Ok(v)   → Result가 Ok이면, 내부 값을 v에 바인딩
4. Err(p):   Err(e)  → Result가 Err이면
5. Some(p):  Some(v) → Option이 Some이면
6. None:     None    → Option이 None이면
7. _:        _       → 모든 값 매칭 (wildcard)
```

### exhaustiveness 규칙 (Spec 02 반복)

```
match on Option<T>:
  Some(x) + None   ✅
  Some(x)만        ❌ 컴파일 에러: None 누락

match on Result<T, E>:
  Ok(x) + Err(e)   ✅
  Ok(x)만          ❌ 컴파일 에러: Err 누락

match on bool:
  true + false      ✅

match on i32:
  1, 2, 3 만       ❌ 컴파일 에러: _ 누락
  1, 2, 3, _       ✅
```

### match arm의 body

```
match expr {
  Ok(v) => v + 1,        // 단일 식
  Err(e) => {             // 블록도 가능
    println(e)
    0
  },
}
```

body가 블록이면 마지막 식이 반환값:
```
{ println(e); 0 } → 0이 반환값
```

### match가 식일 때

```freelang
var result = match opt {
  Some(v) => v * 2,
  None => 0,
}
// result = v*2 또는 0
```

모든 arm의 반환 타입이 동일해야 함:
```
match opt {
  Some(v) => v * 2,    // i32
  None => "zero",      // string ❌ 타입 불일치
}
```

---

## Q9. 문법에 없는 것들과 그 이유는?

**A:** 의도적으로 제외한 15가지.

| 제외된 문법 | 이유 |
|------------|------|
| `class`, `struct` 선언 | 구조체는 리터럴로만 생성. 별도 선언문 없음 |
| `import`, `module` | v4에 모듈 시스템 없음 (1 파일 = 1 프로그램) |
| `trait`, `interface` | 제네릭/다형성 없음 |
| `enum` | Option/Result만 하드코딩 |
| `while`, `loop` | 무한 루프 방지 (Q7) |
| `break`, `continue` | for...in은 전체 순회. 중간 탈출 없음 |
| `try/catch/throw` | Result + ? 연산자로 대체 |
| `async/await` | Actor + channel로 대체 |
| `new` | 생성자 없음. 구조체 리터럴로 직접 생성 |
| `this/self` | 메서드 없음. 함수만 있음 |
| `+=`, `-=` 등 | 복합 할당 금지 (Q4) |
| `++`, `--` | 부작용 연산자 금지 |
| `;` (세미콜론) | 불필요 (Q2) |
| ternary `? :` | if 식으로 대체 |
| lambda/closure | 일급 함수 없음 |

**break/continue가 없는 이유**:
```
다른 언어:
  for i in items {
    if i < 0 { continue }
    if i > 100 { break }
    process(i)
  }

FreeLang v4:
  for i in items {
    if i >= 0 && i <= 100 {
      process(i)
    }
  }

→ 조건문으로 동일한 로직 구현 가능
→ break/continue는 "goto의 변형"이다
→ AI가 루프 흐름을 예측하기 어려워짐
```

---

## Q10. 이 문법으로 실제 프로그램이 모호성 없이 파싱되는가?

**A:** 검증. 3가지 테스트 프로그램으로 파싱 과정 추적.

### 테스트 1: 변수 선언 + 함수 호출

```freelang
var result = add(1, 2 * 3)
println(result)
```

```
파싱:
  VAR → VarDecl 시작
    IDENT("result") → 변수명
    EQ → 초기값 시작
    parseExpr(0):
      nud(IDENT "add") → Ident("add")
      led(LPAREN) → Call 시작
        parseExpr(0): nud(INT 1) → IntLit(1)
        COMMA
        parseExpr(0):
          nud(INT 2) → IntLit(2)
          led(STAR, BP 70 > 0) → BinOp(*)
            parseExpr(70): nud(INT 3) → IntLit(3)
          → BinOp(*, 2, 3)
        RPAREN → Call 끝
      → Call("add", [1, BinOp(*, 2, 3)])
    → VarDecl(result, Call(...))

  IDENT("println") → ExprStmt 시작
    parseExpr(0):
      nud(IDENT "println") → Ident("println")
      led(LPAREN) → Call
        parseExpr(0): nud(IDENT "result") → Ident("result")
        RPAREN
      → Call("println", [Ident("result")])
    → ExprStmt(Call(...))

모호성: 없음 ✅
```

### 테스트 2: match + channel

```freelang
match ch.recv() {
  Ok(v) => v + 1,
  Err(e) => 0,
}
```

```
파싱:
  MATCH → MatchStmt
    parseExpr(0):
      nud(IDENT "ch") → Ident("ch")
      led(DOT) → FieldAccess
        IDENT("recv") → FieldAccess(ch, "recv")
      led(LPAREN) → Call
        → Call(FieldAccess(ch, "recv"), [])
      led 확인: LBRACE → BP 없음 → 식 끝
    LBRACE → match arms 시작
      pattern: IDENT("Ok") LPAREN IDENT("v") RPAREN → OkPattern(IdentPattern("v"))
      ARROW
      body: parseExpr(0) → BinOp(+, Ident("v"), IntLit(1))
      COMMA

      pattern: IDENT("Err") LPAREN IDENT("e") RPAREN → ErrPattern(IdentPattern("e"))
      ARROW
      body: parseExpr(0) → IntLit(0)
      COMMA
    RBRACE → match 끝

모호성: 없음 ✅
```

### 테스트 3: 중첩 if 식 + 구조체

```freelang
var point = { x: if a > 0 { a } else { 0 }, y: 10 }
```

```
파싱:
  VAR → VarDecl
    IDENT("point")
    EQ
    parseExpr(0):
      nud(LBRACE) → StructLit 시작
        IDENT("x") COLON → 필드 시작
        parseExpr(0):
          nud(IF) → IfExpr 시작
            cond: parseExpr(0) → BinOp(>, Ident("a"), IntLit(0))
            LBRACE → then block: [Ident("a")] RBRACE
            ELSE
            LBRACE → else block: [IntLit(0)] RBRACE
          → IfExpr(a > 0, a, 0)
        COMMA
        IDENT("y") COLON IntLit(10)
      RBRACE → StructLit 끝
    → VarDecl(point, StructLit({x: IfExpr, y: 10}))

모호성: 없음 ✅
```

---

# 요약

| 결정 | 내용 |
|------|------|
| 파서 | RD(문) + Pratt(식) 하이브리드 |
| 세미콜론 | 없음. 키워드 dispatch로 문 경계 판별 |
| 우선순위 | 10단계 BP. C/JS 관례 따름 |
| 할당 | 체이닝 금지. 값 반환 안 함 |
| {} 모호성 | 문 위치 = Block, 식 위치 = StructLit |
| 루프 | for...in 하나만. while/loop/break/continue 없음 |
| match | 6종 패턴 + exhaustiveness 강제 |
| 없는 것 | class, import, trait, while, break, +=, lambda 등 15종 |
| if/match | 문이면서 식 (dual purpose) |
| 모호성 | 3가지 실제 프로그램으로 검증: 없음 |
