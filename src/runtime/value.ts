/**
 * FreeLang Runtime Value System
 * 모든 런타임 값을 나타내는 tagged union 타입
 */

/**
 * 런타임에서 사용되는 모든 값의 타입
 * Discriminated Union 패턴 사용으로 타입 안전성 보장
 */
export type Value =
  | { type: 'null' }
  | { type: 'bool'; value: boolean }
  | { type: 'int'; value: number }
  | { type: 'float'; value: number }
  | { type: 'string'; value: string }
  | { type: 'array'; value: Value[] }
  | { type: 'object'; value: Map<string, Value> }
  | { type: 'function'; params: string[]; body: any }
  | { type: 'builtin'; name: string; arity: number };

/**
 * Value 타입의 유틸리티 함수들
 */
export class ValueHandler {
  /**
   * Value를 문자열로 변환
   */
  static toString(v: Value): string {
    switch (v.type) {
      case 'null':
        return 'null';
      case 'bool':
        return v.value ? 'true' : 'false';
      case 'int':
        return String(v.value);
      case 'float':
        return String(v.value);
      case 'string':
        return v.value;
      case 'array':
        return `[${v.value.map(item => this.toString(item)).join(', ')}]`;
      case 'object':
        const entries = Array.from(v.value.entries());
        const pairs = entries.map(([k, val]) => `${k}: ${this.toString(val)}`);
        return `{${pairs.join(', ')}}`;
      case 'function':
        return `<function(${v.params.join(', ')})>`;
      case 'builtin':
        return `<builtin: ${v.name}/${v.arity}>`;
    }
  }

  /**
   * Value를 숫자로 변환 (JavaScript 의미론)
   */
  static toNumber(v: Value): number {
    switch (v.type) {
      case 'null':
        return 0;
      case 'bool':
        return v.value ? 1 : 0;
      case 'int':
      case 'float':
        return v.value;
      case 'string':
        const n = parseFloat(v.value);
        return isNaN(n) ? 0 : n;
      case 'array':
        return v.value.length; // 배열의 길이
      case 'object':
        return v.value.size; // 객체의 크기
      default:
        return 0;
    }
  }

  /**
   * Value를 불린으로 변환 (JavaScript truthy/falsy 의미론)
   */
  static toBoolean(v: Value): boolean {
    switch (v.type) {
      case 'null':
        return false;
      case 'bool':
        return v.value;
      case 'int':
        return v.value !== 0;
      case 'float':
        return v.value !== 0.0;
      case 'string':
        return v.value.length > 0;
      case 'array':
        return v.value.length > 0;
      case 'object':
        return v.value.size > 0;
      case 'function':
      case 'builtin':
        return true;
    }
  }

  /**
   * Value의 타입을 문자열로 반환
   */
  static typeOf(v: Value): string {
    switch (v.type) {
      case 'null':
        return 'null';
      case 'bool':
        return 'bool';
      case 'int':
        return 'int';
      case 'float':
        return 'float';
      case 'string':
        return 'string';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      case 'function':
        return 'function';
      case 'builtin':
        return 'builtin';
    }
  }

  /**
   * Value의 길이를 반환 (string, array, object 타입)
   */
  static getLength(v: Value): number {
    switch (v.type) {
      case 'string':
        return v.value.length;
      case 'array':
        return v.value.length;
      case 'object':
        return v.value.size;
      default:
        return 0;
    }
  }

  /**
   * 두 Value가 같은지 비교 (==)
   */
  static equals(a: Value, b: Value): boolean {
    // 같은 타입끼리만 비교 (엄격한 비교)
    if (a.type !== b.type) {
      return false;
    }

    switch (a.type) {
      case 'null':
        return true;
      case 'bool':
        return a.value === (b as typeof a).value;
      case 'int':
      case 'float':
        return a.value === (b as typeof a).value;
      case 'string':
        return a.value === (b as typeof a).value;
      case 'array': {
        const bArr = (b as typeof a).value;
        if (a.value.length !== bArr.length) return false;
        return a.value.every((v, i) => this.equals(v, bArr[i]));
      }
      case 'object': {
        const bObj = (b as typeof a).value;
        if (a.value.size !== bObj.size) return false;
        for (const [k, v] of a.value) {
          const bVal = bObj.get(k);
          if (!bVal || !this.equals(v, bVal)) return false;
        }
        return true;
      }
      case 'function':
        return false; // 함수는 참조로 비교 (추후 개선 가능)
      case 'builtin':
        return a.name === (b as typeof a).name;
    }
  }

  /**
   * 숫자 비교 (<)
   */
  static lessThan(a: Value, b: Value): boolean {
    const aNum = this.toNumber(a);
    const bNum = this.toNumber(b);
    return aNum < bNum;
  }

  /**
   * Value를 깊은 복사 (Deep Clone)
   */
  static clone(v: Value): Value {
    switch (v.type) {
      case 'null':
      case 'bool':
      case 'int':
      case 'float':
      case 'string':
        return v;
      case 'array':
        return {
          type: 'array',
          value: v.value.map(item => this.clone(item)),
        };
      case 'object': {
        const newMap = new Map<string, Value>();
        for (const [k, val] of v.value) {
          newMap.set(k, this.clone(val));
        }
        return {
          type: 'object',
          value: newMap,
        };
      }
      case 'function':
        return v; // 함수는 참조로 복사
      case 'builtin':
        return v;
    }
  }

  /**
   * Value를 JSON 호환 형식으로 변환
   */
  static toJSON(v: Value): any {
    switch (v.type) {
      case 'null':
        return null;
      case 'bool':
        return v.value;
      case 'int':
      case 'float':
        return v.value;
      case 'string':
        return v.value;
      case 'array':
        return v.value.map(item => this.toJSON(item));
      case 'object': {
        const obj: any = {};
        for (const [k, val] of v.value) {
          obj[k] = this.toJSON(val);
        }
        return obj;
      }
      case 'function':
        return '[Function]';
      case 'builtin':
        return '[Builtin]';
    }
  }

  /**
   * JSON에서 Value로 변환
   */
  static fromJSON(obj: any): Value {
    if (obj === null) {
      return { type: 'null' };
    }
    if (typeof obj === 'boolean') {
      return { type: 'bool', value: obj };
    }
    if (typeof obj === 'number') {
      return Number.isInteger(obj)
        ? { type: 'int', value: obj }
        : { type: 'float', value: obj };
    }
    if (typeof obj === 'string') {
      return { type: 'string', value: obj };
    }
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        value: obj.map(item => this.fromJSON(item)),
      };
    }
    if (typeof obj === 'object') {
      const map = new Map<string, Value>();
      for (const [k, v] of Object.entries(obj)) {
        map.set(k, this.fromJSON(v));
      }
      return { type: 'object', value: map };
    }
    return { type: 'null' };
  }
}

/**
 * 자주 사용되는 Value 상수들
 */
export const NULL: Value = { type: 'null' };
export const TRUE: Value = { type: 'bool', value: true };
export const FALSE: Value = { type: 'bool', value: false };

/**
 * Value를 생성하는 헬퍼 함수들
 */
export const Value = {
  null: (): Value => ({ type: 'null' }),
  bool: (b: boolean): Value => ({ type: 'bool', value: b }),
  int: (n: number): Value => ({ type: 'int', value: Math.floor(n) }),
  float: (n: number): Value => ({ type: 'float', value: n }),
  string: (s: string): Value => ({ type: 'string', value: s }),
  array: (arr: Value[]): Value => ({ type: 'array', value: arr }),
  object: (obj: Map<string, Value>): Value => ({
    type: 'object',
    value: obj,
  }),
  function: (params: string[], body: any): Value => ({
    type: 'function',
    params,
    body,
  }),
  builtin: (name: string, arity: number): Value => ({
    type: 'builtin',
    name,
    arity,
  }),
};
