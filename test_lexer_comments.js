// Test the compiled lexer with comments
const { Lexer } = require('./dist/lexer.js');

const code = `# This is a comment
fn hello() {
  print("world")
}`;

console.log("Testing lexer with code:");
console.log(code);
console.log("\n--- Tokenization ---");

const lexer = new Lexer(code);
const result = lexer.tokenize();

console.log(`Tokens: ${result.tokens.length}`);
console.log(`Errors: ${result.errors.length}`);

if (result.errors.length > 0) {
  console.log("\n❌ ERRORS:");
  result.errors.forEach(e => console.log(`  ${e.message} at line ${e.line}, col ${e.col}`));
} else {
  console.log("\n✅ SUCCESS - No errors!");
  console.log("\nFirst 10 tokens:");
  result.tokens.slice(0, 10).forEach((t, i) => {
    console.log(`  ${i}: ${t.type} = "${t.lexeme}"`);
  });
}
