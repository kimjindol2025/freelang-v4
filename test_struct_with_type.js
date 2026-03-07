const { Lexer } = require('./dist/lexer.js');
const { Parser } = require('./dist/parser.js');

// Test with return type annotation
const code = `fn createToken(type: string, value: string): string {
  return "test"
}`;

console.log("=== Test: Struct literal with string keys and return type ===");
console.log(code);
console.log("\n--- Parsing ---");

try {
  const lexer = new Lexer(code);
  const { tokens, errors: lexErrors } = lexer.tokenize();
  
  if (lexErrors.length > 0) {
    console.log("❌ Lexer errors:");
    lexErrors.forEach(e => console.log(`  ${e.message}`));
  } else {
    console.log(`✅ Lexer OK: ${tokens.length} tokens`);
    
    const parser = new Parser(tokens);
    const stmts = parser.parse();
    
    if (parser.errors.length > 0) {
      console.log("❌ Parser errors:");
      parser.errors.forEach(e => console.log(`  ${e.message}`));
    } else {
      console.log(`✅ Parser OK: ${stmts.length} statements`);
      console.log("\nParsed successfully!");
    }
  }
} catch (e) {
  console.log("❌ Exception:", e.message);
}

// Test 2: With struct literal
const code2 = `fn createToken(t: string, v: string): string {
  let x = { "type": t }
  return v
}`;

console.log("\n\n=== Test 2: Struct literal in function with return type ===");
console.log(code2);
console.log("\n--- Parsing ---");

try {
  const lexer = new Lexer(code2);
  const { tokens, errors: lexErrors } = lexer.tokenize();
  
  if (lexErrors.length > 0) {
    console.log("❌ Lexer errors");
  } else {
    const parser = new Parser(tokens);
    const stmts = parser.parse();
    
    if (parser.errors.length > 0) {
      console.log("❌ Parser errors:");
      parser.errors.forEach(e => console.log(`  ${e.message}`));
    } else {
      console.log(`✅ Parser OK: ${stmts.length} statements`);
    }
  }
} catch (e) {
  console.log("❌ Exception:", e.message);
}
