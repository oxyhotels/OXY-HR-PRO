const rawText = '"{\\"email\\":\\"oxy8626@gmail.com\\",\\"password\\":\\"OXY@@8626\\"}"';
console.log('raw:', rawText);
let parsed = JSON.parse(rawText);
console.log('first parse type:', typeof parsed);
console.log('first parse value:', parsed);
while (typeof parsed === 'string') {
  parsed = JSON.parse(parsed);
}
console.log('final type:', typeof parsed);
console.log('final value:', parsed);
