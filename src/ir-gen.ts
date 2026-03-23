// FreeLang v4 — IR Generator
// AST → IrProgram 변환

import { Program, Stmt, Expr, MatchArm } from "./ast";
import { IrValue, IrInst, IrFunction, IrProgram } from "./ir";

export class IRGen {
  private tempCount = 0;
  private labelCount = 0;
  private insts: IrInst[] = []; // 현재 생성 중인 명령어
  private functions: IrFunction[] = [];

  private newTemp(): string {
    return `t${this.tempCount++}`;
  }

  private newLabel(): string {
    return `L${this.labelCount++}`;
  }

  private emit(inst: IrInst): void {
    this.insts.push(inst);
  }

  // ============================================================
  // 메인 진입점
  // ============================================================

  generate(prog: Program): IrProgram {
    const savedInsts = this.insts;
    this.insts = [];

    for (const stmt of prog.stmts) {
      if (stmt.kind === "fn_decl") {
        this.genFnDecl(stmt);
      } else {
        this.genStmt(stmt);
      }
    }

    const main = this.insts;
    this.insts = savedInsts;

    return {
      functions: this.functions,
      main,
    };
  }

  // ============================================================
  // 문 생성
  // ============================================================

  private genStmt(stmt: Stmt): void {
    switch (stmt.kind) {
      case "var_decl": {
        const val = this.genExpr(stmt.init);
        this.emit({ kind: "assign", dest: stmt.name, src: val });
        break;
      }

      case "if_stmt": {
        const cond = this.genExpr(stmt.condition);
        const elseLabel = this.newLabel();
        const endLabel = this.newLabel();

        this.emit({ kind: "jump_if_false", cond, target: elseLabel });

        for (const s of stmt.then) {
          this.genStmt(s);
        }
        this.emit({ kind: "jump", target: endLabel });

        this.emit({ kind: "label", name: elseLabel });
        if (stmt.else_) {
          for (const s of stmt.else_) {
            this.genStmt(s);
          }
        }

        this.emit({ kind: "label", name: endLabel });
        break;
      }

      case "while_stmt": {
        const loopLabel = this.newLabel();
        const endLabel = this.newLabel();

        this.emit({ kind: "label", name: loopLabel });
        const cond = this.genExpr(stmt.condition);
        this.emit({ kind: "jump_if_false", cond, target: endLabel });

        for (const s of stmt.body) {
          this.genStmt(s);
        }
        this.emit({ kind: "jump", target: loopLabel });

        this.emit({ kind: "label", name: endLabel });
        break;
      }

      case "for_stmt": {
        // for i = start to end step s → var i; while i < end { body; i = i + s }
        const varName = stmt.variable;
        const iterable = this.genExpr(stmt.iterable); // [start, end, step]

        // iterable은 보통 i32이므로 0부터 시작
        this.emit({ kind: "assign", dest: varName, src: { kind: "const_i32", val: 0 } });

        const loopLabel = this.newLabel();
        const endLabel = this.newLabel();

        this.emit({ kind: "label", name: loopLabel });
        const cond: IrValue = { kind: "local", name: varName };
        this.emit({ kind: "jump_if_false", cond, target: endLabel });

        for (const s of stmt.body) {
          this.genStmt(s);
        }

        // i = i + 1
        const nextTemp = this.newTemp();
        this.emit({
          kind: "binop",
          dest: nextTemp,
          op: "+",
          left: cond,
          right: { kind: "const_i32", val: 1 },
        });
        this.emit({ kind: "assign", dest: varName, src: { kind: "local", name: nextTemp } });

        this.emit({ kind: "jump", target: loopLabel });
        this.emit({ kind: "label", name: endLabel });
        break;
      }

      case "for_of_stmt": {
        // for x in arr → while iter < length(arr) { x = arr[iter]; body; iter++ }
        const varName = stmt.variable;
        const iterExpr = this.genExpr(stmt.iterable);
        const iterVar = this.newTemp();

        this.emit({ kind: "assign", dest: iterVar, src: { kind: "const_i32", val: 0 } });

        const loopLabel = this.newLabel();
        const endLabel = this.newLabel();

        this.emit({ kind: "label", name: loopLabel });
        const iterVal: IrValue = { kind: "local", name: iterVar };

        // array_get 명령어 발행 후 결과를 itemTemp에 저장
        const itemTemp = this.newTemp();
        this.emit({
          kind: "array_get",
          dest: itemTemp,
          arr: iterExpr,
          idx: iterVal,
        });

        // 루프 변수에 할당
        this.emit({ kind: "assign", dest: varName, src: { kind: "local", name: itemTemp } });

        for (const s of stmt.body) {
          this.genStmt(s);
        }

        // 반복 변수 증가
        const nextTemp = this.newTemp();
        this.emit({
          kind: "binop",
          dest: nextTemp,
          op: "+",
          left: iterVal,
          right: { kind: "const_i32", val: 1 },
        });
        this.emit({ kind: "assign", dest: iterVar, src: { kind: "local", name: nextTemp } });

        this.emit({ kind: "jump", target: loopLabel });
        this.emit({ kind: "label", name: endLabel });
        break;
      }

      case "return_stmt": {
        const val = stmt.value ? this.genExpr(stmt.value) : null;
        this.emit({ kind: "return", value: val });
        break;
      }

      case "expr_stmt": {
        this.genExpr(stmt.expr);
        break;
      }

      case "spawn_stmt": {
        // TODO: spawn 처리 (현재 미지원)
        break;
      }

      // 타입 선언, match, break, continue는 생략
      default:
        break;
    }
  }

  private genFnDecl(stmt: Stmt & { kind: "fn_decl" }): void {
    const savedInsts = this.insts;
    this.insts = [];

    const params = stmt.params.map((p) => p.name);

    for (const s of stmt.body) {
      this.genStmt(s);
    }

    // 함수의 끝에 return void 추가 (명시적 반환 없으면)
    const lastInst = this.insts[this.insts.length - 1];
    if (!lastInst || lastInst.kind !== "return") {
      this.emit({ kind: "return", value: null });
    }

    this.functions.push({
      name: stmt.name,
      params,
      insts: this.insts,
    });

    this.insts = savedInsts;
  }

  // ============================================================
  // 식 생성
  // ============================================================

  private genExpr(expr: Expr): IrValue {
    switch (expr.kind) {
      case "int_lit":
        return { kind: "const_i32", val: expr.value };

      case "float_lit":
        return { kind: "const_f64", val: expr.value };

      case "string_lit":
        return { kind: "const_str", val: expr.value };

      case "bool_lit":
        return { kind: "const_bool", val: expr.value };

      case "ident":
        return { kind: "local", name: expr.name };

      case "binary": {
        const left = this.genExpr(expr.left);
        const right = this.genExpr(expr.right);
        const dest = this.newTemp();
        this.emit({
          kind: "binop",
          dest,
          op: expr.op,
          left,
          right,
        });
        return { kind: "local", name: dest };
      }

      case "unary": {
        const src = this.genExpr(expr.operand);
        const dest = this.newTemp();
        this.emit({
          kind: "unop",
          dest,
          op: expr.op,
          src,
        });
        return { kind: "local", name: dest };
      }

      case "call": {
        const args = expr.args.map((a) => this.genExpr(a));
        const dest = this.newTemp();

        if (expr.callee.kind === "ident") {
          const name = expr.callee.name;
          const builtins = [
            "println", "print", "read_line", "read_file", "write_file",
            "i32", "i64", "f64", "str",
            "push", "pop", "slice", "clone", "length",
            "char_at", "contains", "split", "trim", "to_upper", "to_lower",
            "abs", "min", "max", "pow", "sqrt",
            "range", "channel", "panic", "typeof", "assert",
            // Phase 7: 20 Core Libraries
            "md5", "sha256", "sha512", "base64_encode", "base64_decode", "hmac",
            "json_parse", "json_stringify", "json_validate", "json_pretty",
            "starts_with", "ends_with", "replace",
            "reverse", "sort", "unique",
            "gcd", "lcm",
            "uuid", "timestamp",
            "send", "recv",
          ];

          if (builtins.includes(name)) {
            this.emit({
              kind: "call_builtin",
              dest,
              name,
              args,
            });
          } else {
            this.emit({
              kind: "call",
              dest,
              fn: name,
              args,
            });
          }
        } else {
          // 복잡한 callee는 일단 지원 안 함
        }

        return { kind: "local", name: dest };
      }

      case "index": {
        const arr = this.genExpr(expr.object);
        const idx = this.genExpr(expr.index);
        const dest = this.newTemp();
        this.emit({
          kind: "array_get",
          dest,
          arr,
          idx,
        });
        return { kind: "local", name: dest };
      }

      case "field_access": {
        const obj = this.genExpr(expr.object);
        const dest = this.newTemp();
        this.emit({
          kind: "struct_get",
          dest,
          obj,
          field: expr.field,
        });
        return { kind: "local", name: dest };
      }

      case "assign": {
        const val = this.genExpr(expr.value);
        if (expr.target.kind === "ident") {
          this.emit({
            kind: "assign",
            dest: expr.target.name,
            src: val,
          });
          return val;
        } else if (expr.target.kind === "index") {
          const arr = this.genExpr(expr.target.object);
          const idx = this.genExpr(expr.target.index);
          this.emit({
            kind: "array_set",
            arr,
            idx,
            value: val,
          });
          return val;
        } else if (expr.target.kind === "field_access") {
          const obj = this.genExpr(expr.target.object);
          this.emit({
            kind: "struct_set",
            obj,
            field: expr.target.field,
            value: val,
          });
          return val;
        }
        return { kind: "const_i32", val: 0 };
      }

      case "array_lit": {
        const elements = expr.elements.map((e) => this.genExpr(e));
        const dest = this.newTemp();
        this.emit({
          kind: "array_new",
          dest,
          elements,
        });
        return { kind: "local", name: dest };
      }

      case "struct_lit": {
        const fields = expr.fields.map((f) => ({
          name: f.name,
          value: this.genExpr(f.value),
        }));
        const dest = this.newTemp();
        this.emit({
          kind: "struct_new",
          dest,
          sname: expr.structName || "__anon_struct__",
          fields,
        });
        return { kind: "local", name: dest };
      }

      case "if_expr": {
        const cond = this.genExpr(expr.condition);
        const thenLabel = this.newLabel();
        const elseLabel = this.newLabel();
        const endLabel = this.newLabel();
        const resultDest = this.newTemp();

        this.emit({ kind: "jump_if_false", cond, target: elseLabel });

        this.emit({ kind: "label", name: thenLabel });
        let thenVal: IrValue = { kind: "const_i32", val: 0 };
        for (let i = 0; i < expr.then.length; i++) {
          if (i === expr.then.length - 1) {
            // 마지막 식
            thenVal = this.genExpr(expr.then[i] as any);
          } else {
            // 문
            this.genStmt(expr.then[i] as any);
          }
        }
        this.emit({ kind: "assign", dest: resultDest, src: thenVal });
        this.emit({ kind: "jump", target: endLabel });

        this.emit({ kind: "label", name: elseLabel });
        let elseVal: IrValue = { kind: "const_i32", val: 0 };
        for (let i = 0; i < expr.else_.length; i++) {
          if (i === expr.else_.length - 1) {
            elseVal = this.genExpr(expr.else_[i] as any);
          } else {
            this.genStmt(expr.else_[i] as any);
          }
        }
        this.emit({ kind: "assign", dest: resultDest, src: elseVal });

        this.emit({ kind: "label", name: endLabel });
        return { kind: "local", name: resultDest };
      }

      case "block_expr": {
        let result: IrValue = { kind: "const_i32", val: 0 };
        for (const s of expr.stmts) {
          this.genStmt(s);
        }
        if (expr.expr) {
          result = this.genExpr(expr.expr);
        }
        return result;
      }

      // match_expr, fn_lit, try 등은 일단 미지원
      default:
        return { kind: "const_i32", val: 0 };
    }
  }
}
