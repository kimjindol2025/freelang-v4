# 📦 프로젝트 마이그레이션 계획

**목표**: 모든 프로젝트를 FreeLang으로 마이그레이션
**우선순위**: 단순 → 복잡 (5개 단계)

---

## 🎯 마이그레이션 대상 및 우선순위

### Priority 1: freelang-http-server (WEEK 5)

**현황**:
- 언어: TypeScript
- 규모: ~400줄
- 복잡도: ⭐ (낮음)
- 의존성: express.js, body-parser

**마이그레이션 이유**:
- ✅ 가장 간단한 프로젝트
- ✅ HTTP 모듈로 성능 검증 가능
- ✅ 첫 성공으로 다른 팀 동기부여

**마이그레이션 계획**:

```
Stage: freelang-http-server (TypeScript)
   ↓
Phase 1: 기존 구조 분석 (1일)
   - GET /api/health
   - POST /api/data
   - GET /api/data/:id
   ↓
Phase 2: FreeLang으로 재작성 (2일)
   struct HttpServer {
     routes: array<Route>,
     handlers: object
   }

   async fn main() {
     let server = HttpServer()
     server.get("/api/health", (req) => {
       return Response { status: 200, body: "ok" }
     })
     await server.listen(8080)
   }
   ↓
Phase 3: 테스트 & 검증 (1일)
   - curl 테스트
   - 성능 비교
   ↓
Phase 4: 배포 (1일)
   - ISA v1.0 컴파일
   - Gogs 올리기
```

**성공 기준**:
- [ ] 모든 엔드포인트 동작
- [ ] 성능: TypeScript 버전 대비 150% 이내
- [ ] 자동 테스트 모두 통과 (FreeLang으로 작성)
- [ ] Gogs에 배포

---

### Priority 2: kim-agent (WEEK 6-7)

**현황**:
- 언어: JavaScript
- 규모: ~500줄
- 복잡도: ⭐⭐ (중간)
- 의존성: anthropic SDK, dotenv

**마이그레이션 이유**:
- ✅ Tool execution 로직 검증
- ✅ API 호출 기능 검증
- ✅ Async orchestration 검증

**마이그레이션 계획**:

```
Stage: kim-agent (JavaScript)
   ↓
구성 요소:
  1. Agent 루프
     async fn agentLoop(messages: array) -> Result {
       // Claude API 호출
       // Tool execution
       // 재귀 루프
     }

  2. Tool Registry
     struct Tool {
       name: string,
       description: string,
       execute: fn(input: object) -> object
     }

  3. Tool 구현
     - file.read(path: string) -> string
     - http.get(url: string) -> Response
     - command.run(cmd: string) -> Output
     - db.query(sql: string) -> array<object>
```

**성공 기준**:
- [ ] 기존 기능 100% 호환
- [ ] Tool execution 성공
- [ ] Async agent loop 정상 작동

---

### Priority 3: Proof_ai (WEEK 6-7)

**현황**:
- 언어: TypeScript
- 규모: ~600줄
- 복잡도: ⭐⭐ (중간)
- 의존성: Express, TypeORM, PostgreSQL

**마이그레이션 이유**:
- ✅ API 엔드포인트 검증
- ✅ Business logic 복잡도 검증
- ✅ Database 통합 검증

**마이그레이션 계획**:

```
Stage: Proof_ai (TypeScript)
   ↓
구성 요소:
  1. Models
     struct User {
       id: int,
       name: string,
       email: string,
       created_at: uint64
     }

  2. API Endpoints
     async fn handleGetUser(req: Request) -> Response {
       let user = db.query("SELECT * FROM users WHERE id = ?", req.id)
       return Response { status: 200, body: user }
     }

  3. Middleware
     async fn authenticate(req: Request) -> bool {
       let token = req.headers["Authorization"]
       return validate_token(token)
     }
```

**성공 기준**:
- [ ] 모든 API 엔드포인트 작동
- [ ] Database 쿼리 정상
- [ ] Authentication 정상
- [ ] GraphQL 인터페이스 가능

---

### Priority 4: v2-freelang-ai (WEEK 8-9)

**현황**:
- 언어: TypeScript
- 규모: ~5,000줄
- 복잡도: ⭐⭐⭐ (높음)
- 구성: Compiler + StdLib + HTTP

**마이그레이션 이유**:
- ✅ 가장 복잡한 프로젝트 = 최종 검증
- ✅ Compiler 자체가 FreeLang으로 재작성 가능함을 증명
- ✅ 순환 구조 완성 (FreeLang Compiler를 FreeLang으로)

**마이그레이션 계획**:

```
Substep 1: Lexer → FreeLang (1.5일)
  fn tokenize(source: string) -> array<Token> {
    let tokens: array<Token> = []
    let i = 0
    while i < source.length {
      let char = source[i]
      // Token 분류
      if isDigit(char) {
        // 숫자 토큰
      } else if isLetter(char) {
        // 식별자/키워드 토큰
      } else {
        // 연산자 토큰
      }
    }
    return tokens
  }

Substep 2: Parser → FreeLang (2일)
  fn parseExpression() -> Expression { ... }
  fn parseStatement() -> Statement { ... }
  fn parseProgram() -> Program { ... }

Substep 3: Type Checker → FreeLang (1.5일)
  fn checkProgram(ast: Program) -> CheckResult { ... }
  fn checkStatement(stmt: Statement) -> void { ... }
  fn checkExpression(expr: Expression) -> Type { ... }

Substep 4: ISA Generator → FreeLang (1일)
  // 이미 기존 구현 참고 가능

Substep 5: HTTP Server → FreeLang (1일)
  // 기존 freelang-http-server 참고
```

**성공 기준**:
- [ ] Compiler 자체가 FreeLang으로 완전히 작성됨
- [ ] 기존 프로젝트와 100% 호환
- [ ] 순환 구조 작동 (FreeLang Compiler로 FreeLang 코드 컴파일)

---

### Priority 5: freelang-v6 (WEEK 8-9)

**현황**:
- 언어: TypeScript
- 규모: ~3,000줄
- 복잡도: ⭐⭐⭐ (높음)
- 구성: Language Core + Type System

**마이그레이션 이유**:
- ✅ 언어 코어 검증
- ✅ 고급 타입 시스템 검증

**마이그레이션 계획**:

```
주요 구성 요소:
  1. Type definitions (현재 TypeScript interfaces)
     struct Type {
       name: string,
       kind: string,  // "int", "string", "function", etc
       constraints: object
     }

  2. Module system
     fn import_module(path: string) -> Module { ... }

  3. Advanced features
     - Pattern matching
     - First-class functions
     - Closures
```

**성공 기준**:
- [ ] 모든 언어 기능 FreeLang으로 표현 가능
- [ ] 기존 코드와 100% 호환

---

## 🔄 마이그레이션 프로세스 (공통)

각 프로젝트마다 다음 프로세스 반복:

### Step 1: 기존 코드 분석 (1일)

```
1. 파일 구조 파악
2. 의존성 목록화
3. 핵심 기능 식별
4. API 인터페이스 정의
```

### Step 2: FreeLang 구조 설계 (0.5일)

```
1. 데이터 구조 (struct) 정의
2. 함수 인터페이스 정의
3. Async/Await 패턴 계획
4. Error handling 계획
```

### Step 3: 핵심 로직 구현 (1-3일)

```
1. 데이터 구조 작성
2. 핵심 함수 구현
3. 테스트 작성
4. 성능 최적화
```

### Step 4: 통합 & 검증 (0.5-1일)

```
1. 전체 기능 테스트
2. 성능 비교 (기존 vs 새로운)
3. 문서화
4. Gogs 커밋
```

---

## 📊 마이그레이션 타임라인

```
Week 5:   freelang-http-server    [████░░░░░░░░░░░░░░░░] 20%
Week 6-7: kim-agent + Proof_ai    [████████░░░░░░░░░░░░] 40%
Week 8-9: v2-freelang-ai + v6     [██████████░░░░░░░░░░] 60%
Final:    Integration & Cleanup   [████████████████████] 100%
```

---

## ✅ 성공 지표

### 개별 프로젝트별

| 프로젝트 | 기능 호환 | 성능 | 테스트 커버리지 |
|---------|----------|------|----------------|
| http-server | 100% | ≤150% | 90%+ |
| kim-agent | 100% | ≤150% | 85%+ |
| Proof_ai | 100% | ≤150% | 85%+ |
| v2-freelang-ai | 100% | ≤150% | 90%+ |
| freelang-v6 | 100% | ≤150% | 85%+ |

### 전체 프로젝트

| 지표 | 목표 |
|------|------|
| **모든 프로젝트 FreeLang화** | 100% |
| **테스트 커버리지** | 90%+ |
| **코드 라인 수** | 기존 대비 +20% (더 명확함) |
| **배포 복잡도** | 1개 VM (vs 5개 런타임) |

---

## 🚨 마이그레이션 중 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| 성능 저하 | 높음 | Week 3에 최적화 단계 추가 |
| 호환성 문제 | 높음 | 각 단계마다 기존 코드와 비교 테스트 |
| Type 시스템 불일치 | 중간 | SPEC_06 엄격히 준수 |
| Async 복잡도 | 중간 | main_extended.c의 async 확장 활용 |

---

## 📝 문서화 요구사항

각 마이그레이션 완료 후:

```
1. Migration Report
   - 기존 코드 vs 새 코드 비교
   - 성능 벤치마크
   - 문제점 & 해결책

2. API Reference
   - FreeLang 인터페이스 문서
   - 사용 예제

3. 배포 가이드
   - ISA v1.0 컴파일 방법
   - VM 실행 방법

4. 트러블슈팅
   - 일반적인 오류
   - 최적화 팁
```

---

**Last Updated**: 2026-03-03
**Status**: 🚀 Ready for Migration
