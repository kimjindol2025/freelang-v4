// Test struct literal parsing with string keys
const { Lexer } = require('./dist/lexer.js');
const { Parser } = require('./dist/parser.js');

// Test 1: Simple struct with string keys
const code1 = `fn createToken(type: string, value: string) {
  return { "type": type, "value": value }
}`;

console.log("=== Test 1: Simple struct with string keys ===");
console.log(code1);
console.log("\n--- Parsing ---");

try {
  const lexer = new Lexer(code1);
  const { tokens, errors } = lexer.tokenize();
  
  if (errors.length > 0) {
    console.log("❌ Lexer errors:");
    errors.forEach(e => console.log(`  ${e.message}`));
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

// Test 2: Struct with identifier keys (original format)
const code2 = `fn test() {
  return { type: "IDENT", value: "hello" }
}`;

console.log("\n\n=== Test 2: Struct with identifier keys ===");
console.log(code2);
console.log("\n--- Parsing ---");

try {
  const lexer = new Lexer(code2);
  const { tokens, errors } = lexer.tokenize();
  
  if (errors.length > 0) {
    console.log("❌ Lexer errors:");
    errors.forEach(e => console.log(`  ${e.message}`));
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
