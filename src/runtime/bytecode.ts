/**
 * FreeLang Bytecode Definition
 * 스택 머신의 모든 명령어를 정의
 */

import { Value } from './value';

/**
 * 모든 Bytecode 연산 타입
 */
export enum OpcodeType {
  // 스택 연산
  PUSH = 'PUSH',
  POP = 'POP',
  DUP = 'DUP',

  // 산술 연산
  ADD = 'ADD',
  SUB = 'SUB',
  MUL = 'MUL',
  DIV = 'DIV',
  MOD = 'MOD',

  // 논리 연산
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // 비교 연산
  EQ = 'EQ',
  NE = 'NE',
  LT = 'LT',
  LTE = 'LTE',
  GT = 'GT',
  GTE = 'GTE',

  // 제어 흐름
  JUMP = 'JUMP',
  JUMP_IF_TRUE = 'JUMP_IF_TRUE',
  JUMP_IF_FALSE = 'JUMP_IF_FALSE',
  CALL = 'CALL',
  RETURN = 'RETURN',

  // 변수 접근
  LOAD_LOCAL = 'LOAD_LOCAL',
  STORE_LOCAL = 'STORE_LOCAL',
  LOAD_GLOBAL = 'LOAD_GLOBAL',
  STORE_GLOBAL = 'STORE_GLOBAL',

  // 배열/객체 연산
  LOAD_ARRAY = 'LOAD_ARRAY',
  STORE_ARRAY = 'STORE_ARRAY',
  LOAD_OBJECT = 'LOAD_OBJECT',
  STORE_OBJECT = 'STORE_OBJECT',

  // 타입 변환
  TO_INT = 'TO_INT',
  TO_FLOAT = 'TO_FLOAT',
  TO_STRING = 'TO_STRING',
  TO_BOOL = 'TO_BOOL',

  // 함수 호출
  CALL_BUILTIN = 'CALL_BUILTIN',

  // 기타
  PRINT = 'PRINT',
  HALT = 'HALT',
  NOP = 'NOP',
}

/**
 * 단일 Bytecode 명령어
 */
export interface Instruction {
  op: OpcodeType;
  arg?: any; // 명령어 인자 (값에 따라 다름)
  line: number; // 소스 코드 라인 번호 (디버깅용)
  column: number; // 소스 코드 열 번호 (디버깅용)
}

/**
 * Bytecode 빌더 - 명령어를 생성하기 편하게 함
 */
export class BytecodeBuilder {
  private instructions: Instruction[] = [];
  private lineNo: number = 1;
  private colNo: number = 1;

  setLocation(line: number, col: number): void {
    this.lineNo = line;
    this.colNo = col;
  }

  push(value: Value): this {
    this.instructions.push({
      op: OpcodeType.PUSH,
      arg: value,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  pop(): this {
    this.instructions.push({
      op: OpcodeType.POP,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  dup(): this {
    this.instructions.push({
      op: OpcodeType.DUP,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  add(): this {
    this.instructions.push({
      op: OpcodeType.ADD,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  sub(): this {
    this.instructions.push({
      op: OpcodeType.SUB,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  mul(): this {
    this.instructions.push({
      op: OpcodeType.MUL,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  div(): this {
    this.instructions.push({
      op: OpcodeType.DIV,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  mod(): this {
    this.instructions.push({
      op: OpcodeType.MOD,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  eq(): this {
    this.instructions.push({
      op: OpcodeType.EQ,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  ne(): this {
    this.instructions.push({
      op: OpcodeType.NE,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  lt(): this {
    this.instructions.push({
      op: OpcodeType.LT,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  jump(target: number): this {
    this.instructions.push({
      op: OpcodeType.JUMP,
      arg: target,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  jumpIfTrue(target: number): this {
    this.instructions.push({
      op: OpcodeType.JUMP_IF_TRUE,
      arg: target,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  jumpIfFalse(target: number): this {
    this.instructions.push({
      op: OpcodeType.JUMP_IF_FALSE,
      arg: target,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  call(name: string, arity: number): this {
    this.instructions.push({
      op: OpcodeType.CALL_BUILTIN,
      arg: { name, arity },
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  loadLocal(index: number): this {
    this.instructions.push({
      op: OpcodeType.LOAD_LOCAL,
      arg: index,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  storeLocal(index: number): this {
    this.instructions.push({
      op: OpcodeType.STORE_LOCAL,
      arg: index,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  print(): this {
    this.instructions.push({
      op: OpcodeType.PRINT,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  halt(): this {
    this.instructions.push({
      op: OpcodeType.HALT,
      line: this.lineNo,
      column: this.colNo,
    });
    return this;
  }

  build(): Instruction[] {
    return this.instructions;
  }
}

/**
 * Bytecode 프린터 - 명령어를 읽기 좋게 출력
 */
export class BytecodePrinter {
  static print(instructions: Instruction[]): string {
    const lines: string[] = [];
    instructions.forEach((instr, idx) => {
      const argStr = instr.arg !== undefined ? ` ${JSON.stringify(instr.arg)}` : '';
      lines.push(
        `${String(idx).padStart(4, '0')}: ${instr.op.padEnd(15)}${argStr}`
      );
    });
    return lines.join('\n');
  }
}
