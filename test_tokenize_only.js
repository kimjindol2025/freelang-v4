const { Lexer } = require('./dist/lexer.js');

const code = `fn createToken(type: string, value: string) {
  return { "type": type, "value": value }
}`;

const lexer = new Lexer(code);
const { tokens } = lexer.tokenize();

console.log("Tokens:");
tokens.slice(0, 25).forEach((t, i) => {
  console.log(`${i}: ${t.type} = "${t.lexeme}"`);
});
