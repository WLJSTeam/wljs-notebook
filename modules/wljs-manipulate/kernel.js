
core.AnimationRate = () => "AnimationRate"

core.RefreshBox = async (args, env) => {
    const event = await interpretate(args[1], env);
    const interval = await interpretate(args[2], env);

    await interpretate(args[3], env);

    await interpretate(args[0], {...env});

    console.log({event, interval});

    env.local.readyQ = true;

    if (interval > 0) {

        env.local.timer = setInterval(() => {
            if (!env.local.readyQ) return;
            console.log('Fire!', event);
            env.local.readyQ = false;
            server.kernel.emitt(event, 'True');
        }, interval);
    }
}

core.RefreshBox.update = (args, env) => {
    env.local.readyQ = true;   
}

core.Appearance = () => 'Appearance'
core.Appearance.update = core.Appearance

const animationCtls = {};
core['CoffeeLiqueur`Extensions`Manipulate`Internal`AnimationCtl'] = async (args, env) => {
    const uid = await interpretate(args[0], env);
    const index = await interpretate(args[1], env);
    if (animationCtls[uid]) animationCtls[uid](index);
    return ' ';
}

core['Animate`Shutter'] = async (args, env) => {
    const dataset = await interpretate(args[1], env);
    const rate = await interpretate(args[2], env);

    const options = await core._getRules(args, env);

    if (options.ManualTrigger) {
        animationCtls[options.ManualTrigger] = (index) => {
            core[args[0]].data = ['JSObject', dataset[index]];
            for (const inst of Object.values(core[args[0]].instances)) {
                inst.update();
            };
        }

        server.kernel.io.fire(options.ManualTrigger, true, 'Mounted');
        return;
    }

    let index = 0;
    env.local.interval = setInterval(() => {
        core[args[0]].data = ['JSObject', dataset[index]];
        for (const inst of Object.values(core[args[0]].instances)) {
            inst.update();
        };

        index++;
        if (index >= dataset.length) index = 0;
    }, (1/rate) * 1000);
}

core['Animate`Shutter'].virtual = true;
core['Animate`Shutter'].destroy = (args, env) => {
    if (env.local.interval) {
        clearInterval(env.local.interval);
        env.local.interval = null;
    }
}

core['CoffeeLiqueur`Extensions`Manipulate`Internal`AnimationShutter'] = core['Animate`Shutter'];

core.RefreshBox.destroy = async (args, env) => {
    if (env.local.timer) clearInterval(env.local.timer);
    console.log('Time has been stopped');
}

core.RefreshBox.virtual = true;


const helper = async (args, env) => {
    
    const ranges = await interpretate(args[1], env);
    const event = await interpretate(args[2], env);
    const frameRate = 60.0 / (await interpretate(args[3], env));
    const noTrigger = await interpretate(args[4], env);
    const maxRepetitions = await interpretate(args[5], env);
    let repetitions = 0;

    const startQ = false;

    let timeMarker = () => {}
    let finished = () => {}

    const options = await core._getRules(args, env);

    if (!noTrigger) {
        await interpretate(args[0], env);
    } else {
        //build GUI

        
        const uid = uuidv4();

        let playClass = '', stopClass = 'hidden';
        const length = ((ranges[1]-ranges[0])/ranges[2]) * frameRate;

        
      
        let Appearance = true;
        if ('Appearance' in options) {
            Appearance = options.Appearance;
        }



        switch(Appearance) {
            case false:
            case 'None':
                env.element.classList.add(...('sm-controls cursor-default rounded-md 0 py-1 px-2 text-left text-gray-500 flex flex-col'.split(' ')));
                env.element.innerHTML = `<div class="flex flex-col text-left">
    <div class="mx-1 my-1 rounded overflow-hidden p-0" id="${uid}-screen"></div>
    <div class="text-xs flex-row flex items-center"> <button id="${uid}-stop" class="px-1 ${stopClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 256 256"> <path d="M48.227 65.473c0-9.183 7.096-16.997 16.762-17.51 9.666-.513 116.887-.487 125.094-.487 8.207 0 17.917 9.212 17.917 17.71 0 8.499.98 117.936.49 126.609-.49 8.673-9.635 15.995-17.011 15.995-7.377 0-117.127-.327-126.341-.327-9.214 0-17.472-7.793-17.192-16.1.28-8.306.28-116.708.28-125.89zm15.951 4.684c-.153 3.953 0 112.665 0 116.19 0 3.524 3.115 5.959 7.236 6.156 4.12.198 112.165.288 114.852 0 2.686-.287 5.811-2.073 5.932-5.456.12-3.383-.609-113.865-.609-116.89 0-3.025-3.358-5.84-6.02-5.924-2.662-.085-110.503 0-114.155 0-3.652 0-7.083 1.972-7.236 5.924z" fill-rule="evenodd"/>
</svg></button>
<button id="${uid}-play" class="px-1 ${playClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 24 24"><path d="M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><div id="${uid}-bar" style="width:10rem" class="h-2 ring ring-1 ring-gray-400"><div style="width:0%" class="h-2 bg-sys"></div></div>
        </div>
        <div class="hidden px-1 mt-1 flex flex-row text-gray-400 text-xs"><div id="${uid}-jit" class="rounded-lg w-2 h-2" style="background: #85e085"></div></div>
</div>`;
            break; 
            case 'UILess':
                env.element.classList.add(...('sm-controls cursor-default rounded-md 0 py-1 px-2 text-left text-gray-500 flex flex-col'.split(' ')));
                env.element.innerHTML = `<div class="flex flex-col text-left">
    <div class="mx-1 my-1 rounded overflow-hidden p-0" id="${uid}-screen"></div>
    <div class="hidden text-xs flex-row flex items-center"> <button id="${uid}-stop" class="px-1 ${stopClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 256 256"> <path d="M48.227 65.473c0-9.183 7.096-16.997 16.762-17.51 9.666-.513 116.887-.487 125.094-.487 8.207 0 17.917 9.212 17.917 17.71 0 8.499.98 117.936.49 126.609-.49 8.673-9.635 15.995-17.011 15.995-7.377 0-117.127-.327-126.341-.327-9.214 0-17.472-7.793-17.192-16.1.28-8.306.28-116.708.28-125.89zm15.951 4.684c-.153 3.953 0 112.665 0 116.19 0 3.524 3.115 5.959 7.236 6.156 4.12.198 112.165.288 114.852 0 2.686-.287 5.811-2.073 5.932-5.456.12-3.383-.609-113.865-.609-116.89 0-3.025-3.358-5.84-6.02-5.924-2.662-.085-110.503 0-114.155 0-3.652 0-7.083 1.972-7.236 5.924z" fill-rule="evenodd"/>
</svg></button>
<button id="${uid}-play" class="px-1 ${playClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 24 24"><path d="M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><div id="${uid}-bar" style="width:10rem" class="h-2 ring ring-1 ring-gray-400"><div style="width:0%" class="h-2 bg-sys"></div></div>
        </div>
        <div class="hidden px-1 mt-1 flex flex-row text-gray-400 text-xs"><div id="${uid}-jit" class="rounded-lg w-2 h-2" style="background: #85e085"></div></div>
</div>`;
            break;
            default:
                env.element.classList.add(...('sm-controls cursor-default rounded-md 0 py-1 px-2 text-left text-gray-500 wljs-card flex flex-col'.split(' ')));
                env.element.innerHTML = `<div class="flex flex-col text-left">
    <div class="mx-1 my-1 rounded overflow-hidden p-0" id="${uid}-screen"></div>
    <div class="text-xs flex-row flex items-center"> <button id="${uid}-stop" class="px-1 ${stopClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 256 256"> <path d="M48.227 65.473c0-9.183 7.096-16.997 16.762-17.51 9.666-.513 116.887-.487 125.094-.487 8.207 0 17.917 9.212 17.917 17.71 0 8.499.98 117.936.49 126.609-.49 8.673-9.635 15.995-17.011 15.995-7.377 0-117.127-.327-126.341-.327-9.214 0-17.472-7.793-17.192-16.1.28-8.306.28-116.708.28-125.89zm15.951 4.684c-.153 3.953 0 112.665 0 116.19 0 3.524 3.115 5.959 7.236 6.156 4.12.198 112.165.288 114.852 0 2.686-.287 5.811-2.073 5.932-5.456.12-3.383-.609-113.865-.609-116.89 0-3.025-3.358-5.84-6.02-5.924-2.662-.085-110.503 0-114.155 0-3.652 0-7.083 1.972-7.236 5.924z" fill-rule="evenodd"/>
</svg></button>
<button id="${uid}-play" class="px-1 ${playClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 24 24"><path d="M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><div id="${uid}-bar" style="width:10rem" class="h-2 ring ring-1 ring-gray-400"><div style="width:0%" class="h-2 bg-sys"></div></div>
        </div>
        <div class="px-1 mt-1 flex flex-row text-gray-400 text-xs"><div class="ml-auto inline-flex items-center"><span>JIT </span><div id="${uid}-jit" class="rounded-lg w-2 h-2" style="background: #85e085"></div></div></div>
</div>`;                
        }

        const screen = document.getElementById(uid+'-screen');
        const playButton = document.getElementById(uid+'-play');
        const stopButton = document.getElementById(uid+'-stop');
        const bar = document.getElementById(uid+'-bar');
        const pbar = bar.firstChild;
        const jit = document.getElementById(uid+'-jit');

        env.local.jitIcon = jit;

        if (options.JITMessage && jit) {
            const jitContainer = jit.parentElement;
            jitContainer.title = options.JITMessage;
            jitContainer.style.cursor = 'help';
        }



        bar.addEventListener('click', (ev) => {
            const p = ev.offsetX/bar.clientWidth;
            currentValue = Math.max(Math.min(ranges[0] + Math.round(p*(ranges[1] - ranges[0]) / ranges[2]), ranges[1]), ranges[0]);
            pbar.style.width = Math.round(100 * p) + "%"; 
        });


        playButton.addEventListener('click',  () => {      
            runningQ = true;
            repetitions = 0;
            animate(false);
            playButton.classList.add('hidden');
            stopButton.classList.remove('hidden');
        });

        stopButton.addEventListener('click',  () => {    
            runningQ = false;
            playButton.classList.remove('hidden');
            stopButton.classList.add('hidden');
        });

        finished = () => {
            playButton.classList.remove('hidden');
            stopButton.classList.add('hidden');
        }

     
        timeMarker = (time) => {
            const p = (time - ranges[0])/(ranges[1] - ranges[0]);
            pbar.style.width = Math.round(100 * p) + "%"; 
        }

        await interpretate(args[0], {...env, element: screen});

    }

    env.local.event = event;
    let runningQ = false;
    let count = 0;
    let currentValue = ranges[0];

    function nextFrame() {
        server.kernel.io.fire(event, currentValue);
        currentValue += ranges[2];
        

        if (currentValue > ranges[1]) {
            currentValue = ranges[0];
            repetitions++;

            if (repetitions >= maxRepetitions && maxRepetitions > 0) {
                runningQ = false;
                return false;
            }

            return false;
        }

        timeMarker(currentValue);

        return true;
    }
    
    let animate;
    animate = () => {
        if (!runningQ) return;

        count++;
        if (count >= frameRate) {
            count = 0;
            if (!nextFrame() && !startQ) {
                runningQ = false;
                finished();

                return;
            }

            
        }

        
        env.local.uid = requestAnimationFrame(animate);
    }

    if (!startQ) {
        helper[event] = (state) => {
            if (state == 'Stop') {
                runningQ = false;
                repetitions = 0;
                currentValue = ranges[0];
                return;
            } else if (state == 'Pause') {
                runningQ = false;
                repetitions = 0;  
                return;
            }

            if (runningQ) return;
            runningQ = true;
            repetitions = 0;
            animate(false);
        }
    } else {
        runningQ = true;
        animate(true);
    }


    if (options.ViewChange) {
        env.local.viewChange = options.ViewChange;
        server.kernel.io.fire(options.ViewChange, true, 'Mounted');
    }
}

helper.update = (args, env) => {
    if (!env.local.jitTimer) {
        if (!env.local.jitIcon) return;
        env.local.jitIcon.style.background = "rgb(255 147 147)";
        env.local.jitTimer = setTimeout(() => {
            env.local.jitIcon.style.background = "#85e085";
            env.local.jitTimer = 0;
        }, 400);
    }
}

helper.destroy = (args, env) => {
    delete helper[env.local.event];
    cancelAnimationFrame(env.local.uid);
    if (env.local.viewChange) {
        server.kernel.io.fire(env.local.viewChange, true, 'Destroy');
    }    
    if (env.local.jitTimer) cancelTimeout(env.local.jitTimer);
}

helper.virtual = true;


core['CoffeeLiqueur`Extensions`Manipulate`Internal`AnimationHelper'] = helper;
core['CoffeeLiqueur`Extensions`Manipulate`Internal`AnimationHelperRun']  = async (args, env) => {
    const event = await interpretate(args[0], env);
    const state = await interpretate(args[1], env);
    if (helper[event]) helper[event](state);
}

const man = async (args, env) => {
    const opts = await core._getRules(args, env);

    const container = document.createElement('div');
  
    env.local.container = container;

    env.element.appendChild(container);

    if (env.element.classList.contains('frontend-view')) { //remove layout scroll in CM6 [FIXME]
        const old = env.element.style.display;
        env.element.style.display = "flex";
        env.local.restoreCSS = () => {
            env.element.style.display = old;
        }
    }

    const sliders = document.createElement('div');
    sliders.style.maxHeight = "20rem";
    sliders.style.overflowY = "auto";
    const view = document.createElement('div');    

    if (opts.ControlsLayout) {
        switch(opts.ControlsLayout) {
            case 'Vertical':
                container.classList.add('flex', 'flex-row', 'gap-x-2');
                container.appendChild(view);
                container.appendChild(sliders);
            break;

            default:
                container.classList.add('flex', 'flex-col', 'gap-y-2');
                
                container.appendChild(view);
                container.appendChild(sliders);
        }
    } else {
        container.classList.add('flex', 'flex-col', 'gap-y-2');
        container.appendChild(sliders);
        container.appendChild(view);
    }

    let Appearance = true;
    if ('Appearance' in opts) {
        Appearance = opts.Appearance;
    }



    switch(Appearance) {
        case false:
        case 'None':
            container.classList.add(...('cursor-default'.split(' ')));
        break;

        default:
            container.classList.add(...('sm-controls cursor-default rounded-md 0 py-1 px-2 text-left text-gray-500 wljs-card flex flex-col'.split(' ')));
            if (opts.JIT) {
                const info = document.createElement('div');
                info.className = "text-xs text-gray-400 mt-1 px-1 flex flex-row flex-wrap";
                info.innerHTML = ``;
                if (window.electronAPI && opts.OptionsButton) {
                    const optionsBtn = document.createElement('button');
                    optionsBtn.classList.add('m-0','mt-auto','mb-auto','p-0','mr-1','pb-1');
                    optionsBtn.title = "Properties"; 
                    optionsBtn.innerHTML = `<svg fill="currentColor" class="w-4 h-4" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
<path d="M6.12 20.75C5.36 20.75 4.64 20.45 4.09 19.91C2.97 18.79 2.97 16.98 4.09 15.86L9.6 10.35C9.1 8.40997 9.64 6.31997 11.06 4.89997C12.49 3.46997 14.59 2.90997 16.54 3.43997C16.8 3.50997 17 3.70997 17.07 3.96997C17.14 4.22997 17.07 4.49997 16.88 4.68997L14.43 7.13997L14.95 9.04997L16.86 9.56997L19.31 7.11997C19.5 6.92997 19.78 6.85997 20.03 6.92997C20.29 6.99997 20.49 7.19997 20.56 7.45997C21.09 9.40997 20.54 11.51 19.1 12.94C17.68 14.36 15.59 14.9 13.65 14.4L8.14 19.91C7.6 20.45 6.88 20.75 6.12 20.75ZM14.68 4.76997C13.72 4.84997 12.81 5.26997 12.11 5.96997C10.97 7.10997 10.6 8.77997 11.15 10.32C11.25 10.59 11.18 10.9 10.97 11.1L5.14 16.93C4.61 17.46 4.61 18.33 5.14 18.86C5.4 19.12 5.74 19.26 6.11 19.26C6.47 19.26 6.82 19.12 7.07 18.86L12.9 13.03C13.11 12.82 13.41 12.76 13.68 12.85C15.22 13.39 16.89 13.03 18.03 11.89C18.73 11.19 19.14 10.28 19.23 9.31997L17.6 10.95C17.41 11.14 17.13 11.21 16.87 11.14L14.13 10.39C13.87 10.32 13.67 10.12 13.6 9.85997L12.85 7.11997C12.78 6.85997 12.85 6.57997 13.04 6.38997L14.67 4.75997L14.68 4.76997Z" fill="currentColor"></path>
</svg>`;    
                    info.prepend(optionsBtn);
                    optionsBtn.addEventListener('click', async () => {
                        const res = await window.electronAPI.createMenu([
                            {label:'Copy expression', ref:'Expr'},
                            {label: 'Copy parameters', ref:'Values'},
                            {label: 'Refresh', ref:'Refresh'}
                        ]);
                        console.log(res);
                        if (res) server.kernel.io.fire(opts.OptionsButton, true, res);
                    });
                }
                container.appendChild(info);
                
                const jitContainer = document.createElement('div');
                    jitContainer.className = 'ml-auto inline-flex items-center';
                    jitContainer.innerHTML = `<span>JIT </span>`;
                    const icon = document.createElement('div');
                    icon.className = 'rounded-lg w-2 h-2';
                    icon.style.background = '#85e085';
                    env.local.jitIcon = icon;

                    if (opts.JITMessage) {
                      jitContainer.title = opts.JITMessage;
                      jitContainer.style.cursor = 'help';
                    }
            
                    jitContainer.appendChild(icon);
                    info.appendChild(jitContainer);
            
                
            }          
    }
    
      

    
    await interpretate(args[0], {...env, element:sliders});
    try {
        await interpretate(args[1], {...env, element:view});
    } catch(err) {
        view.innerHTML = `<h5 color="red">Widget is broken. Please reevaluate it</h5>`;
        return;
    }

    if (opts.ViewChange) {
        env.local.ViewChange = opts.ViewChange;
        server.kernel.io.fire(env.local.ViewChange, true, 'Mounted');
    }
}

man.update = (args, env) => {
    if (!env.local.jitTimer) {
        if (!env.local.jitIcon) return;
        env.local.jitIcon.style.background = "rgb(255 147 147)";
        env.local.jitTimer = setTimeout(() => {
            env.local.jitIcon.style.background = "#85e085";
            env.local.jitTimer = 0;
        }, 400);
    }
}

man.virtual = true;
man.destroy = (args, env) => {
    if (env.local.ViewChange) server.kernel.io.fire(env.local.ViewChange, true, 'Destroy');
    env.local.container.remove();
    if (env.local.restoreCSS) env.local.restoreCSS();
    if (env.local.jitTimer) cancelTimeout(env.local.jitTimer);
}

core['CoffeeLiqueur`Extensions`Manipulate`Internal`ManipulateHelper']

core['CoffeeLiqueur`Extensions`Manipulate`Internal`ManipulateHelper'] = man;

core['CoffeeLiqueur`Extensions`Manipulate`Internal`noJITEntry'] = async (args, env) => {
    return await interpretate(args[0], env);
}
core.RefreshRate = () => 'RefreshRate'
core['CoffeeLiqueur`Extensions`Manipulate`Internal`packedAnimation'] = async (args, env) => {
    return await interpretate(args[0], env);
}

core['CoffeeLiqueur`Extensions`Manipulate`Internal`RecorderView'] = async (args, env) => {
    await import('./recorder.js');
    return ' ';
}
