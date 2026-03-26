# FreeLang v4 - Phase 2: Syntax Design (BNF)

## Token Types (Phase 1)
```
KEYWORD:    var, let, const, fn, if, else, match, spawn, return, import, export, type, async, await
IDENTIFIER: [A-Za-z_][A-Za-z0-9_]*
INTEGER:    -?\d+
FLOAT:      -?\d+\.\d+([eE][+-]?\d+)?
STRING:     "..."
OPERATOR:   +, -, *, /, %, **, ==, !=, <, >, <=, >=, &&, ||, !
DELIMITER:  (, ), {, }, [, ], ,, :, ;, ., |, =, ?
EOF
```

---

## Grammar Rules (BNF)

```bnf
# ==========================================
# PROGRAM
# ==========================================
<program> ::= <statement>*

<statement> ::= <var_decl>
             | <fn_decl>
             | <type_decl>
             | <import>
             | <export>
             | <if_stmt>
             | <match_stmt>
             | <spawn_stmt>
             | <return_stmt>
             | <block>
             | <expr_stmt>

# ==========================================
# DECLARATIONS
# ==========================================
<var_decl> ::= ("var" | "let" | "const") IDENTIFIER (":" <type>)? "=" <expr>

<fn_decl> ::= "fn" IDENTIFIER (<type_params>)? "(" <params> ")" (":" <type>)? "{" <statement>* "}"

<type_decl> ::= "type" IDENTIFIER "=" <type>

<import> ::= "import" IDENTIFIER "from" STRING

<export> ::= "export" IDENTIFIER

# ==========================================
# STATEMENTS
# ==========================================
<return_stmt> ::= "return" <expr>?

<if_stmt> ::= "if" <expr> <block> (<else_clause>)?

<else_clause> ::= "else" <if_stmt>
               | "else" <block>

<match_stmt> ::= "match" <expr> "{" <match_arms> "}"

<match_arms> ::= (<match_arm>)+ (<catch_all>)?

<match_arm> ::= <pattern> "=>" <expr> ","?

<catch_all> ::= "_" "=>" <expr> ","?

<spawn_stmt> ::= "spawn" <block>

<block> ::= "{" <statement>* "}"

<expr_stmt> ::= <expr>

# ==========================================
# EXPRESSIONS (Priority 1 = lowest, 8 = highest)
# ==========================================
<expr> ::= <assign_expr>

# Priority 1: Assignment (no chaining)
<assign_expr> ::= <logical_or_expr>
               | <logical_or_expr> "=" <logical_or_expr>

# Priority 2: Logical OR
<logical_or_expr> ::= <logical_and_expr>
                   | <logical_or_expr> "||" <logical_and_expr>

# Priority 3: Logical AND
<logical_and_expr> ::= <equality_expr>
                    | <logical_and_expr> "&&" <equality_expr>

# Priority 4: Equality
<equality_expr> ::= <comparison_expr>
                 | <equality_expr> "==" <comparison_expr>
                 | <equality_expr> "!=" <comparison_expr>

# Priority 5: Comparison (generic <T> vs < operator: lookahead 1)
<comparison_expr> ::= <additive_expr>
                   | <comparison_expr> "<" <additive_expr>
                   | <comparison_expr> ">" <additive_expr>
                   | <comparison_expr> "<=" <additive_expr>
                   | <comparison_expr> ">=" <additive_expr>

# Priority 6: Additive
<additive_expr> ::= <multiplicative_expr>
                 | <additive_expr> "+" <multiplicative_expr>
                 | <additive_expr> "-" <multiplicative_expr>

# Priority 7: Multiplicative
<multiplicative_expr> ::= <power_expr>
                       | <multiplicative_expr> "*" <power_expr>
                       | <multiplicative_expr> "/" <power_expr>
                       | <multiplicative_expr> "%" <power_expr>

# Priority 8: Power (right-associative)
<power_expr> ::= <unary_expr>
              | <unary_expr> "**" <power_expr>

# Unary
<unary_expr> ::= <postfix_expr>
              | "!" <unary_expr>
              | "-" <unary_expr>
              | "+" <unary_expr>

# Postfix (unified: function call, indexing, field access)
<postfix_expr> ::= <primary> (<postfix_op>)*

<postfix_op> ::= "(" <args> ")"
              | "[" <expr> "]"
              | "." IDENTIFIER
              | "." IDENTIFIER "(" <args> ")"
              | "?" <type>

# ==========================================
# PRIMARY EXPRESSIONS
# ==========================================
<primary> ::= IDENTIFIER
           | <literal>
           | "[" <array_elems> "]"
           | "{" <map_elems> "}"
           | "(" <expr> ")"
           | <match_expr>
           | <if_expr>
           | <spawn_expr>

<literal> ::= INTEGER
           | FLOAT
           | STRING
           | "true" | "false"

<array_elems> ::= <expr> ("," <expr>)* ","?
               | ε

<map_elems> ::= <map_entry> ("," <map_entry>)* ","?
             | ε

<map_entry> ::= IDENTIFIER ":" <expr>
             | STRING ":" <expr>

# ==========================================
# EXPRESSION FORMS (if, match, spawn)
# ==========================================
<if_expr> ::= "if" <expr> <block> "else" <if_expr>
           | "if" <expr> <block> "else" <block>

<match_expr> ::= "match" <expr> "{" <match_arms> "}"

<spawn_expr> ::= "spawn" <block>

# ==========================================
# TYPES
# ==========================================
<type> ::= <type_base>
         | <type_base> "<" <type_list> ">"
         | "[" <type> "]"
         | "{" <type_fields> "}"
         | "(" <type_list> ")" "->" <type>

<type_base> ::= IDENTIFIER
             | "i32" | "i64" | "f32" | "f64" | "string" | "bool" | "void"

<type_list> ::= <type> ("," <type>)*
             | ε

<type_fields> ::= <type_field> ("," <type_field>)* ","?
               | ε

<type_field> ::= IDENTIFIER ":" <type>

<type_params> ::= "<" IDENTIFIER ("," IDENTIFIER)* ">"

# ==========================================
# FUNCTIONS & PATTERNS
# ==========================================
<params> ::= <param> ("," <param>)* ","?
          | ε

<param> ::= IDENTIFIER ":" <type>

<args> ::= <expr> ("," <expr>)* ","?
        | ε

<pattern> ::= IDENTIFIER
           | <literal>
           | "Ok" "(" <pattern> ")"
           | "Err" "(" <pattern> ")"
           | "Some" "(" <pattern> ")"
           | "None"
```

---

## 수정 사항 정리 (6개 핵심)

| # | 문제 | 해결 | 위치 |
|---|------|------|------|
| 1 | Block vs Map 충돌 | Context-sensitive (parser context에서 구분) | `<block>` vs `<map_elems>` |
| 2 | Assignment 체이닝 | Right-associative 제거, single assignment만 | `<assign_expr>` |
| 3 | Postfix 중복 | 통합: `<postfix_op>*` | `<postfix_expr>` |
| 4 | Dangling else | `else` 필수 또는 match 권장 | `<if_stmt>`, `<if_expr>` |
| 5 | Generic `<T>` vs `<` | Lookahead 1 (type context) | `<comparison_expr>` |
| 6 | 누락 규칙 | `<return_stmt>`, postfix에 통합 | 명시적 정의 |

---

## 파싱 타입

✅ **LL(1)** 가능
- Lookahead 1개로 모든 선택 가능
- Recursive Descent 권장

```
Generic <T> vs < 연산자:
  <T> : type context (lookahead: IDENTIFIER 또는 type keyword)
  <expr : comparison (lookahead: non-type)
```

---

## 다음 단계

1. ✅ **Parser-Ready BNF v2** (완료)
2. ⏳ **LL(1) Conflict 분석**
3. ⏳ **AST 구조 설계**
