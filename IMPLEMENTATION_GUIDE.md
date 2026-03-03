# 🔧 FreeLang 완전한 언어: 구현 가이드

**목적**: Stage 1~7 각 단계별 구현 방법 상세 설명
**대상**: 개발자, AI 코드 생성 시스템

---

## 📌 빠른 시작 (Quick Start)

### Stage 1: Compiler 구현 (1주)

#### Step 1: 프로젝트 구조 생성

```bash
# Gogs 저장소 생성
mkdir -p /home/kim/freelang-complete-language
cd /home/kim/freelang-complete-language
git init

# 디렉토리 구조
mkdir -p {compiler,stdlib,phases,specs,examples}
touch README.md ROADMAP.md ARCHITECTURE.md IMPLEMENTATION_GUIDE.md
```

#### Step 2: ISA Generator 작성

**파일**: `compiler/isa-generator.ts`

```typescript
/**
 * AST → ISA v1.0 바이트코드 생성기
 *
 * 입력: Program (SPEC_05 Parser의 결과)
 * 출력: uint8[] (바이트코드)
 */

import { Program, FunctionDef, BinaryOp, AwaitExpression } from '../ast';
import { OpCode } from '../isa';

export class ISAGenerator {
  private bytecode: uint8[] = [];
  private symbolTable: Map<string, number> = new Map();  // 변수 → 레지스터 매핑
  private registerCount = 0;
  private labelCount = 0;
  private functionLabels: Map<string, number> = new Map();

  /**
   * 프로그램 생성
   *
   * Algorithm:
   * 1. 모든 함수 정의 수집 (label 할당)
   * 2. main 함수 실행 코드 생성
   * 3. OP_HALT로 종료
   */
  generate(program: Program): uint8[] {
    // Phase 1: 함수 레이블 수집
    for (const stmt of program.statements) {
      if (stmt.type === 'function_def') {
        const funcDef = stmt as FunctionDef;
        this.functionLabels.set(funcDef.name, this.bytecode.length);
      }
    }

    // Phase 2: 코드 생성
    for (const stmt of program.statements) {
      this.visitStatement(stmt);
    }

    // Phase 3: 프로그램 종료
    this.emit(OpCode.OP_HALT);

    return this.bytecode;
  }

  /**
   * Statement 방문
   */
  private visitStatement(stmt: any): void {
    switch (stmt.type) {
      case 'function_def':
        this.visitFunctionDef(stmt as FunctionDef);
        break;
      case 'let_binding':
        this.visitLetBinding(stmt);
        break;
      case 'expression_stmt':
        this.visitExpression(stmt.expression);
        break;
      case 'return_stmt':
        this.emit(OpCode.OP_RET);
        break;
      case 'try_stmt':
        this.visitTryStatement(stmt);
        break;
      case 'while_stmt':
        this.visitWhileLoop(stmt);
        break;
      case 'for_of_stmt':
        this.visitForOfLoop(stmt);
        break;
    }
  }

  /**
   * 함수 정의
   *
   * ISA:
   *   [label]: [프롤로그]
   *           [본체]
   *           [에필로그]
   *           RET
   */
  private visitFunctionDef(funcDef: FunctionDef): void {
    const label = this.functionLabels.get(funcDef.name)!;

    // 파라미터를 레지스터에 할당
    let paramReg = 0;
    for (const param of funcDef.params) {
      this.symbolTable.set(param.name, paramReg++);
    }

    // 함수 본체 생성
    for (const stmt of funcDef.body) {
      this.visitStatement(stmt);
    }

    // 에필로그 (명시적 return이 없으면 0 반환)
    if (funcDef.body.length === 0 ||
        (funcDef.body[funcDef.body.length - 1].type !== 'return_stmt')) {
      // r0 = 0 (기본 반환값)
      this.emit(OpCode.OP_NOP);
    }
    this.emit(OpCode.OP_RET);
  }

  /**
   * 이진 연산 (a + b, a - b, etc)
   *
   * 예: a + b
   *   MOV r0, [a]       # r0 = a
   *   MOV r1, [b]       # r1 = b
   *   ADD r2, r0, r1    # r2 = r0 + r1 = a + b
   *   → r2 반환
   */
  private visitBinaryOp(expr: BinaryOp): number {
    const left = this.visitExpression(expr.left);
    const right = this.visitExpression(expr.right);
    const result = this.allocateRegister();

    switch (expr.op) {
      case '+':
        this.emit(OpCode.OP_ADD, result, left, right);
        break;
      case '-':
        this.emit(OpCode.OP_SUB, result, left, right);
        break;
      case '*':
        this.emit(OpCode.OP_MUL, result, left, right);
        break;
      case '/':
        this.emit(OpCode.OP_DIV, result, left, right);
        break;
      default:
        throw new Error(`Unknown operator: ${expr.op}`);
    }

    return result;
  }

  /**
   * Async/Await
   *
   * await delay(100)
   * ISA:
   *   PUSH IP           # 돌아올 주소 저장
   *   CALL delay_label  # delay 함수 호출
   *   ... (event loop 처리)
   */
  private visitAwaitExpression(expr: AwaitExpression): number {
    const callee = this.visitExpression(expr.argument);

    // async 함수 호출
    const result = this.allocateRegister();
    this.emit(OpCode.OP_CALL, callee);

    return result;
  }

  /**
   * Try-Catch
   *
   * try {
   *   a / b
   * } catch(e) {
   *   print(e)
   * }
   *
   * ISA:
   *   TRY_BEGIN catch_label
   *   DIV r0, r1, r2        # 예외 발생 가능
   *   TRY_END
   *   JMP skip_label
   * catch_label:
   *   CATCH r0              # 에러 캐치
   * skip_label:
   */
  private visitTryStatement(stmt: any): void {
    const catchLabel = this.createLabel();
    const skipLabel = this.createLabel();

    // TRY 시작
    this.emit(OpCode.OP_TRY_BEGIN, catchLabel >> 8, catchLabel & 0xFF);

    // Try 본체
    for (const s of stmt.try_body) {
      this.visitStatement(s);
    }

    this.emit(OpCode.OP_TRY_END);
    this.emit(OpCode.OP_JMP, skipLabel >> 8, skipLabel & 0xFF);

    // Catch 핸들러
    this.patchLabel(catchLabel);
    for (const s of stmt.catch_body) {
      this.visitStatement(s);
    }

    // Skip 레이블
    this.patchLabel(skipLabel);
  }

  /**
   * While 루프
   *
   * while (i < 10) {
   *   i = i + 1
   * }
   *
   * ISA:
   * loop_label:
   *   CMP r0, r1      # i < 10 ?
   *   JMP_IF E, exit  # 조건 거짓이면 탈출
   *   ... (루프 본체)
   *   JMP loop_label
   * exit_label:
   */
  private visitWhileLoop(stmt: any): void {
    const loopLabel = this.createLabel();
    const exitLabel = this.createLabel();

    // 루프 시작
    this.patchLabel(loopLabel);

    // 조건 검사
    const cond = this.visitExpression(stmt.condition);
    this.emit(OpCode.OP_JMP_IF, 0, exitLabel >> 8, exitLabel & 0xFF);

    // 루프 본체
    for (const s of stmt.body) {
      this.visitStatement(s);
    }

    // 루프 반복
    this.emit(OpCode.OP_JMP, loopLabel >> 8, loopLabel & 0xFF);

    // 탈출
    this.patchLabel(exitLabel);
  }

  /**
   * for...of 루프
   *
   * for (item of array) {
   *   print(item)
   * }
   *
   * ISA:
   *   FOR_INIT r0, array.length
   * loop_label:
   *   ... (루프 본체)
   *   FOR_NEXT r0, loop_label
   */
  private visitForOfLoop(stmt: any): void {
    const iterable = this.visitExpression(stmt.iterable);
    const loopVar = this.allocateRegister();
    const loopLabel = this.createLabel();

    // Iterator 초기화
    this.emit(OpCode.OP_FOR_INIT, loopVar, 0, 0, 10); // TODO: 실제 길이 계산

    this.patchLabel(loopLabel);

    // 루프 본체
    this.symbolTable.set(stmt.variable, loopVar);
    for (const s of stmt.body) {
      this.visitStatement(s);
    }

    // Iterator 다음 요소
    this.emit(OpCode.OP_FOR_NEXT, loopVar, loopLabel >> 8, loopLabel & 0xFF);
  }

  /**
   * Expression 방문 (값을 반환)
   */
  private visitExpression(expr: any): number {
    if (expr.type === 'binary_op') {
      return this.visitBinaryOp(expr);
    } else if (expr.type === 'identifier') {
      return this.symbolTable.get(expr.name) || 0;
    } else if (expr.type === 'literal') {
      const reg = this.allocateRegister();
      // MOV reg, value (리터럴 값을 상수로 로드)
      return reg;
    } else if (expr.type === 'await') {
      return this.visitAwaitExpression(expr);
    } else if (expr.type === 'call') {
      return this.visitCall(expr);
    }
    return 0;
  }

  /**
   * 함수 호출
   *
   * add(3, 5)
   * ISA:
   *   MOV r0, 3         # arg1
   *   MOV r1, 5         # arg2
   *   CALL add_label
   *   # r0에 결과 저장
   */
  private visitCall(expr: any): number {
    const funcName = expr.function.name;
    const funcLabel = this.functionLabels.get(funcName);

    if (!funcLabel) {
      throw new Error(`Unknown function: ${funcName}`);
    }

    // 인자 로드
    for (let i = 0; i < expr.arguments.length; i++) {
      const argReg = i;
      const argValue = this.visitExpression(expr.arguments[i]);
      if (argValue !== argReg) {
        this.emit(OpCode.OP_MOV, argReg, argValue);
      }
    }

    // 함수 호출
    this.emit(OpCode.OP_CALL, funcLabel >> 8, funcLabel & 0xFF);

    // 반환값은 r0에 있음
    return 0;
  }

  /**
   * Let 바인딩
   * let x = 10
   */
  private visitLetBinding(stmt: any): void {
    const reg = this.allocateRegister();
    this.symbolTable.set(stmt.name, reg);

    const exprReg = this.visitExpression(stmt.value);
    if (exprReg !== reg) {
      this.emit(OpCode.OP_MOV, reg, exprReg);
    }
  }

  // ===== Helper Methods =====

  private allocateRegister(): number {
    return this.registerCount++;
  }

  private createLabel(): number {
    return this.labelCount++;
  }

  private patchLabel(label: number): void {
    // 나중에 label을 실제 주소로 변환
    // 현재 단순 구현
  }

  private emit(op: OpCode, ...args: number[]): void {
    this.bytecode.push(op);
    this.bytecode.push(...args);
  }

  private emitWord(value: number): void {
    this.bytecode.push(value >> 8);
    this.bytecode.push(value & 0xFF);
  }
}

/**
 * 사용 예제:
 *
 * const source = `
 *   fn add(a: int, b: int) -> int {
 *     a + b
 *   }
 *
 *   let x = add(3, 5)
 *   print(x)
 * `;
 *
 * const ast = parser.parse(source);
 * const generator = new ISAGenerator();
 * const bytecode = generator.generate(ast);
 *
 * // bytecode → C VM에서 실행
 * vm.run(bytecode);
 */
```

#### Step 3: 테스트

**파일**: `tests/test-isa-generator.ts`

```typescript
import { ISAGenerator } from '../compiler/isa-generator';
import { Parser } from '../parser';

describe('ISA Generator', () => {
  it('should generate bytecode for simple addition', () => {
    const source = `
      fn add(a: int, b: int) -> int {
        a + b
      }

      let result = add(3, 5)
    `;

    const ast = Parser.parse(source);
    const generator = new ISAGenerator();
    const bytecode = generator.generate(ast);

    expect(bytecode.length).toBeGreaterThan(0);
    expect(bytecode[bytecode.length - 1]).toBe(OpCode.OP_HALT);
  });

  it('should generate bytecode for async function', () => {
    const source = `
      async fn delayed_add(a: int, b: int) -> int {
        await delay(100)
        return a + b
      }
    `;

    const ast = Parser.parse(source);
    const generator = new ISAGenerator();
    const bytecode = generator.generate(ast);

    // 바이트코드에 TRY_BEGIN/TRY_END 포함되어야 함
    expect(bytecode.includes(OpCode.OP_TRY_BEGIN)).toBe(true);
  });

  it('should generate bytecode for try-catch', () => {
    const source = `
      try {
        let x = 10 / 0
      } catch(e) {
        print("Error")
      }
    `;

    const ast = Parser.parse(source);
    const generator = new ISAGenerator();
    const bytecode = generator.generate(ast);

    expect(bytecode.includes(OpCode.OP_TRY_BEGIN)).toBe(true);
    expect(bytecode.includes(OpCode.OP_CATCH)).toBe(true);
  });
});
```

### Step 4: async.free 작성

**파일**: `stdlib/async.free`

```freelang
// async.free - Async 런타임

/**
 * Promise<T>: 비동기 작업의 결과를 나타냄
 */
struct Promise<T> {
  value: T?,
  error: Error?,
  resolved: bool,
  pending: bool,
  callbacks: fn(T) -> void[]
}

/**
 * AsyncTask: Async queue의 작업
 */
struct AsyncTask {
  id: uint,
  delay_ms: uint,
  scheduled_at: uint64,
  callback: fn() -> void,
  completed: bool,
  result: any?
}

/**
 * setTimeout: 지정된 시간 후 콜백 실행
 *
 * Example:
 *   setTimeout(() => {
 *     print("1초 후 실행")
 *   }, 1000)
 */
fn setTimeout(callback: fn() -> void, delay_ms: uint) -> uint {
  // ISA: async_queue_add 호출
  // Returns: task ID
  return 0  // TODO: 구현
}

/**
 * delay: async 함수에서 대기
 *
 * Example:
 *   async fn wait_then_print() {
 *     await delay(1000)
 *     print("1초 경과")
 *   }
 */
async fn delay(ms: uint) -> void {
  // setInterval 루프로 구현
  let start = now()
  while (now() - start < ms) {
    // Spin wait 또는 yield
  }
}

/**
 * Promise: 미래의 값을 나타냄
 */
fn promise<T>(executor: fn(resolve: fn(T), reject: fn(Error)) -> void) -> Promise<T> {
  let p = Promise<T> {
    value: null,
    error: null,
    resolved: false,
    pending: true,
    callbacks: []
  }

  fn resolve(value: T) {
    p.value = value
    p.pending = false
    p.resolved = true
    // callbacks 실행
  }

  fn reject(error: Error) {
    p.error = error
    p.pending = false
    // callbacks 실행
  }

  executor(resolve, reject)
  return p
}

/**
 * async/await의 런타임 지원
 */
async fn main() {
  print("Start")

  await delay(100)
  print("After 100ms")

  await delay(200)
  print("After 200ms more")
}
```

---

## 🎯 각 단계별 검증 체크리스트

### Stage 1 완료 체크리스트

```
Day 1-2: ISA Generator
  [ ] isa-generator.ts 구현 완료
  [ ] TypeScript 컴파일 에러 없음
  [ ] 기본 연산 (ADD, SUB, MUL, DIV) 코드 생성 가능
  [ ] 함수 호출 코드 생성 가능

Day 3-4: async.free
  [ ] async.free 구문 검사 통과
  [ ] setTimeout 함수 정의 완료
  [ ] delay 함수 정의 완료
  [ ] promise 함수 정의 완료

Day 5: error.free, types.free
  [ ] error.free 구문 검사 통과
  [ ] types.free 구문 검사 통과
  [ ] 기본 타입 (int, string, bool, array, object) 정의

Day 6-7: 통합 테스트
  [ ] Simple arithmetic → ISA → VM 실행 성공
  [ ] Async function → ISA → VM 실행 성공
  [ ] Try-catch → ISA → VM 실행 성공
  [ ] 5개 테스트 모두 통과
  [ ] GitHub & Gogs 커밋 완료
```

---

## 📚 참고 자료

- [ISA v1.0 명세](./specs/ISA_v1_0.md)
- [Type System (SPEC_06)](./specs/SPEC_06_TYPE_SYSTEM.md)
- [Error Handling (SPEC_13)](./specs/SPEC_13_ERROR_HANDLING.md)
- [Parser (SPEC_05)](./specs/SPEC_05_PARSER.md)

---

**Last Updated**: 2026-03-03
