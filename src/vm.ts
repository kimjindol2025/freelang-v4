// FreeLang v4 — Stack VM (SPEC_02 구현)
// fetch-decode-execute + Actor cooperative scheduling

import { Op, Chunk, FuncInfo } from "./compiler";

// ============================================================
// Value (SPEC_02 Q3)
// ============================================================

export type Value =
  | { tag: "i32"; val: number }
  | { tag: "f64"; val: number }
  | { tag: "str"; val: string }
  | { tag: "bool"; val: boolean }
  | { tag: "arr"; val: Value[] }
  | { tag: "struct"; fields: Map<string, Value> }
  | { tag: "ok"; val: Value }
  | { tag: "err"; val: Value }
  | { tag: "some"; val: Value }
  | { tag: "none" }
  | { tag: "chan"; id: number }
  | { tag: "void" };

// ============================================================
// CallFrame (SPEC_02 Q5)
// ============================================================

type CallFrame = {
  returnAddr: number;
  baseSlot: number;
  locals: Value[];
};

// ============================================================
// Channel
// ============================================================

type Channel = {
  id: number;
  buffer: Value[];
  waitingRecv: number[]; // actor ids waiting to recv
};

// ============================================================
// Actor (SPEC_02 Q7)
// ============================================================

type Actor = {
  id: number;
  ip: number;
  stack: Value[];
  frames: CallFrame[];
  state: "running" | "waiting" | "done";
  waitingChan: number | null;
};

// ============================================================
// VM
// ============================================================

export class VM {
  private chunk!: Chunk;
  private actors: Actor[] = [];
  private channels: Channel[] = [];
  private globals: Map<string, Value> = new Map();
  private output: string[] = [];
  private instructionCount: number = 0;
  private maxInstructions: number = 1_000_000;

  run(chunk: Chunk): { output: string[]; error: string | null } {
    this.chunk = chunk;
    this.output = [];
    this.instructionCount = 0;

    // main actor
    this.actors = [{
      id: 0,
      ip: 0,
      stack: [],
      frames: [{ returnAddr: -1, baseSlot: 0, locals: [] }],
      state: "running",
      waitingChan: null,
    }];

    try {
      this.schedule();
      return { output: this.output, error: null };
    } catch (e: any) {
      return { output: this.output, error: e.message || String(e) };
    }
  }

  // ============================================================
  // Scheduler — round-robin (SPEC_02 Q7)
  // ============================================================

  private schedule(): void {
    const SLICE = 1000;
    let current = 0;

    while (this.actors.some((a) => a.state !== "done")) {
      const actor = this.actors[current];

      if (actor.state === "running") {
        this.runSlice(actor, SLICE);
      } else if (actor.state === "waiting" && actor.waitingChan !== null) {
        const chan = this.channels.find((c) => c.id === actor.waitingChan);
        if (chan && chan.buffer.length > 0) {
          const val = chan.buffer.shift()!;
          actor.stack.push({ tag: "ok", val });
          actor.state = "running";
          actor.waitingChan = null;
        }
      }

      current = (current + 1) % this.actors.length;

      if (this.instructionCount > this.maxInstructions) {
        throw new Error("execution limit exceeded (infinite loop?)");
      }
    }
  }

  // ============================================================
  // Execute slice
  // ============================================================

  private runSlice(actor: Actor, maxOps: number): void {
    let ops = 0;

    while (ops < maxOps && actor.state === "running") {
      if (actor.ip >= this.chunk.code.length) {
        actor.state = "done";
        return;
      }

      const op = this.chunk.code[actor.ip++];
      this.instructionCount++;
      ops++;

      switch (op) {
        // ---- 상수 로드 ----
        case Op.PUSH_I32: {
          const val = this.readI32(actor);
          actor.stack.push({ tag: "i32", val });
          break;
        }
        case Op.PUSH_F64: {
          const val = this.readF64(actor);
          actor.stack.push({ tag: "f64", val });
          break;
        }
        case Op.PUSH_STR: {
          const idx = this.readI32(actor);
          actor.stack.push({ tag: "str", val: this.chunk.constants[idx] });
          break;
        }
        case Op.PUSH_TRUE:
          actor.stack.push({ tag: "bool", val: true });
          break;
        case Op.PUSH_FALSE:
          actor.stack.push({ tag: "bool", val: false });
          break;
        case Op.PUSH_VOID:
          actor.stack.push({ tag: "void" });
          break;
        case Op.PUSH_NONE:
          actor.stack.push({ tag: "none" });
          break;
        case Op.POP:
          actor.stack.pop();
          break;
        case Op.DUP:
          actor.stack.push(actor.stack[actor.stack.length - 1]);
          break;

        // ---- 산술 (i32) ----
        case Op.ADD_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if (a.tag === "str" && b.tag === "str") {
            actor.stack.push({ tag: "str", val: a.val + b.val });
          } else {
            actor.stack.push({ tag: a.tag as any, val: (a as any).val + (b as any).val });
          }
          break;
        }
        case Op.SUB_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: a.tag as any, val: (a as any).val - (b as any).val });
          break;
        }
        case Op.MUL_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: a.tag as any, val: (a as any).val * (b as any).val });
          break;
        }
        case Op.DIV_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if ((b as any).val === 0) throw new Error("panic: division by zero");
          const result = a.tag === "i32"
            ? Math.trunc((a as any).val / (b as any).val)
            : (a as any).val / (b as any).val;
          actor.stack.push({ tag: a.tag as any, val: result });
          break;
        }
        case Op.MOD_I32: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          if ((b as any).val === 0) throw new Error("panic: division by zero");
          actor.stack.push({ tag: a.tag as any, val: (a as any).val % (b as any).val });
          break;
        }
        case Op.NEG_I32: {
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: a.tag as any, val: -(a as any).val });
          break;
        }

        // ---- f64 산술 ----
        case Op.ADD_F64: case Op.SUB_F64: case Op.MUL_F64:
        case Op.DIV_F64: case Op.MOD_F64: case Op.NEG_F64:
          // i32와 동일 로직 (JS는 number 통일)
          break;

        // ---- 비교 ----
        case Op.EQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: this.valuesEqual(a, b) });
          break;
        }
        case Op.NEQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: !this.valuesEqual(a, b) });
          break;
        }
        case Op.LT: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val < (b as any).val });
          break;
        }
        case Op.GT: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val > (b as any).val });
          break;
        }
        case Op.LTEQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val <= (b as any).val });
          break;
        }
        case Op.GTEQ: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val >= (b as any).val });
          break;
        }

        // ---- 논리 ----
        case Op.AND: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val && (b as any).val });
          break;
        }
        case Op.OR: {
          const b = actor.stack.pop()!;
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: (a as any).val || (b as any).val });
          break;
        }
        case Op.NOT: {
          const a = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: !(a as any).val });
          break;
        }

        // ---- 변수 ----
        case Op.LOAD_LOCAL: {
          const slot = this.readI32(actor);
          const frame = actor.frames[actor.frames.length - 1];
          actor.stack.push(frame.locals[slot] ?? { tag: "void" });
          break;
        }
        case Op.STORE_LOCAL: {
          const slot = this.readI32(actor);
          const val = actor.stack.pop()!;
          const frame = actor.frames[actor.frames.length - 1];
          while (frame.locals.length <= slot) frame.locals.push({ tag: "void" });
          frame.locals[slot] = val;
          break;
        }
        case Op.LOAD_GLOBAL: {
          const idx = this.readI32(actor);
          const name = this.chunk.constants[idx];
          actor.stack.push(this.globals.get(name) ?? { tag: "void" });
          break;
        }
        case Op.STORE_GLOBAL: {
          const idx = this.readI32(actor);
          const name = this.chunk.constants[idx];
          const val = actor.stack.pop()!;
          this.globals.set(name, val);
          break;
        }

        // ---- 제어 ----
        case Op.JUMP: {
          const target = this.readI32(actor);
          actor.ip = target;
          break;
        }
        case Op.JUMP_IF_FALSE: {
          const target = this.readI32(actor);
          const cond = actor.stack.pop()!;
          if (cond.tag === "bool" && !cond.val) {
            actor.ip = target;
          }
          break;
        }
        case Op.RETURN: {
          const retVal = actor.stack.pop() ?? { tag: "void" as const };
          const frame = actor.frames.pop()!;

          if (actor.frames.length === 0) {
            actor.state = "done";
            return;
          }

          actor.ip = frame.returnAddr;
          // 스택 정리
          actor.stack.length = frame.baseSlot;
          actor.stack.push(retVal);
          break;
        }
        case Op.HALT:
          actor.state = "done";
          return;

        // ---- 함수 호출 ----
        case Op.CALL: {
          const fnIdx = this.readI32(actor);
          const argCount = this.chunk.code[actor.ip++];

          const fn = this.chunk.functions[fnIdx];
          if (!fn) throw new Error(`panic: undefined function index ${fnIdx}`);

          const args: Value[] = [];
          for (let i = 0; i < argCount; i++) {
            args.unshift(actor.stack.pop()!);
          }

          actor.frames.push({
            returnAddr: actor.ip,
            baseSlot: actor.stack.length,
            locals: args,
          });

          actor.ip = fn.offset;
          break;
        }
        case Op.CALL_BUILTIN: {
          const nameIdx = this.readI32(actor);
          const argCount = this.chunk.code[actor.ip++];
          const name = this.chunk.constants[nameIdx];

          const args: Value[] = [];
          for (let i = 0; i < argCount; i++) {
            args.unshift(actor.stack.pop()!);
          }

          const result = this.callBuiltin(name, args);
          actor.stack.push(result);
          break;
        }

        // ---- 배열 ----
        case Op.ARRAY_NEW: {
          const count = this.readI32(actor);
          const elements: Value[] = [];
          for (let i = 0; i < count; i++) {
            elements.unshift(actor.stack.pop()!);
          }
          actor.stack.push({ tag: "arr", val: elements });
          break;
        }
        case Op.ARRAY_GET: {
          const idx = actor.stack.pop()!;
          const arr = actor.stack.pop()!;
          if (arr.tag !== "arr") throw new Error("panic: not an array");
          const i = (idx as any).val;
          if (i < 0 || i >= arr.val.length) throw new Error(`panic: index out of bounds: ${i}`);
          actor.stack.push(arr.val[i]);
          break;
        }
        case Op.ARRAY_SET: {
          const val = actor.stack.pop()!;
          const idx = actor.stack.pop()!;
          const arr = actor.stack.pop()!;
          if (arr.tag !== "arr") throw new Error("panic: not an array");
          arr.val[(idx as any).val] = val;
          break;
        }

        // ---- 구조체 ----
        case Op.STRUCT_NEW: {
          const count = this.readI32(actor);
          const fields = new Map<string, Value>();
          for (let i = 0; i < count; i++) {
            const val = actor.stack.pop()!;
            const key = actor.stack.pop()!;
            fields.set((key as any).val, val);
          }
          actor.stack.push({ tag: "struct", fields });
          break;
        }
        case Op.STRUCT_GET: {
          const nameIdx = this.readI32(actor);
          const fieldName = this.chunk.constants[nameIdx];
          const obj = actor.stack.pop()!;
          if (obj.tag !== "struct") throw new Error("panic: not a struct");
          actor.stack.push(obj.fields.get(fieldName) ?? { tag: "void" });
          break;
        }

        // ---- Option/Result ----
        case Op.WRAP_OK: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "ok", val });
          break;
        }
        case Op.WRAP_ERR: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "err", val });
          break;
        }
        case Op.WRAP_SOME: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "some", val });
          break;
        }
        case Op.UNWRAP: {
          const val = actor.stack.pop()!;
          if (val.tag === "ok" || val.tag === "some") {
            actor.stack.push(val.val);
          } else {
            throw new Error(`panic: unwrap on ${val.tag}`);
          }
          break;
        }
        case Op.IS_OK: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "ok" });
          break;
        }
        case Op.IS_ERR: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "err" });
          break;
        }
        case Op.IS_SOME: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "some" });
          break;
        }
        case Op.IS_NONE: {
          const val = actor.stack.pop()!;
          actor.stack.push({ tag: "bool", val: val.tag === "none" });
          break;
        }

        // ---- Actor/Channel ----
        case Op.SPAWN: {
          const bodyOffset = this.readI32(actor);
          const newActor: Actor = {
            id: this.actors.length,
            ip: bodyOffset,
            stack: [],
            frames: [{ returnAddr: -1, baseSlot: 0, locals: [] }],
            state: "running",
            waitingChan: null,
          };
          this.actors.push(newActor);
          break;
        }
        case Op.CHAN_NEW: {
          const chan: Channel = {
            id: this.channels.length,
            buffer: [],
            waitingRecv: [],
          };
          this.channels.push(chan);
          actor.stack.push({ tag: "chan", id: chan.id });
          break;
        }
        case Op.CHAN_SEND: {
          const val = actor.stack.pop()!;
          const chanVal = actor.stack.pop()!;
          if (chanVal.tag !== "chan") throw new Error("panic: send on non-channel");
          const chan = this.channels[chanVal.id];
          chan.buffer.push(val);
          // 대기 중인 actor 깨우기
          if (chan.waitingRecv.length > 0) {
            const waitId = chan.waitingRecv.shift()!;
            const waitActor = this.actors[waitId];
            if (waitActor) {
              waitActor.state = "running";
              waitActor.waitingChan = null;
            }
          }
          break;
        }
        case Op.CHAN_RECV: {
          const chanVal = actor.stack.pop()!;
          if (chanVal.tag !== "chan") throw new Error("panic: recv on non-channel");
          const chan = this.channels[chanVal.id];
          if (chan.buffer.length > 0) {
            const val = chan.buffer.shift()!;
            actor.stack.push({ tag: "ok", val });
          } else {
            // 대기 상태로 전환
            actor.state = "waiting";
            actor.waitingChan = chanVal.id;
            chan.waitingRecv.push(actor.id);
            return;
          }
          break;
        }

        default:
          throw new Error(`panic: unknown opcode 0x${op.toString(16)}`);
      }
    }
  }

  // ============================================================
  // 내장 함수 (SPEC_10)
  // ============================================================

  private callBuiltin(name: string, args: Value[]): Value {
    switch (name) {
      case "println": {
        const text = args.map((a) => this.valueToString(a)).join(" ");
        this.output.push(text);
        return { tag: "void" };
      }
      case "str":
        return { tag: "str", val: this.valueToString(args[0]) };
      case "length":
        if (args[0].tag === "arr") return { tag: "i32", val: args[0].val.length };
        if (args[0].tag === "str") return { tag: "i32", val: args[0].val.length };
        return { tag: "i32", val: 0 };
      case "range": {
        const start = (args[0] as any).val;
        const end = (args[1] as any).val;
        const arr: Value[] = [];
        for (let i = start; i < end; i++) arr.push({ tag: "i32", val: i });
        return { tag: "arr", val: arr };
      }
      case "push":
        if (args[0].tag === "arr") args[0].val.push(args[1]);
        return { tag: "void" };
      case "pop":
        if (args[0].tag === "arr") return args[0].val.pop() ?? { tag: "void" };
        return { tag: "void" };
      case "abs":
        return { tag: (args[0] as any).tag, val: Math.abs((args[0] as any).val) };
      case "min":
        return { tag: (args[0] as any).tag, val: Math.min((args[0] as any).val, (args[1] as any).val) };
      case "max":
        return { tag: (args[0] as any).tag, val: Math.max((args[0] as any).val, (args[1] as any).val) };
      case "pow":
        return { tag: "f64", val: Math.pow((args[0] as any).val, (args[1] as any).val) };
      case "sqrt":
        return { tag: "f64", val: Math.sqrt((args[0] as any).val) };
      case "typeof":
        return { tag: "str", val: args[0].tag };
      case "assert":
        if (args[0].tag === "bool" && !args[0].val) {
          const msg = args.length > 1 ? this.valueToString(args[1]) : "assertion failed";
          throw new Error(`panic: ${msg}`);
        }
        return { tag: "void" };
      case "panic":
        throw new Error(`panic: ${this.valueToString(args[0])}`);
      case "contains":
        if (args[0].tag === "str") {
          return { tag: "bool", val: args[0].val.includes((args[1] as any).val) };
        }
        return { tag: "bool", val: false };
      case "split":
        if (args[0].tag === "str") {
          const parts = args[0].val.split((args[1] as any).val);
          return { tag: "arr", val: parts.map((s) => ({ tag: "str" as const, val: s })) };
        }
        return { tag: "arr", val: [] };
      case "trim":
        if (args[0].tag === "str") return { tag: "str", val: args[0].val.trim() };
        return args[0];
      case "to_upper":
        if (args[0].tag === "str") return { tag: "str", val: args[0].val.toUpperCase() };
        return args[0];
      case "to_lower":
        if (args[0].tag === "str") return { tag: "str", val: args[0].val.toLowerCase() };
        return args[0];
      case "char_at":
        if (args[0].tag === "str") {
          const i = (args[1] as any).val;
          return { tag: "str", val: args[0].val[i] ?? "" };
        }
        return { tag: "str", val: "" };
      case "slice":
        if (args[0].tag === "arr") {
          const s = (args[1] as any).val;
          const e = (args[2] as any).val;
          return { tag: "arr", val: args[0].val.slice(s, e) };
        }
        if (args[0].tag === "str") {
          const s = (args[1] as any).val;
          const e = (args[2] as any).val;
          return { tag: "str", val: args[0].val.slice(s, e) };
        }
        return args[0];
      case "clone":
        return this.deepClone(args[0]);
      case "channel": {
        const chan: Channel = { id: this.channels.length, buffer: [], waitingRecv: [] };
        this.channels.push(chan);
        return { tag: "chan", id: chan.id };
      }
      case "i32":
        return { tag: "ok", val: { tag: "i32", val: parseInt(this.valueToString(args[0]), 10) || 0 } };
      case "i64":
        return { tag: "ok", val: { tag: "i32", val: parseInt(this.valueToString(args[0]), 10) || 0 } };
      case "f64":
        return { tag: "ok", val: { tag: "f64", val: parseFloat(this.valueToString(args[0])) || 0 } };
      case "read_line":
        return { tag: "str", val: "" }; // stub
      case "read_file":
        return { tag: "err", val: { tag: "str", val: "not implemented" } };
      case "write_file":
        return { tag: "err", val: { tag: "str", val: "not implemented" } };
      case "recv":
        // method-style: obj.recv()
        if (args[0] && args[0].tag === "chan") {
          const chan = this.channels[args[0].id];
          if (chan && chan.buffer.length > 0) {
            return { tag: "ok", val: chan.buffer.shift()! };
          }
          return { tag: "err", val: { tag: "str", val: "channel empty" } };
        }
        return { tag: "err", val: { tag: "str", val: "not a channel" } };
      case "send":
        if (args[0] && args[0].tag === "chan") {
          const chan = this.channels[args[0].id];
          if (chan) chan.buffer.push(args[1]);
          return { tag: "void" };
        }
        return { tag: "void" };
      default:
        throw new Error(`panic: unknown builtin '${name}'`);
    }
  }

  // ============================================================
  // 유틸리티
  // ============================================================

  private readI32(actor: Actor): number {
    const b0 = this.chunk.code[actor.ip++];
    const b1 = this.chunk.code[actor.ip++];
    const b2 = this.chunk.code[actor.ip++];
    const b3 = this.chunk.code[actor.ip++];
    return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
  }

  private readF64(actor: Actor): number {
    const buf = new ArrayBuffer(8);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < 8; i++) bytes[i] = this.chunk.code[actor.ip++];
    return new Float64Array(buf)[0];
  }

  private valueToString(v: Value): string {
    switch (v.tag) {
      case "i32": case "f64": return String(v.val);
      case "str": return v.val;
      case "bool": return v.val ? "true" : "false";
      case "void": return "void";
      case "none": return "None";
      case "arr": return `[${v.val.map((e) => this.valueToString(e)).join(", ")}]`;
      case "struct": {
        const entries = [...v.fields.entries()].map(([k, val]) => `${k}: ${this.valueToString(val)}`);
        return `{ ${entries.join(", ")} }`;
      }
      case "ok": return `Ok(${this.valueToString(v.val)})`;
      case "err": return `Err(${this.valueToString(v.val)})`;
      case "some": return `Some(${this.valueToString(v.val)})`;
      case "chan": return `channel(${v.id})`;
    }
  }

  private valuesEqual(a: Value, b: Value): boolean {
    if (a.tag !== b.tag) return false;
    if (a.tag === "void" && b.tag === "void") return true;
    if (a.tag === "none" && b.tag === "none") return true;
    if ("val" in a && "val" in b) return (a as any).val === (b as any).val;
    return false;
  }

  private deepClone(v: Value): Value {
    switch (v.tag) {
      case "arr": return { tag: "arr", val: v.val.map((e) => this.deepClone(e)) };
      case "struct": {
        const fields = new Map<string, Value>();
        for (const [k, val] of v.fields) fields.set(k, this.deepClone(val));
        return { tag: "struct", fields };
      }
      case "ok": return { tag: "ok", val: this.deepClone(v.val) };
      case "err": return { tag: "err", val: this.deepClone(v.val) };
      case "some": return { tag: "some", val: this.deepClone(v.val) };
      default: return v; // Copy 타입은 그대로
    }
  }
}
