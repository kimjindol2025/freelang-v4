const { Lexer } = require('./dist/lexer.js');

const code = `fn test(x: int, y: int): bool {
  return x >= 0 and y <= 10
}`;

console.log("Testing and/or keywords:");
console.log(code);
console.log("\n--- Tokenization ---");

const lexer = new Lexer(code);
const { tokens } = lexer.tokenize();

console.log("All tokens:");
tokens.forEach((t, i) => {
  console.log(`  ${i}: ${t.type} = "${t.lexeme}"`);
});

const andToken = tokens.find(t => t.lexeme === 'and');
if (andToken && andToken.type === 'AND') {
  console.log("\n✅ 'and' keyword recognized as AND token!");
} else if (andToken) {
  console.log(`\n❌ 'and' tokenized as ${andToken.type}, not AND`);
} else {
  console.log("\n❌ 'and' not found in tokens");
}
