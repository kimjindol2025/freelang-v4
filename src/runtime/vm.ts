/**
 * FreeLang Virtual Machine
 * 스택 기반의 간단한 인터프리터
 */

import { Value, ValueHandler } from './value';
import { Instruction, OpcodeType } from './bytecode';

/**
 * 함수 호출 프레임
 */
interface Frame {
  name: string;
  returnAddr: number;
  localVariables: Map<number, Value>;
}

/**
 * 런타임 에러
 */
export class RuntimeError extends Error {
  constructor(
    message: string,
    public line: number = 0,
    public column: number = 0
  ) {
    super(message);
    this.name = 'RuntimeError';
  }
}

/**
 * FreeLang Virtual Machine
 */
export class VirtualMachine {
  private stack: Value[] = [];
  private memory: Map<number, Value> = new Map(); // 힙 메모리
  private globals: Map<string, Value> = new Map(); // 전역 변수
  private locals: Map<number, Value> = new Map(); // 지역 변수
  private callStack: Frame[] = [];
  private pc: number = 0; // 프로그램 카운터
  private instructions: Instruction[] = [];
  private builtins: Map<string, Function> = new Map();
  private nextPtr: number = 0; // 메모리 포인터

  constructor() {
    this.registerBuiltins();
  }

  /**
   * 표준 내장 함수 등록
   */
  private registerBuiltins(): void {
    // 나중에 stdlib 모듈에서 자동으로 등록됨
  }

  /**
   * Bytecode 실행
   */
  public execute(instructions: Instruction[]): Value {
    this.instructions = instructions;
    this.pc = 0;
    this.stack = [];

    try {
      while (this.pc < instructions.length) {
        const instr = instructions[this.pc];
        this.executeInstruction(instr);
        this.pc++;
      }
      return this.stack.pop() || { type: 'null' };
    } catch (error) {
      if (error instanceof RuntimeError) {
        throw error;
      }
      throw new RuntimeError(
        `VM Error: ${error instanceof Error ? error.message : String(error)}`,
        instructions[this.pc]?.line || 0,
        instructions[this.pc]?.column || 0
      );
    }
  }

  /**
   * 개별 명령어 실행
   */
  private executeInstruction(instr: Instruction): void {
    switch (instr.op) {
      case OpcodeType.PUSH:
        this.stack.push(instr.arg);
        break;

      case OpcodeType.POP:
        if (this.stack.length === 0) {
          throw new RuntimeError('Stack underflow');
        }
        this.stack.pop();
        break;

      case OpcodeType.DUP:
        if (this.stack.length === 0) {
          throw new RuntimeError('Stack underflow');
        }
        const top = this.stack[this.stack.length - 1];
        this.stack.push(ValueHandler.clone(top));
        break;

      // 산술 연산
      case OpcodeType.ADD:
        this.binaryOp((a, b) => a + b, instr);
        break;

      case OpcodeType.SUB:
        this.binaryOp((a, b) => a - b, instr);
        break;

      case OpcodeType.MUL:
        this.binaryOp((a, b) => a * b, instr);
        break;

      case OpcodeType.DIV:
        this.binaryOp((a, b) => {
          if (b === 0) throw new RuntimeError('Division by zero');
          return a / b;
        }, instr);
        break;

      case OpcodeType.MOD:
        this.binaryOp((a, b) => {
          if (b === 0) throw new RuntimeError('Division by zero');
          return a % b;
        }, instr);
        break;

      // 비교 연산
      case OpcodeType.EQ: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result = ValueHandler.equals(a, b);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      case OpcodeType.NE: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result = !ValueHandler.equals(a, b);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      case OpcodeType.LT: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result = ValueHandler.lessThan(a, b);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      case OpcodeType.LTE: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result =
          ValueHandler.lessThan(a, b) || ValueHandler.equals(a, b);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      case OpcodeType.GT: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result = ValueHandler.lessThan(b, a);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      case OpcodeType.GTE: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result =
          ValueHandler.lessThan(b, a) || ValueHandler.equals(a, b);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      // 논리 연산
      case OpcodeType.AND: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result =
          ValueHandler.toBoolean(a) && ValueHandler.toBoolean(b);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      case OpcodeType.OR: {
        const b = this.popValue(instr);
        const a = this.popValue(instr);
        const result =
          ValueHandler.toBoolean(a) || ValueHandler.toBoolean(b);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      case OpcodeType.NOT: {
        const a = this.popValue(instr);
        const result = !ValueHandler.toBoolean(a);
        this.stack.push({ type: 'bool', value: result });
        break;
      }

      // 제어 흐름
      case OpcodeType.JUMP:
        this.pc = instr.arg - 1; // -1은 pc++이 되기 때문
        break;

      case OpcodeType.JUMP_IF_TRUE: {
        const cond = this.popValue(instr);
        if (ValueHandler.toBoolean(cond)) {
          this.pc = instr.arg - 1;
        }
        break;
      }

      case OpcodeType.JUMP_IF_FALSE: {
        const cond = this.popValue(instr);
        if (!ValueHandler.toBoolean(cond)) {
          this.pc = instr.arg - 1;
        }
        break;
      }

      // 변수 접근
      case OpcodeType.LOAD_LOCAL: {
        const index = instr.arg;
        const value = this.locals.get(index) || { type: 'null' };
        this.stack.push(value);
        break;
      }

      case OpcodeType.STORE_LOCAL: {
        const index = instr.arg;
        const value = this.popValue(instr);
        this.locals.set(index, value);
        break;
      }

      case OpcodeType.LOAD_GLOBAL: {
        const name = instr.arg;
        const value = this.globals.get(name) || { type: 'null' };
        this.stack.push(value);
        break;
      }

      case OpcodeType.STORE_GLOBAL: {
        const name = instr.arg;
        const value = this.popValue(instr);
        this.globals.set(name, value);
        break;
      }

      case OpcodeType.PRINT: {
        const value = this.popValue(instr);
        process.stdout.write(ValueHandler.toString(value));
        break;
      }

      case OpcodeType.HALT:
        this.pc = this.instructions.length; // 프로그램 종료
        break;

      case OpcodeType.NOP:
        // No operation
        break;

      default:
        throw new RuntimeError(`Unknown opcode: ${instr.op}`);
    }
  }

  /**
   * 이진 연산 수행
   */
  private binaryOp(
    op: (a: number, b: number) => number,
    instr: Instruction
  ): void {
    const b = this.popNumber(instr);
    const a = this.popNumber(instr);
    const result = op(a, b);

    // 결과 타입 결정 (정수인지 실수인지)
    const isInt = Number.isInteger(result);
    this.stack.push(
      isInt ? { type: 'int', value: result } : { type: 'float', value: result }
    );
  }

  /**
   * 스택에서 Value 팝
   */
  private popValue(instr: Instruction): Value {
    if (this.stack.length === 0) {
      throw new RuntimeError('Stack underflow', instr.line, instr.column);
    }
    return this.stack.pop()!;
  }

  /**
   * 스택에서 숫자 팝
   */
  private popNumber(instr: Instruction): number {
    const value = this.popValue(instr);
    if (value.type !== 'int' && value.type !== 'float') {
      throw new RuntimeError(
        `Expected number, got ${value.type}`,
        instr.line,
        instr.column
      );
    }
    return value.value;
  }

  /**
   * 내장 함수 등록
   */
  public registerBuiltin(name: string, fn: Function): void {
    this.builtins.set(name, fn);
  }

  /**
   * 내장 함수 호출
   */
  public callBuiltin(name: string, args: Value[]): Value {
    const fn = this.builtins.get(name);
    if (!fn) {
      throw new RuntimeError(`Unknown builtin function: ${name}`);
    }
    return fn(this, args) as Value;
  }

  /**
   * 스택 상태 확인 (디버깅용)
   */
  public getStackTrace(): string {
    const trace: string[] = [];
    trace.push(`PC: ${this.pc}`);
    trace.push(`Stack (${this.stack.length} items):`);
    this.stack.forEach((v, i) => {
      trace.push(`  [${i}] ${ValueHandler.toString(v)}`);
    });
    return trace.join('\n');
  }
}
