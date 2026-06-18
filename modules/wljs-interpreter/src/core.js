var core = {};
core.name = "Core Context";
interpretate.contextExpand(core);

core.DefaultWidth = 370;

core.ConsoleLog = [];

core.GarbageCollected = async(args, env) => {
    if ('element' in env) {
        env.element.innerText = '- Garbage -';
    }
    console.log('garbage collected');
}

core.GarbageCollected.update = async() => console.warn('Gargbage collected items cannot be updated')
core.GarbageCollected.destroy = async() => console.warn('Gargbage collected items cannot be destroyed')

core.True = (args, env) => {
    return true;
}

core.False = (args, env) => {
    return false;
}

core.False.update = core.False
core.True.update = core.True
core.False.destroy = core.False
core.True.destroy = core.True

/*
core.FrontEndExecutable = async(args, env) => {
    const key = interpretate(args[0], env);
    //creates an instance with its own separate env
    //we need this local context to create stuff and then, destory it if it necessary
    console.log("FEE: creating an object with key " + key);
    //new local scope, global is the same
    const obj = new ExecutableObject(key, env);

    const result = await obj.execute()
    return result;
};

core.FrontEndExecutable.update = async(args, env) => {
    const key = interpretate(args[0], env);
    return await env.global.stack[key].execute();
};

core.FrontEndExecutable.destroy = async(args, env) => {
    const key = interpretate(args[0], env);
    await env.global.stack[key].dispose();
};
*/
core._typeof = function(args, env) {
    if (typeof args === 'string') {
        if (args.charAt(0) === "'")
            return 'string';

        //if (core[args].virtual) return 'variable';
        return 'idunno'
    }
    if (typeof args === 'number') {
        return 'number';
    }
    if (args instanceof Array) {
        return args[0];
    }

    return 'undefined';
}

core._getRules = async function(args, env) {
    let rules = {};
    if (env.hold) {
        for (const el of args) {
            if (el instanceof Array) {
                if (el[0] === 'Rule') {
                    rules[interpretate(el[1], {
                        ...env,
                        hold: false
                    })] = el[2];
                }
            }
        };
    } else {
        for (const el of args) {
            if (el instanceof Array) {
                if (el[0] === 'Rule') {
                    rules[interpretate(el[1], {
                        ...env,
                        hold: false
                    })] = await interpretate(el[2], env);
                }
            }
        };
    }

    return rules;
}

core._getRulesReversed = async function(args, env) {
    let rules = {};
    if (env.hold) {
        for (let i=args.length-1; i>=0; i--) {
            const el = args[i];
            if (el instanceof Array) {
                if (el[0] === 'Rule') {
                    rules[interpretate(el[1], {
                        ...env,
                        hold: false
                    })] = el[2];
                }
            }
        };
    } else {
        for (let i=args.length-1; i>=0; i--) {
            const el = args[i];
            if (el instanceof Array) {
                if (el[0] === 'Rule') {
                    rules[interpretate(el[1], {
                        ...env,
                        hold: false
                    })] = await interpretate(el[2], env);
                }
            }
        };
    }

    return rules;
}

core.Cot = async (args, env) => {
  const x = await interpretate(args[0], env);
  return 1 / Math.tan(x);
}

core.Cot.update = core.Cot

core.Csc = async (args, env) => {
  const x = await interpretate(args[0], env);
  return 1 / Math.sin(x);
}

core.Csc.update = core.Csc

core.Sec = async (args, env) => {
  const x = await interpretate(args[0], env);
  return 1 / Math.cos(x);
}

core.Sec.update = core.Sec

core.ReadClipboard = async(args, env) => {
    const clipText = await navigator.clipboard.readText();
    return clipText;
}

core['CoffeeLiqueur`Extensions`WLJSInterpreter`ReadClipboard'] = core.ReadClipboard;

core.FrontEndDispose = function(args, env) {
    //no need anymore
    console.log('garbage removed');
}

core.NoVirtual = async(args, env) => {
    return await interpretate(args, {
        ...env,
        novirtual: true
    })
}

core.NoVirtual.destroy = core.NoVirtual


core.FlipSymbols = async function(args, env) {
    const key1 = args[0];
    const key2 = args[1];

    if (args.length > 2) {
        console.log('applying function ' + args[2]);
        const temp = await interpretate([args[2], key1], {
            ...env,
            novirtual: true
        });
        core[key1].data = core[key2].data;
        core[key2].data = temp;
    } else {
        const temp = core[key1].data;
        core[key1].data = core[key2].data;
        core[key2].data = temp;
    }



    Object.values(core[key1].instances).forEach((inst) => {
        inst.update();
    });

    Object.values(core[key2].instances).forEach((inst) => {
        inst.update();
    });
}

core.Unsafe = async function(args, env) {
    return await interpretate(args[0], {
        ...env,
        unsafe: true
    });
}

core.GlobalThrottle = async function(args, env) {
    interpretate.throttle = await interpretate(args[0], env);
}

core.FrontEndExecutableHold = core.FrontEndExecutable;
//to prevent codemirror 6 from drawing it
core.FrontEndRef = core.FrontEndExecutable;
//another alias
core.FrontEndExecutableWrapper = core.FrontEndExecutable;
//hold analogue for the backend

core.FrontEndOnly = (args, env) => {
    return interpretate(args[0], env);
};

core.FrontEndOnly.update = (args, env) => {
    return interpretate(args[0], env);
};

core.FrontEndOnly.destroy = (args, env) => {
    interpretate(args[0], env);
};

core.FHold = core.FrontEndOnly;

core.Hold = core.FrontEndOnly;

core.Dynamic = () => {
    console.warn('Dynamic is not supported. Use Offload! Ignored...');
};


core.Power = async(args, env) => {
    //if (!env.numerical) return ["Power", ...args];

    const val = await interpretate(args[0], env);
    const p = await interpretate(args[1], env);

    return Math.pow(val, p);
}

core.Power.destroy = core.Power
core.Power.update = core.Power

core.E = () => Math.E
core.E.update = core.E
core.E.destroy = core.E

core.Exp = async (args, env) => {
    const v = await interpretate(args[0], env);
    return Math.exp(v)
}

core.Exp.update = core.Exp;

core.Complex = (args, env) => {
    return new Complex(interpretate(args[0], env), interpretate(args[1], env))
}

core.Plus = async(args, env) => {
    let x = await interpretate(args[0], env);
    let y = await interpretate(args[1], env);

    if (x instanceof NumericArrayObject) {
        x = x.normal();
    }

    if (y instanceof NumericArrayObject) {
        y = y.normal();
    }

    const typeX = typeof x;
    const typeY = typeof y;
    let result;

    if (typeX === 'number' && typeof typeY !== 'number') {
        result =  sumNestedArrayByScalar(y, x)
    } else if (typeY === 'number' && typeof typeX !== 'number') {
        result =  sumNestedArrayByScalar(x, y)
    } else if (typeY !== 'number' && typeof typeX !== 'number') {
        result =  calculateNestedArraySum(x, y)
    } else {
        result = x + y
    }

    //TODO: support multiple arguments better
    if (args.length > 2) {
        return await core.Plus([['JSObject', result], ...args.slice(2)])
    }

    return result;
}

core.Plus.update = core.Plus;

core.Plus.destroy = async(args, env) => {
    await interpretate(args[0], env);
    await interpretate(args[1], env);
}

core.Rational = async function(args, env) {
    return (await interpretate(args[0], env)) / (await interpretate(args[1], env));
}

core.Rational.update = core.Rational
core.Rational.destroy = core.Rational

function multiplyNestedArrayByScalar(arr, scalar) {
    if (Array.isArray(arr)) {
        return arr.map((item) => multiplyNestedArrayByScalar(item, scalar));
    } else {
        return arr * scalar;
    }
}

function calculateNestedArraySum(arr1, arr2) {
    // Base case: if both inputs are numbers, return their sum


    const result = [];

    for (let i = 0; i < arr1.length; i++) {
        if (Array.isArray(arr1[i]) && Array.isArray(arr2[i])) {
            // If both elements are arrays, recursively calculate nested sum
            result.push(calculateNestedArraySum(arr1[i], arr2[i]));
        } else if (!Array.isArray(arr1[i]) && !Array.isArray(arr2[i])) {
            // If both elements are numbers, add them
            result.push(arr1[i] + arr2[i]);
        } else {
            // Mismatched types, throw an error
            throw new Error('Mismatched element types in nested arrays.');
        }
    }

    return result;
}

function sumNestedArrayByScalar(arr, scalar) {
    if (Array.isArray(arr)) {
        return arr.map((item) => sumNestedArrayByScalar(item, scalar));
    } else {
        return arr + scalar;
    }
}

core.Times = async function(args, env) {
    //if (env.numerical === true) return (await interpretate(args[0], env)) * (await interpretate(args[1], env));
    let x = await interpretate(args[0], env);
    let y = await interpretate(args[1], env);

    if (x instanceof NumericArrayObject) {
        x = x.normal();
    }

    if (y instanceof NumericArrayObject) {
        y = y.normal();
    }

    const typeX = typeof x;
    const typeY = typeof y;

    if (typeX === 'number' && typeof typeY !== 'number') {
        return multiplyNestedArrayByScalar(y, x)
    }

    if (typeY === 'number' && typeof typeX !== 'number') {
        return multiplyNestedArrayByScalar(x, y)
    }

    //TODO: evaluate it before sending its original symbolic form
    return x * y;
}

core.Times.update = core.Times;

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

core.Times.destroy = async function(args, env) {
    //if (env.numerical === true) return (await interpretate(args[0], env)) * (await interpretate(args[1], env));
    await interpretate(args[0], env);
    await interpretate(args[1], env);
}

core.RandomReal = async(args, env) => {
    const range = await interpretate(args[0], env);

    if (args.length > 1) {
        let size = await interpretate(args[1], env);
        let arr = [];

        if (size[0]) {
            for (let j = 0; j < size[0]; ++j) {
                const sub = [];
                for (let i = 0; i < size[1]; ++i) {
                    sub.push(getRandomArbitrary(...range));
                }
                arr.push(sub);
            }

            return arr;
        } else {
            for (let i = 0; i < size; ++i) {
                arr.push(getRandomArbitrary(...range));
            }
            return arr;
        }
    }
    return getRandomArbitrary(...range);


}

core.Abs = async (args, env) => {
  const d = await interpretate(args[0], env);
  return Math.abs(d)
}

core.Abs.update = core.Abs 

core.Tan = async function(args, env) {
    return Math.tan(await interpretate(args[0], env));
}

core.Sin = async function(args, env) {
    return Math.sin(await interpretate(args[0], env));
}

core.Cos = async function(args, env) {
    return Math.cos(await interpretate(args[0], env));
}

core.Log = async function(args, env) {
    return Math.log(await interpretate(args[0], env));
}

core.Cos.update = core.Cos
core.Cos.destroy = core.Cos

core.Sin.update = core.Sin
core.Sin.destroy = core.Sin

core.Log.update = core.Log
core.Log.destroy = core.Log

core.Tuples = async(args, env) => {
    const array = await interpretate(args[0], env);
    const subsetSize = interpretate(args[1], env);

    const result = [];

    function generateSubsets(index, currentSubset) {
        if (currentSubset.length === subsetSize) {
            result.push(currentSubset);
            return;
        }

        for (let i = 0; i < array.length; i++) {
            generateSubsets(i, [...currentSubset, array[i]]);
        }
    }

    generateSubsets(0, []);

    return result;
}

core.Tuples.update = core.Tuples;
core.Tuples.destroy = (args, env) => {
    interpretate(args[0], env)
}

core.EventListener = (args, env) => {
    console.error('Event listener for general cases is not supported! Please, use it with Graphics or other packages');
}

core.List = async function(args, env) {
    let copy, e, i, len, list;
    list = [];

    if (env.hold === true) {
        //console.log('holding...');
        for (i = 0, len = args.length; i < len; i++) {
            e = args[i];
            list.push(e);
        }
        return list;
    }

    copy = Object.assign({}, env);
    for (i = 0, len = args.length; i < len; i++) {
        e = args[i];
        const evaluated = await interpretate(e, copy);

        if (evaluated instanceof NumericArrayObject) {
            list.push(evaluated.normal());
            continue;
        }

        list.push(evaluated);
    }

    return list;
};

core.List.destroy = (args, env) => {
    console.log('List destroed!');
    console.warn('Usually it should never happen... Probably some parent`s destructor did work in a wrong way');
};

core.List.update = core.List;

core.Association = async function(args, env) {
    return (await core._getRules(args, env));
};

core.Association.update = core.Association

core.Association.destroy = async(args, env) => {
    for (const i of args) {
        await interpretate(i, env);
    }
}


core.Function = (args, env) => {
    //void
}

core.$Failed = (args, env) => {
    console.error('$Failed encountered');
}

core.Pause = async(args, env) => {
    const time = 1000 * (await interpretate(args[0], env));

    return new Promise(resolve => {
        setTimeout(() => {
            //console.log("Finished Inner Timeout")
            resolve('resolved');
        }, time);
    })
}

core.Normalize = async(args, env) => {
    const data = await interpretate(args[0], env);
    //console.log(data);

    let length = 0.0;
    for (let i = 0; i < data.length; ++i) {
        length += data[i] * data[i];
    }


    return (data.map((e) => e / length));
}

core.Normalize.update = core.Normalize
core.Normalize.destroy = async(args, env) => await interpretate(args[0], env)

core.Dot = async(args, env) => {
    const x = await interpretate(args[0], env);
    const y = await interpretate(args[1], env);

    let total = 0.0;
    for (let i = 0; i < x.length; ++i) {
        total += x[i] * y[i];
    }
    return total;
}

core.Dot.update = core.Dot
core.Dot.destroy = async(args, env) => {
    await interpretate(args[0], env);
    await interpretate(args[1], env);
}

core.Cross = async(args, env) => {
    const x = await interpretate(args[0], env);
    const y = await interpretate(args[1], env);

    return [y[2] * x[1] - y[1] * x[2], -y[2] * x[0] + y[0] * x[2], y[1] * x[0] - y[0] * x[1]];
}

core.Cross.update = core.Cross
core.Cross.destroy = async(args, env) => {
    await interpretate(args[0], env);
    await interpretate(args[1], env);
}

core.NoUpdates = async(args, env) => {
    return await interpretate(args[0], env);
}

core.NoUpdates.destroy = async(args, env) => {
    return await interpretate(args[0], env);
}

core.NoUpdates.update = async(args, env) => {
    console.log('Updates are blocked by NoUpdates expr');
    return null;
}

core.Static = async(args, env) => {
    return await interpretate(args[0], env);
}

core.Static.destroy = async(args, env) => {
    return await interpretate(args[0], env);
}

core.Static.update = async(args, env) => {
    console.log('Updates are not allowed inside Static');
    return undefined;
}

core.Constant = async(args, env) => {
    return await interpretate(args, {
        ...env,
        novirtual: true
    })
}

core.Constant.update = async(args, env) => {
    console.log('Updates are blocked for constants');
    return undefined;
}

core.Constant.destroy = core.Constant

core.CompoundExpression = async(args, env) => {
    //sequential execution
    let content;

    for (const expr of args) {
        content = await interpretate(expr, env);
    }

    return content;
}

core.CompoundExpression.update = async(args, env) => {
    //sequential execution
    let content;

    for (const expr of args) {
        content = await interpretate(expr, env);
    }

    return content;
}

core.CompoundExpression.destroy = async(args, env) => {
    for (const expr of args) {
        await interpretate(expr, env);
    }
}

core.While = async(args, env) => {
    //sequential execution

    //creating virtual objects in conditions are fobidden
    const condition = await interpretate(args[0], {
        ...env,
        novirtual: true
    });
    //console.log('condition: ' + condition);
    if (condition) {

        //creating virtual objects is fobidden in cycles
        await interpretate(args[1], {
            ...env,
            novirtual: true
        });
        await interpretate(['While', ...args], env);
    }
}

core.If = async(args, env) => {
    const cond = await interpretate(args[0], env);
    if (cond) {
        return await interpretate(args[1], env);
    } else {
        if (args.length > 2) return await interpretate(args[2], env);
        return null;
    }
}

core.If.update = core.If
core.If.destroy = async(args, env) => {
    await interpretate(args[0], env)
    await interpretate(args[1], env);
}

core.Less = async(args, env) => {
    if ((await interpretate(args[0], env)) < (await interpretate(args[1], env))) return true;
    else return false;
}

core.Less.update = core.Less
core.Less.destroy = core.Less

core.Greater = async(args, env) => {
    if ((await interpretate(args[0], env)) > (await interpretate(args[1], env))) return true;
    else return false;
}

core.Greater.update = core.Greater
core.Greater.destroy = core.Greater

core.Equals = async(args, env) => {
    if ((await interpretate(args[0], env)) === (await interpretate(args[1], env))) return true;
    else return false;
}

core.Equals.update = core.Equals
core.Equals.destroy = core.Equals

core.Alert = async(args, env) => {
    interpretate.alert(await interpretate(args[0], env));
}
//alias
core['CoffeeLiqueur`Extensions`WLJSInterpreter`Alert'] = core.Alert;

core.Print = async(args, env) => {
    console.log('Out:\t' + JSON.stringify(await interpretate(args[0], env)));
}

core.Null = () => undefined
core.Null.update = () => undefined
core.Null.destory = () => undefined

core.N = (args, env) => {
    const copy = {
        ...env,
        numerical: true
    };
    return interpretate(args[0], copy);
}

core.AttachDOM = async(args, env) => {
    //used to attach dom element to the containirized function
    if (!env.root) {
        console.warn('Using AttachDOM on pure function is not recommended. Consider to use virtual or real containers instead!');
    }

    const id = await interpretate(args[0], env);
    env.element = document.getElementById(id);
    return id;
}

core.AttachDOM.destroy = async(args, env) => {}
core.AttachDOM.update = async(args, env) => {}

core['Global`AttachDOM'] = core.AttachDOM

core['CoffeeLiqueur`Extensions`WLJSInterpreter`AttachDOM'] = core.AttachDOM


core.WindowScope = async(args, env) => {
    const key = interpretate(args[0]);
    return window[key];
}

core['CoffeeLiqueur`Extensions`WLJSInterpreter`WindowScope'] = core.WindowScope

core.Evaluate = async(args, env) => {
    const i = await interpretate(args[0], env);

    return await interpretate(i, env);
}

core.RandomSample = async(args, env) => {
    //TODO: needs perfomance optimization. do not evaluate deeper than
    let list = await interpretate(args[0], {
        ...env
    });

    _shuffle(list);

    return list;
}

function _shuffle(array) {
    let currentIndex = array.length,
        randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }

    return array;
}

core.Table = async(args, env) => {
    let copy = Object.assign({}, env);
    copy.hold = false;

    let listOfRanges = [];

    for (let ranges of args.slice(1)) {
        listOfRanges.push({
            ranges: await interpretate(ranges, {
                ...env,
                hold: true
            })
        });
        //just to get a JS array of WL objects //hah kinda strange combination
    }

    if (!copy.scope) copy.scope = {};
    let deepcopy = {
        ...copy.scope
    };

    //first stage - assign the first values
    for (let i = 0; i < listOfRanges.length; ++i) {
        //console.warn(listOfRanges[i]);
        listOfRanges[i].id = listOfRanges[i].ranges.shift();
        //console.log('variable: '+listOfRanges[i].id);

        switch (listOfRanges[i].ranges.length) {
            case 1:
                const a = await interpretate(listOfRanges[i].ranges[0], {
                    ...env,
                    numerical: true,
                    novirtual: true,
                    hold: false
                });
                if (a instanceof Array) {
                    //array instead of a number
                    listOfRanges[i].ranges = [1, a.length];
                    listOfRanges[i].array = a;

                    break;
                }

                const newranges = [1, a];
                listOfRanges[i].ranges = newranges;

                break;

            case 2:
                //console.log('a numerical range');

                listOfRanges[i].ranges[0] = await interpretate(listOfRanges[i].ranges[0], {
                    ...env,
                    novirtual: true,
                    numerical: true,
                    hold: false
                });
                listOfRanges[i].ranges[1] = await interpretate(listOfRanges[i].ranges[1], {
                    ...env,
                    novirtual: true,
                    numerical: true,
                    hold: false
                });
                break;

            case 3:
                //console.log('a numerical range with defined step');

                listOfRanges[i].ranges[0] = await interpretate(listOfRanges[i].ranges[0], {
                    ...env,
                    novirtual: true,
                    numerical: true,
                    hold: false
                });
                listOfRanges[i].ranges[1] = await interpretate(listOfRanges[i].ranges[1], {
                    ...env,
                    novirtual: true,
                    numerical: true,
                    hold: false
                });
                listOfRanges[i].ranges[2] = await interpretate(listOfRanges[i].ranges[2], {
                    ...env,
                    novirtual: true,
                    numerical: true,
                    hold: false
                });
                break;
        }
    }

    //console.log(JSON.stringify(listOfRanges));


    const iterate = async(r0, f, level) => {
        const result = [];
        const r = {
            ...r0
        };

        //console.log('range: '+JSON.stringify(r));

        switch (r.ranges.length) {
            case 2:
                if (r.array) {

                    for (let i = r.ranges[0]; i <= r.ranges[1]; i++) {
                        //console.log('iterator '+r.id+' = '+i);
                        deepcopy[r.id] = () => r.array[i - 1];
                        result.push(await f(level + 1));
                    }

                    break;
                }

                for (let i = r.ranges[0]; i <= r.ranges[1]; i++) {
                    //console.log('iterator '+r.id+' = '+i);
                    deepcopy[r.id] = () => i;
                    result.push(await f(level + 1));
                }
                break;

            case 3:
                for (let i = r.ranges[0]; i <= r.ranges[1]; i = i + r.ranges[2]) {
                    //console.log('iterator '+r.id+' = '+i);
                    deepcopy[r.id] = () => i;
                    result.push(await f(level + 1));
                }
                break;
        }
        return result;
    };

    let m;
    m = (level) => {
        //console.log('go deeper');
        if (level === listOfRanges.length) return interpretate(args[0], {
            ...copy,
            scope: {
                ...deepcopy
            }
        });
        //console.log('next nested');
        return iterate(listOfRanges[level], m, level);
    }

    const table = await iterate(listOfRanges[0], m, 0);
    //console.log('table');
    //console.log(table);

    if (env.hold) {
        //env.hold = false;
        //return ["JSObject", table]; 
    }
    return table;

}

core.Table.update = core.Table

core.Table.destroy = (args, env) => {
    args.forEach((a) => {
        interpretate(a, env);
    })
}

core.JSObject = (args, env) => {
    return args[0];
}

core.Set = async(args, env) => {
    const data = await interpretate(args[1], {
        ...env,
        novirtual: true,
        method: undefined
    });
    const name = args[0];

    //console.log(name);

    if (name in core) {
        //console.log("update");
        //update
        core[name].data = data;

        for (const inst of Object.values(core[name].instances)) {
            inst.update();
        };

        return;
    }

    //create
    console.log("create");
    core[name] = async(args, env) => {
        //console.log('calling our symbol...');
        if (env.root && !env.novirtual) core[name].instances[env.root.uid] = env.root; //if it was evaluated insdide the container, then, add it to the tracking list
        //if (env.hold) return ['JSObject', core[name].data];

        return core[name].data;
    }

    core[name].update = async(args, env) => {
        //if (env.hold) return ['JSObject', core[name].data];
        return core[name].data;
    }

    core[name].virtual = true;
    core[name].instances = {};

    core[name].data = data;

}

core.Set.destroy = (args, env) => {
    interpretate(args[1], env);
}

core.Set.update = core.Set

core.SetDelayed = async(args, env) => {
    //just copy Set without intepreteate()

}

core.Length = async(args, env) => {
    const l = (await interpretate(args[0], {
        ...env,
        novirtual: true
    })).length;
    //console.log('length: '+l);
    return l;
}

core.Length.update = async(args, env) => {
    const l = (await interpretate(args[0], {
        ...env,
        novirtual: true
    })).length;
    //console.log('length: '+l);
    return l;
}

core.Length.destroy = async(args, env) => {
    await interpretate(args[0], {
        ...env,
        novirtual: true
    });
}

core.ByteArray = async (args, env) => {
    const b = await interpretate(args[0], env);
    if (Array.isArray(b)) {
        const bytes = new Uint8Array(b);
        return bytes.buffer; 
    }
    const binaryString = atob(b);
    const bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;    
}

///todo needs so more optimizations!!!
//do not evlaute the whole stuff
core.Part = async(args, env) => {
    const p = await interpretate(args[1], env);
    const data = await interpretate(args[0], {
        ...env,
        useCache: true //enable caching to prevent multiple evaluations
    });

    if (Array.isArray(p)) {
        throw('Arrays in Part is not supported for now!');
    }

    if (data instanceof NumericArrayObject) {
        let offset = p-1; 
        //console.log('Taking part: '+offset);
        //console.log(data);

        if (data.dims.length > 1) {
            let step = 1;
            for (let i = data.dims.length-1; i > 0; --i) {
                offset *= data.dims[i];
                step *= data.dims[i];
            }
            //console.log(step);
            const part = (new NumericArrayObject(data.buffer.slice(offset, offset+step), data.dims.slice(1)));
            //console.log(part);
            return part;
        }

        //console.log('LAready simple');
        //console.log(data);
        //console.log(data.buffer[p-1]);

        return data.buffer[p-1];

    }

    return data[p - 1];
}

core.Part.update = core.Part;
core.Part.destroy = async(args, env) => {
    const p = await interpretate(args[1], env);
    const data = await interpretate(args[0], {
        ...env
    })
}

core.JSObject = async(args, env) => {
    return args[0];
}

core.JSObject.update = core.JSObject;
core.JSObject.destroy = core.JSObject;



/*core.RGBColor =  async (args, env) => {
const color = [];
for (const col of args) {
color.push(await interpretate(col, env));
}

color.unshift('RGBColor');
console.log('color:' + JSON.stringify(color));
return color;

return new UnevaluedSymbl() aka JS object
}*/

core.Flatten = async(args, env) => {
    //always reset hold if it is there, that it wont propagate
    const result = (await interpretate(args[0], {
        ...env,
        hold: false
    })).flat(Infinity);
    //if (env.hold) return ['JSObject', result];
    return result;
}

core.Flatten.update = core.Flatten

core.Flatten.destroy = async(args, env) => {
    await interpretate(args[0], {
        ...env,
        hold: false
    });
}

core.Partition = async(args, env) => {
    const perChunk = await interpretate(args[1], {
        ...env,
        hold: false
    });
    const inputArray = await interpretate(args[0], {
        ...env,
        hold: false
    });

    const result = inputArray.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / perChunk)

        if (!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = [] // start a new chunk
        }

        resultArray[chunkIndex].push(item)

        return resultArray
    }, []);


    //if (env.hold) return ['JSObject', result];
    return result;
}

core.Partition.update = core.Partition
core.Partition.destroy = async(args, env) => {
    const perChunk = await interpretate(args[1], {
        ...env,
        hold: false
    });
    const inputArray = await interpretate(args[0], {
        ...env,
        hold: false
    });
}

core.HoldFirstLevel = async(args, env) => {
    return await interpretate(args[0], {
        ...env,
        hold: true
    });
}


core.With = async(args, env) => {
    const params = await interpretate(args[0], {
        ...env,
        hold: true
    });

    //console.log(JSON.stringify(params));

    let scope;
    if (env.scope) scope = {
        ...env.scope
    };
    else scope = {};

    const copy = {
        ...env,
        scope: scope
    };
    for (const p of params) {
        const r = await interpretate(p[2], env);
        copy.scope[p[1]] = () => r;
    }

    return await interpretate(args[1], copy);
}

core.With.update = core.With

core.With.destroy = (args, env) => {
    //destroy params
    interpretate(args[0], env);

    //destory args
    interpretate(args[1], env);
}

core.Map = async(args, env) => {
    const func = args[0];
    const array = await interpretate(args[1], {
        ...env,
        hold: false
    });


    const result = [];

    for (const el of array) {
        result.push(await interpretate([func, ['JSObject', el]], {
            ...env,
            hold: false
        }));
    }

    //if (env.hold) return ["JSObject", result];
    return result;
}

function transpose(matrix) {
    const rows = matrix.length, cols = matrix[0].length;
    const grid = [];
    for (let j = 0; j < cols; j++) {
      grid[j] = Array(rows);
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        grid[j][i] = matrix[i][j];
      }
    }
    return grid;
  }

core.Transpose = async (args, env) => {
    const array = await interpretate(args[0], env);
    return transpose(array);
}

core.Transpose.update = core.Transpose 

core.White = (args, env) => {
    return interpretate(['RGBColor', 1, 1, 1], env);
}

core.LightBlue = (args, env) => {
    return interpretate(['RGBColor', 0.87, 0.94, 1], env);
}

core.Brown = (args, env) => {
    return interpretate(['RGBColor', 0.6, 0.4, 0.2], env);
}

core.Sqrt = async(args, env) => {
    return Math.sqrt(await interpretate(args[0], env));
}

core.Sqrt.update = core.Sqrt
core.Sqrt.destroy = core.Sqrt

core.Rule = async(args, env) => {
    const key = await interpretate(args[0], env);
    const val = await interpretate(args[1], env)
    if (env.Association) {
        env.Association[key] = val;
        return;
    } else {
        return {
            lhs: key,
            rhs: val
        };
    }
}

core.Identity = async (args, env) => {
    if (!args) return;
    if (args.length)
        return await interpretate(args[0], env);
}

core.Identity.update = core.Identity
core.Identity.destroy = core.Identity

core.Rule.destroy = async(args, env) => {
    const key = await interpretate(args[0], env);
    const val = await interpretate(args[1], env);
}

core.Dynamic = (args, env) => {
    console.warn('Dynamic is not supported! Use Offload keyword');
    interpretate(args[0], env);
}

core.AbsoluteCurrentValue = () => {}

core.Dynamic.update = core.Dynamic
core.Dynamic.destroy = core.Dynamic

core.Pi = () => Math.PI
core.Pi.update = () => Math.PI
core.Pi.destroy = () => {}

core.Norm = async (args, env) => {
    const vector = await interpretate(args[0], env);
    return Math.sqrt(vector.map((el) => el*el).reduce((accumulator, currentValue) => {
    return accumulator + currentValue
  },0));
  }
  
core.Norm.update = core.Norm 

let numerics = {};
//Speeds up by the factor of 60X!!!
numerics.name = "Numerics";
//interpretate.contextExpand(numerics);

core.NumericArray = (args, env) => {
  //const type = interpretate(args[1], env);

  return interpretate(args[0], {...env, context: numerics});
}

core.NumericArray.update = core.NumericArray

numerics.List = (args, env) => {
  return args.map((e) => interpretate(e, env))
}

numerics.List.update = numerics.List

core.ProvidedOptions = async (args, env) => {
    env.options = await core._getRules(args.slice(1), env);
    return await interpretate(args[0], env);
}

core.ProvidedOptions.update = core.ProvidedOptions
core.ProvidedOptions.destroy = core.ProvidedOptions

window.core = core;
