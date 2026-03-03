# 📋 FreeLang 완전한 언어: 상세 로드맵

**최종 목표**: 2026년 4월 30일까지 모든 프로젝트 FreeLang 통합 완료
**기간**: 9주 (코어 1개월 + 마이그레이션 2개월)
**투입 인력**: Claude (주 40시간) + 사용자 (피드백/검증)

---

## 📅 주간 계획 (Week 1-9)

### **WEEK 1: 기초 구축 (Compiler + Basic StdLib)**

#### 목표
- ✅ ISA Generator 완성
- ✅ async.free, error.free, types.free 작성
- ✅ 첫 프로그램 ISA v1.0 → VM 실행

#### 작업 내역

**Day 1-2: ISA Generator 구현**
```
파일: v2-freelang-ai/src/compiler/isa-generator.ts
작업:
  - AST Node → OpCode 매핑 테이블 작성
  - visitBinaryOp, visitFunctionDef, visitAsyncAwait 구현
  - 레지스터 할당 알고리즘 (register allocation)
  - 바이트코드 최적화 (unused register 제거)

테스트:
  - 기존 SPEC_09~13 예제 모두 컴파일 가능 확인
  - Add (3+5=8) → ISA → VM 실행 검증
```

**Day 3-4: async.free 작성**
```
파일: freelang-stdlib/async.free
내용:
  - Promise<T> 구조체
  - setTimeout, delay 함수
  - async/await 런타임
  - AsyncQueue 구현

예제:
  async fn main() {
    await delay(100)
    print("Async works!")
  }
```

**Day 5: error.free, types.free 작성**
```
파일: freelang-stdlib/error.free
      freelang-stdlib/types.free
내용:
  - Error, Exception 구조체
  - try-catch 런타임 지원
  - 기본 타입 (int, string, bool, array, object)
  - 타입 변환 함수 (toString, toInt, etc)
```

**Day 6-7: 통합 테스트 & 검증**
```
테스트:
  1. Simple arithmetic
     fn add(a: int, b: int) -> int { a + b }
     let x = add(3, 5)  // Result: 8

  2. Async function
     async fn delay_test() {
       await delay(100)
       return 42
     }

  3. Error handling
     try {
       throw Error("Test error")
     } catch(e) {
       print(e.message)
     }

검증:
  - 모든 테스트 ISA v1.0 → VM 통과
  - 바이트코드 크기 < 1KB
  - 실행 시간 < 100ms
```

#### 산출물
```
✅ v2-freelang-ai/src/compiler/isa-generator.ts (300줄)
✅ freelang-stdlib/async.free (100줄)
✅ freelang-stdlib/error.free (50줄)
✅ freelang-stdlib/types.free (80줄)
✅ tests/stage1-basic.free (100줄)
```

#### 성공 기준
- [ ] ISA Generator 컴파일 에러 없음
- [ ] async.free 문법 통과
- [ ] 5개 테스트 모두 ISA v1.0 → VM 실행 성공
- [ ] GitHub & Gogs 커밋

---

### **WEEK 2-3: 필수 StdLib 완성 (I/O, Network, Data)**

#### 목표
- ✅ I/O 모듈 (fs.free, path.free, proc.free)
- ✅ Network 모듈 (http.free, socket.free, stream.free)
- ✅ Data 모듈 (json.free, csv.free, xml.free)
- ✅ Utilities (string.free, array.free, object.free, math.free)

#### 작업 내역

**Week 2, Day 1-3: I/O & System**
```
파일: freelang-stdlib/fs.free
      freelang-stdlib/path.free
      freelang-stdlib/proc.free

구현:
  fs.readFile(path: string) -> string
  fs.writeFile(path: string, content: string) -> void
  fs.exists(path: string) -> bool
  path.join(...parts: string[]) -> string
  path.dirname(path: string) -> string
  proc.getEnv(name: string) -> string?
  proc.exit(code: int) -> void

테스트: 파일 읽고 쓰기, 경로 조작
```

**Week 2, Day 4-7: Network**
```
파일: freelang-stdlib/http.free
      freelang-stdlib/socket.free
      freelang-stdlib/stream.free

구현:
  // HTTP Client
  fn http.get(url: string) -> Response
  fn http.post(url: string, body: object) -> Response

  // HTTP Server
  struct HttpServer {
    listen(port: int) -> void
    onRequest(handler: fn(Request) -> Response) -> void
  }

  // Stream
  fn stream.read(path: string) -> Iterator<byte>
  fn stream.write(data: Iterator<byte>, path: string) -> void

테스트: 간단한 HTTP 요청/응답, 파일 스트림 읽기
```

**Week 3, Day 1-3: Data Formats**
```
파일: freelang-stdlib/json.free
      freelang-stdlib/csv.free
      freelang-stdlib/xml.free

구현:
  // JSON
  fn json.parse(str: string) -> object
  fn json.stringify(obj: object) -> string

  // CSV
  fn csv.parse(str: string) -> array<array<string>>
  fn csv.stringify(data: array<array<string>>) -> string

  // XML
  fn xml.parse(str: string) -> XmlNode
  fn xml.stringify(node: XmlNode) -> string

테스트: JSON 파싱, CSV 읽기, XML 변환
```

**Week 3, Day 4-7: Utilities**
```
파일: freelang-stdlib/string.free
      freelang-stdlib/array.free
      freelang-stdlib/object.free
      freelang-stdlib/math.free

구현:
  // String
  fn string.toUpperCase(s: string) -> string
  fn string.toLowerCase(s: string) -> string
  fn string.trim(s: string) -> string
  fn string.split(s: string, sep: string) -> array<string>
  fn string.replace(s: string, from: string, to: string) -> string

  // Array
  fn array.map<T, U>(arr: array<T>, fn: fn(T) -> U) -> array<U>
  fn array.filter<T>(arr: array<T>, fn: fn(T) -> bool) -> array<T>
  fn array.reduce<T, U>(arr: array<T>, init: U, fn: fn(U, T) -> U) -> U

  // Object
  fn object.keys(obj: object) -> array<string>
  fn object.values(obj: object) -> array<any>
  fn object.merge(obj1: object, obj2: object) -> object

  // Math
  fn math.add(a: int, b: int) -> int
  fn math.sqrt(x: float) -> float
  fn math.sin(x: float) -> float
  fn math.cos(x: float) -> float

테스트: 문자열 조작, 배열 함수형 프로그래밍
```

#### 산출물
```
✅ freelang-stdlib/fs.free (80줄)
✅ freelang-stdlib/path.free (60줄)
✅ freelang-stdlib/proc.free (40줄)
✅ freelang-stdlib/http.free (120줄)
✅ freelang-stdlib/socket.free (100줄)
✅ freelang-stdlib/stream.free (90줄)
✅ freelang-stdlib/json.free (100줄)
✅ freelang-stdlib/csv.free (80줄)
✅ freelang-stdlib/xml.free (100줄)
✅ freelang-stdlib/string.free (100줄)
✅ freelang-stdlib/array.free (120줄)
✅ freelang-stdlib/object.free (90줄)
✅ freelang-stdlib/math.free (80줄)
✅ tests/stage2-stdlib.free (200줄)
```

#### 성공 기준
- [ ] 14개 모듈 모두 구문 검사 통과
- [ ] v2-freelang-ai의 HTTP 기능을 FreeLang으로 재작성 가능
- [ ] 모든 utilities 함수 테스트 통과

---

### **WEEK 4: Database & Cache**

#### 목표
- ✅ SQL 빌더 (sql.free)
- ✅ SQLite 드라이버 (sqlite.free)
- ✅ PostgreSQL 드라이버 (postgres.free)
- ✅ Cache 모듈 (cache.free, redis.free)
- ✅ Transaction 관리 (transaction.free)

#### 작업 내역

**Day 1-3: SQL & Database**
```
파일: freelang-stdlib/sql.free
      freelang-stdlib/sqlite.free
      freelang-stdlib/postgres.free

구현:
  // SQL Query Builder
  fn sql.select(columns: array<string>) -> QueryBuilder
  fn sql.where(condition: string) -> QueryBuilder
  fn sql.limit(n: int) -> QueryBuilder

  // SQLite
  struct SqliteDB {
    open(path: string) -> void
    exec(query: string) -> array<object>
    insert(table: string, row: object) -> void
    update(table: string, row: object) -> void
    delete(table: string, where: string) -> void
    close() -> void
  }

  // PostgreSQL (유사)

테스트: 테이블 생성, CRUD 작업, 트랜잭션
```

**Day 4-7: Cache & Advanced**
```
파일: freelang-stdlib/cache.free
      freelang-stdlib/redis.free
      freelang-stdlib/transaction.free

구현:
  // In-memory Cache
  struct Cache<K, V> {
    set(key: K, value: V, ttl?: int) -> void
    get(key: K) -> V?
    delete(key: K) -> void
    clear() -> void
  }

  // Redis Client
  fn redis.connect(host: string, port: int) -> RedisClient
  fn redis.set(key: string, value: string, ttl?: int) -> void
  fn redis.get(key: string) -> string?

  // Transactions
  async fn transaction<T>(db: DB, fn: fn() -> T) -> T
    // Auto rollback on error

테스트: 캐시 읽기/쓰기, Redis 연결, 트랜잭션 롤백
```

#### 산출물
```
✅ freelang-stdlib/sql.free (150줄)
✅ freelang-stdlib/sqlite.free (120줄)
✅ freelang-stdlib/postgres.free (120줄)
✅ freelang-stdlib/cache.free (100줄)
✅ freelang-stdlib/redis.free (100줄)
✅ freelang-stdlib/transaction.free (80줄)
✅ tests/stage3-database.free (150줄)
```

#### 성공 기준
- [ ] SQLite 테이블 생성/읽기/쓰기 가능
- [ ] PostgreSQL 연결 가능
- [ ] 트랜잭션 롤백 정상 작동

---

### **WEEK 5: 첫 번째 마이그레이션 (freelang-http-server)**

#### 목표
- ✅ freelang-http-server 완전 FreeLang 재작성
- ✅ 기존 기능과 100% 호환
- ✅ 성공 검증 및 배포

#### 작업 내역

**Day 1-3: 마이그레이션**
```
대상: freelang-http-server (기존 TypeScript)
      ↓
FreeLang 재작성

기존 기능:
  - HTTP 서버 (포트 8080)
  - GET /api/health → {"status": "ok"}
  - GET /api/version → {"version": "1.0.0"}
  - POST /api/data → JSON 저장
  - GET /api/data/:id → JSON 조회

새로운 FreeLang 구현:
  struct HttpServer {
    routes: array<Route>,
    ...
  }

  async fn main() {
    let server = HttpServer()
    server.get("/api/health", (req) => {
      return { status: "ok" }
    })
    server.post("/api/data", (req) => {
      // 데이터 저장
    })
    await server.listen(8080)
  }
```

**Day 4-5: 테스트 & 검증**
```
테스트:
  1. HTTP 요청 → 올바른 응답
  2. JSON 파싱/응답
  3. 에러 처리 (404, 500)
  4. 동시 요청 처리 (async)

성능 비교:
  - 기존 TypeScript 버전: X ms/req
  - 새로운 FreeLang 버전: Y ms/req
  - 목표: Y ≤ X * 1.5 (최대 50% 느린 것 허용)
```

**Day 6-7: 배포 & 문서화**
```
배포:
  1. ISA v1.0 바이트코드 생성
  2. C VM으로 실행
  3. Gogs 저장소에 올리기

문서화:
  - Migration report 작성
  - 성능 분석 포함
  - 추후 다른 프로젝트 마이그레이션 가이드 작성
```

#### 산출물
```
✅ projects/freelang-http-server/main.free (200줄)
✅ projects/freelang-http-server/handlers.free (150줄)
✅ projects/freelang-http-server/models.free (100줄)
✅ migration-report-http-server.md (마이그레이션 분석)
```

#### 성공 기준
- [ ] 모든 엔드포인트 정상 작동
- [ ] 성능 요구사항 충족 (Y ≤ X * 1.5)
- [ ] 자동 테스트 모두 통과 (FreeLang으로 작성)
- [ ] Gogs 배포

---

### **WEEK 6-7: 중형 프로젝트 마이그레이션**

#### 대상 1: kim-agent

**목표**:
- Tool execution → FreeLang
- API calls → FreeLang
- Async orchestration → FreeLang

**예상 분량**: 400줄 → 600줄 (FreeLang이 더 verbose할 수 있음)

#### 대상 2: Proof_ai

**목표**:
- API endpoints → FreeLang
- Business logic → FreeLang
- Error handling → FreeLang

**예상 분량**: 500줄 → 700줄

#### 성공 기준
- [ ] 2개 프로젝트 모두 마이그레이션 완료
- [ ] 기존 기능 100% 호환
- [ ] 성능 요구사항 충족
- [ ] 자동 테스트 통과

---

### **WEEK 8-9: 대형 프로젝트 마이그레이션**

#### 대상 1: v2-freelang-ai

**가장 복잡한 프로젝트**
- Compiler 로직
- Type system 구현
- Multiple modules

**마이그레이션 순서**:
1. Lexer → FreeLang
2. Parser → FreeLang
3. Type Checker → FreeLang
4. ISA Generator → FreeLang (이미 부분 완성)

#### 대상 2: freelang-v6

**언어 코어**
- Type definitions
- Module system
- Advanced features

#### 최종 통합

**Week 9 Day 5-7**:
- 모든 마이그레이션 완료
- 완전한 언어 생태계 검증
- 성능 최적화
- 문서화 최종 점검

---

## 📊 마일스톤별 진도

```
Week 1   ████░░░░░░░░░░░░░░░░░░░░░░ 15%  (기초 구축)
Week 2-3 ████████░░░░░░░░░░░░░░░░░░░ 35%  (StdLib)
Week 4   ██████████░░░░░░░░░░░░░░░░░ 50%  (DB & Cache)
Week 5   ███████████░░░░░░░░░░░░░░░░ 55%  (첫 마이그레이션)
Week 6-7 ████████████████░░░░░░░░░░░ 75%  (중형 프로젝트)
Week 8-9 ██████████████████████████░░ 95%  (대형 프로젝트)
Done     ███████████████████████████░ 100% (완성)
```

---

## 🎯 핵심 지표 (KPI)

| 지표 | 목표 | Week 1 | Week 3 | Week 5 | Week 9 |
|------|------|--------|--------|--------|--------|
| **마이그레이션된 프로젝트** | 모두 | 0 | 0 | 1 | 6+ |
| **StdLib 모듈** | 20+ | 3 | 14 | 14 | 20+ |
| **테스트 커버리지** | 90%+ | 80% | 85% | 90% | 95% |
| **성능 (vs 기존)** | ≤150% | - | - | 120% | 110% |
| **바이트코드 크기** | 최소화 | X MB | Y MB | ↓ | ↓↓ |

---

## 🔧 기술 요구사항

### Compiler 요구사항
```
Input: FreeLang 소스코드 (*.free)
Output: ISA v1.0 바이트코드 (*.isa)

처리 파이프라인:
  1. Lexer: 소스코드 → 토큰 스트림
  2. Parser: 토큰 → AST
  3. Type Checker: AST → 타입 검사
  4. ISA Generator: AST → 바이트코드
  5. Optimizer: 바이트코드 → 최적화 바이트코드
```

### Runtime 요구사항
```
VM: C 구현 (main_extended.c 기반)

지원 기능:
  - ISA v1.0 명령어 (22개)
  - Exception handling (setjmp/longjmp)
  - Async queue (delay 기반 스케줄링)
  - Memory management
  - I/O operations
```

### StdLib 요구사항
```
각 모듈은:
  1. FreeLang으로 작성
  2. Type-safe (SPEC_06 준수)
  3. Error handling (SPEC_13 준수)
  4. Async 지원 (SPEC_11 준수)
  5. 100% 테스트 커버리지
```

---

## 📈 성공 사례 시나리오

### Week 5 이후: 완전한 언어 첫 증명

```
✅ Compiler 완성
✅ StdLib 20+ 모듈
✅ freelang-http-server 마이그레이션 성공
   → 이제 다른 프로젝트도 FreeLang화 가능함을 증명

✅ kim-agent, Proof_ai 마이그레이션
   → API 로직을 FreeLang으로 작성 가능함을 증명

✅ v2-freelang-ai 마이그레이션
   → Compiler 자체를 FreeLang으로 작성 가능함을 증명
   → 순환 구조 완성 (FreeLang Compiler를 FreeLang으로 작성)

최종 결과:
  - 모든 계층: 단일 언어 (FreeLang)
  - 단일 런타임: C VM
  - 완전한 타입 시스템
  - 자동 테스트 생태계
```

---

## ⚠️ 위험 요소 & 대응

| 위험 | 영향 | 대응책 |
|------|------|--------|
| **Compiler 버그** | 높음 | 단계적 테스트 (Day 1부터) |
| **성능 저하** | 중간 | 최적화 단계 추가 (Week 4) |
| **마이그레이션 복잡도** | 높음 | 단순 프로젝트부터 시작 |
| **타입 시스템 불일치** | 높음 | SPEC_06 엄격하게 준수 |
| **Async 구현 이슈** | 중간 | main_extended.c의 async 확장 |

---

## 📝 문서화 계획

각 Week마다:
- [ ] Phase 완료 보고서
- [ ] 마이그레이션 가이드
- [ ] 성능 분석
- [ ] 문제점 & 해결책

최종:
- [ ] 전체 아키텍처 문서
- [ ] API 리퍼런스
- [ ] 사용자 가이드
- [ ] 개발자 가이드

---

**Last Updated**: 2026-03-03
**Status**: 🚀 Ready to Launch
