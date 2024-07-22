document.getElementById('runButton').addEventListener('click', function() {
    const code = document.getElementById('codeInput').value;
    const outputElement = document.getElementById('output');
    outputElement.textContent = interpret(code);
});

function interpret(code, globalVars = {}) {
    const lines = code.split('\n');
    let output = '';
    const variables = { ...globalVars };
    const functions = {};
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Пропускаем пустые строки
        if (line === '') {
            i++;
            continue;
        }

        // Пропускаем комментарии, начинающиеся с ||
        if (line.startsWith('||')) {
            i++;
            continue;
        }

        const parts = line.split(' ');
        const command = parts[0];
        const args = parts.slice(1);

        try {
            switch (command) {
                case 'print':
                    output += evaluateExpression(args.join(' '), variables) + '\n';
                    break;
                case 'let':
                    if (args.length >= 3 && args[1] === '=') {
                        const varName = args[0];
                        const varValue = evaluateExpression(args.slice(2).join(' '), variables);
                        variables[varName] = varValue;
                    } else {
                        throw new Error('Invalid variable declaration');
                    }
                    break;
                case 'if':
                    const condition = evaluateExpression(args.slice(0, args.indexOf('then')).join(' '), variables);
                    if (condition) {
                        const thenIndex = args.indexOf('then');
                        const elseIndex = args.indexOf('else');
                        if (elseIndex !== -1) {
                            const thenCommand = args.slice(thenIndex + 1, elseIndex).join(' ');
                            const elseCommand = args.slice(elseIndex + 1).join(' ');
                            output += interpret(thenCommand + '\n', variables);
                        } else {
                            const thenCommand = args.slice(thenIndex + 1).join(' ');
                            output += interpret(thenCommand + '\n', variables);
                        }
                    } else if (args.includes('else')) {
                        const elseIndex = args.indexOf('else');
                        const elseCommand = args.slice(elseIndex + 1).join(' ');
                        output += interpret(elseCommand + '\n', variables);
                    }
                    break;
                case 'while':
                    const loopCondition = args.slice(0, args.indexOf('do')).join(' ');
                    const loopBody = [];
                    i++;
                    while (i < lines.length && lines[i].trim() !== 'end') {
                        loopBody.push(lines[i].trim());
                        i++;
                    }
                    while (evaluateExpression(loopCondition, variables)) {
                        output += interpret(loopBody.join('\n') + '\n', variables);
                    }
                    break;
                case 'function':
                    const functionName = args[0];
                    const functionArgs = args.slice(1, args.indexOf('{')).map(arg => arg.trim());
                    const functionBody = [];
                    i++;
                    while (i < lines.length && lines[i].trim() !== '}') {
                        functionBody.push(lines[i].trim());
                        i++;
                    }
                    functions[functionName] = { args: functionArgs, body: functionBody.join('\n') };
                    break;
                case 'call':
                    const callFunctionName = args[0];
                    if (functions.hasOwnProperty(callFunctionName)) {
                        const callArgs = args.slice(1).map(arg => evaluateExpression(arg, variables));
                        const func = functions[callFunctionName];
                        const localVars = { ...variables };
                        func.args.forEach((arg, index) => {
                            localVars[arg] = callArgs[index];
                        });
                        output += interpret(func.body, localVars);
                    } else {
                        throw new Error(`Function ${callFunctionName} not defined`);
                    }
                    break;
                case 'return':
                    return evaluateExpression(args.join(' '), variables);
                case 'array':
                    if (args.length >= 2 && args[1] === '=') {
                        const arrayName = args[0];
                        variables[arrayName] = [];
                    } else {
                        throw new Error('Invalid array declaration');
                    }
                    break;
                case 'push':
                    if (args.length >= 2) {
                        const arrayName = args[0];
                        if (Array.isArray(variables[arrayName])) {
                            variables[arrayName].push(evaluateExpression(args.slice(1).join(' '), variables));
                        } else {
                            throw new Error(`Variable ${arrayName} is not an array`);
                        }
                    } else {
                        throw new Error('Invalid push operation');
                    }
                    break;
                case 'get':
                    if (args.length === 2) {
                        const arrayName = args[0];
                        const index = evaluateExpression(args[1], variables);
                        if (Array.isArray(variables[arrayName])) {
                            output += variables[arrayName][index] + '\n';
                        } else {
                            throw new Error(`Variable ${arrayName} is not an array`);
                        }
                    } else {
                        throw new Error('Invalid get operation');
                    }
                    break;
                case 'concat':
                    if (args.length >= 4 && args[1] === '=') {
                        const varName = args[0];
                        const str1 = evaluateExpression(args[2], variables);
                        const str2 = evaluateExpression(args[3], variables);
                        variables[varName] = str1 + str2;
                    } else {
                        throw new Error('Invalid concat operation');
                    }
                    break;
                case 'length':
                    if (args.length >= 3 && args[1] === '=') {
                        const varName = args[0];
                        const strOrArray = evaluateExpression(args[2], variables);
                        variables[varName] = strOrArray.length;
                    } else {
                        throw new Error('Invalid length operation');
                    }
                    break;
                case 'slice':
                    if (args.length >= 4 && args[1] === '=') {
                        const varName = args[0];
                        const strOrArray = evaluateExpression(args[2], variables);
                        const start = evaluateExpression(args[3], variables);
                        const end = args.length === 5 ? evaluateExpression(args[4], variables) : strOrArray.length;
                        variables[varName] = strOrArray.slice(start, end);
                    } else {
                        throw new Error('Invalid slice operation');
                    }
                    break;
                case 'input':
                    if (args.length === 2 && args[1] === '=') {
                        const varName = args[0];
                        variables[varName] = prompt('Enter a value:');
                    } else {
                        throw new Error('Invalid input operation');
                    }
                    break;
                case 'indexof':
                    if (args.length >= 3 && args[1] === '=') {
                        const varName = args[0];
                        const strOrArray = evaluateExpression(args[2], variables);
                        const searchValue = evaluateExpression(args[3], variables);
                        variables[varName] = strOrArray.indexOf(searchValue);
                    } else {
                        throw new Error('Invalid indexof operation');
                    }
                    break;
                default:
                    throw new Error(`Unknown command: ${command}`);
            }
        } catch (error) {
            output += `Error: ${error.message}\n`;
        }

        i++;
    }

    return output;
}

function evaluateExpression(expression, variables) {
    const tokens = expression.split(' ');

    if (tokens.length === 1) {
        const token = tokens[0];
        if (!isNaN(token)) {
            return Number(token);
        } else if (variables.hasOwnProperty(token)) {
            return variables[token];
        } else {
            return token;
        }
    }

    let result = null;
    let operator = null;

    tokens.forEach(token => {
        if (!isNaN(token)) {
            const num = Number(token);
            if (result === null) {
                result = num;
            } else if (operator) {
                result = applyOperator(result, num, operator);
            }
        } else if (['+', '-', '*', '/'].includes(token)) {
            operator = token;
        } else if (variables.hasOwnProperty(token)) {
            const varValue = variables[token];
            if (result === null) {
                result = varValue;
            } else if (operator) {
                result = applyOperator(result, varValue, operator);
            }
        } else {
            throw new Error(`Unknown token: ${token}`);
        }
    });

    return result;
}

function applyOperator(a, b, operator) {
    switch (operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        default: throw new Error(`Unknown operator: ${operator}`);
    }
                                                           }
