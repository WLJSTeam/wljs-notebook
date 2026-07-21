//Credits to samirkumardas
//https://github.com/samirkumardas/pcm-player
//https://github.com/everywill

const unlockAudioContext = (audioCtx) => {
    window.audioCtx = audioCtx;
    if (audioCtx.state !== "suspended") return
    const b = document.body;
    const events = ["touchstart", "touchend", "mousedown", "keydown"];
    events.forEach((e) => b.addEventListener(e, unlock, false));
    function unlock() {
        audioCtx.resume().then(clean);
    }
    function clean() {
        // audioCtx.suspend().then(() => {})
        events.forEach((e) => b.removeEventListener(e, unlock));
    }
};

const pcmFormats = {
    '8bitInt': {array: Int8Array, max: 128},
    '16bitInt': {array: Int16Array, max: 32768},
    '32bitInt': {array: Int32Array, max: 2147483648},
    '32bitFloat': {array: Float32Array, max: 1}
};

class FUPCMPlayer {
    constructor(option = {}) {
        this.option = {encoding: '16bitInt', channels: 1, sampleRate: 16000, ...option};
        const format = pcmFormats[this.option.encoding] || pcmFormats['16bitInt'];
        this.typedArray = format.array;
        this.maxValue = format.max;
        this.callback = this.option.callback;
        this.callbackTimeAhead = this.option.callbackTimeAhead;
        this.callbackOnEnd = this.option.callbackOnEnd;
        this.flush = this.flush.bind(this);
        this.playingBufferNode = null;
        this.scheduledBufferNode = null;
        this.createContext();
        this.resetState();
    }

    createContext() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.audioCtx.resume();
        unlockAudioContext(this.audioCtx);
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 1;
        this.gainNode.connect(this.audioCtx.destination);
        this.startTime = this.audioCtx.currentTime;
    }

    resetState() {
        this.playingStartTime = -1;
        this.lastGotTimestamp = 0;
        this.samples = new Float32Array();
        this.timeout = undefined;
        this.flag_request_stop = false;
        this.startTime = 0;
    }

    isTypedArray(data) {
        return Boolean(data?.byteLength && data.buffer && data.buffer.constructor === ArrayBuffer);
    }

    feed(data) {
        if (!this.isTypedArray(data)) return;
        const samples = this.getFormatedValue(data);
        const queued = new Float32Array(this.samples.length + samples.length);
        queued.set(this.samples);
        queued.set(samples, this.samples.length);
        this.samples = queued;
        if (this.timeout === undefined) this.flush();
    }

    getFormatedValue(data) {
        const source = new this.typedArray(data.buffer);
        const samples = new Float32Array(source.length);
        for (let i = 0; i < source.length; i++) samples[i] = source[i] / this.maxValue;
        return samples;
    }

    volume(volume) { this.gainNode.gain.value = volume; }

    destroy() {
        this.interrupt();
        this.samples = null;
        this.gainNode?.disconnect();
        this.audioCtx?.close();
        this.audioCtx = null;
    }

    getTimestamp(elapsedMs) {
        if (this.playingStartTime < 0) return 0;
        if (!elapsedMs) return this.audioCtx.currentTime - this.playingStartTime;
        const timestamp = this.lastGotTimestamp;
        this.lastGotTimestamp += elapsedMs / 1000;
        return timestamp;
    }

    setRequestStop() { this.flag_request_stop = true; }
    setOnEnd(callback) { this.onEnd = callback; }

    interrupt() {
        this.scheduledBufferNode?.stop(0);
        this.playingBufferNode?.stop(0);
        this.ensuredClearTimeout();
        this.resetState();
    }

    ensuredSetTimeout(fn, timeout, callback, callbackTimeout) {
        const start = performance.now();
        let callbackDone = false;
        const check = (timestamp) => {
            const elapsed = timestamp - start;
            if (callback && !callbackDone && elapsed >= callbackTimeout) {
                callbackDone = true;
                callback(timestamp);
            }
            if (elapsed >= timeout) {
                this.timeout = undefined;
                fn();
            } else this.timeout = requestAnimationFrame(check);
        };
        this.timeout = requestAnimationFrame(check);
    }

    ensuredClearTimeout() {
        if (this.timeout !== undefined) cancelAnimationFrame(this.timeout);
        this.timeout = undefined;
    }

    flush() {
        if (!this.samples) return;
        if (!this.samples.length) return this.callbackOnEnd?.(false);

        const {audioCtx, option} = this;
        const length = this.samples.length / option.channels;
        const audioBuffer = audioCtx.createBuffer(option.channels, length, option.sampleRate);
        for (let channel = 0; channel < option.channels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            for (let i = channel, sample = 0; sample < length; sample++, i += option.channels) data[sample] = this.samples[i];
        }
        this.startTime = Math.max(this.startTime, audioCtx.currentTime);
        this.samples = new Float32Array();

        const bufferSource = audioCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.gainNode);
        bufferSource.start(this.startTime);
        this.playingBufferNode = this.scheduledBufferNode;
        this.scheduledBufferNode = bufferSource;
        if (this.playingStartTime < 0) this.playingStartTime = this.startTime;
        this.startTime += audioBuffer.duration;

        if (this.flag_request_stop) {
            this.flag_request_stop = false;
            bufferSource.onended = () => {
                this.resetState();
                this.onEnd?.();
            };
            return;
        }
        const gap = (this.startTime - audioCtx.currentTime) * 1000;
        this.ensuredSetTimeout(this.flush, Math.max(5, gap - 70), this.callback, Math.max(2, gap - this.callbackTimeAhead - 70));
    }
}

const rates = {
    SignedInteger16: {type: '16bitInt', format: pcmFormats['16bitInt'].array},
    SignedInteger8: {type: '8bitInt', format: pcmFormats['8bitInt'].array},
    Real32: {type: '32bitFloat', format: pcmFormats['32bitFloat'].array},
    SignedInteger32: {type: '32bitInt', format: pcmFormats['32bitInt'].array}
};

core.SampleRate = () => "SampleRate";

const fast = {};
fast.List = (args, env) => {
  return args.map((a) => interpretate(a, env))
};

fast.List.update = fast.List;

core.PCMPlayer = async (args, env) => {
  let initial;


  const opts = await core._getRules(args, env);
  let enc;

  //console.warn(args);
  //console.warn(args.length - Object.keys(opts).length);

  if (args.length - Object.keys(opts).length > 2) {
    console.warn('Using stored offline');
    interpretate(args[0], {...env});
    initial = await interpretate(args[1], {...env, context:fast});
    enc = await interpretate(args[2], env);
  } else {
    initial = await interpretate(args[0], {...env});
    enc = await interpretate(args[1], env);
  }

  //console.warn(initial);

  if (!('AutoPlay' in opts)) opts.AutoPlay = true;
  if (!('GUI' in opts)) opts.GUI = true;
  if (!('SampleRate' in opts)) opts.SampleRate = 44100;

  if (!env.element) opts.GUI = false;

  let encoding = rates[enc];


  if (opts.FlushingTime) opts.FlushingTime = opts.FlushingTime / 1000.0;

  let call;

  if (opts.Event) {
    call = (time) => {
        server.kernel.emitt(opts.Event, time, 'More');
    };
  }

  env.local.state = () => {};
  let callbackOnEnd;

  if (opts.AutoRemove) {
    callbackOnEnd = () => {
        console.warn('Autoremove!');
        env.root.dispose();
    };
  } else {
    callbackOnEnd = () => {
        env.local.state(false);
    };
  }
  
  var player = new FUPCMPlayer({
    encoding: encoding.type,
    channels: 1,
    sampleRate: opts.SampleRate || 44100,
    callback: call,
    callbackOnEnd: (time) => callbackOnEnd(time),
    callbackTimeAhead: opts.TimeAhead || 200
 });


 env.local.encoding = encoding.format;
 env.local.player = player;

  //.feed(pcm_data);
  let willPlay = false;

  if (!env.noAutoplay && opts.AutoPlay) { 
    willPlay = true;
    if (initial.length > 1) {
        player.feed(new encoding.format(initial));
    } else {
        if (initial instanceof NumericArrayObject) {
            player.feed(initial.buffer);
        } else {
            if (opts.Event) call(0);
        }
    }
  }



  if (opts.NoGUI) return; 
  if (!opts.GUI) return; 
  env.element.classList.add(...('sm-controls cursor-pointer py-1 px-2 bg-gray-50 text-left text-gray-500 wljs-card text-xs flex flex-col'.split(' ')));
  env.element.style.verticalAlign = "middle";

  if ((initial.length || initial instanceof NumericArrayObject) && !opts.DataOnKernel) {
    //normal mode with GUI controls and an initial buffer

    const uid = uuidv4();
    const length = opts.FullLength || initial.length || initial.buffer.length;

    env.local.duration = length/(opts.SampleRate );

    let playClass = 'hidden', stopClass = '';
    if (!willPlay) {
        stopClass = 'hidden';
        playClass = '';
    }

    let additionalInfo = "";

    env.element.innerHTML = `
    <div class="flex-row flex items-center"><svg class="w-4 h-4 text-gray-500 inline-block mt-auto mb-auto" viewBox="0 0 24 24" fill="none">
<path class="group-hover:opacity-0" d="M3 11V13M6 10V14M9 11V13M12 9
V15M15 6V18M18 10V14M21 11V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3 11V13M6 8V16M9 10V14M12 7V17M15 4V20M18 9V15M21 11V13" class="opacity-0 group-hover:opacity-100" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg> <button id="${uid}-stop" class="px-1 ${stopClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 256 256"> <path d="M48.227 65.473c0-9.183 7.096-16.997 16.762-17.51 9.666-.513 116.887-.487 125.094-.487 8.207 0 17.917 9.212 17.917 17.71 0 8.499.98 117.936.49 126.609-.49 8.673-9.635 15.995-17.011 15.995-7.377 0-117.127-.327-126.341-.327-9.214 0-17.472-7.793-17.192-16.1.28-8.306.28-116.708.28-125.89zm15.951 4.684c-.153 3.953 0 112.665 0 116.19 0 3.524 3.115 5.959 7.236 6.156 4.12.198 112.165.288 114.852 0 2.686-.287 5.811-2.073 5.932-5.456.12-3.383-.609-113.865-.609-116.89 0-3.025-3.358-5.84-6.02-5.924-2.662-.085-110.503 0-114.155 0-3.652 0-7.083 1.972-7.236 5.924z" fill-rule="evenodd"/>
</svg></button>
<button id="${uid}-play" class="px-1 ${playClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 24 24"><path d="M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><div id="${uid}-bar" class="h-2 w-6 ring ring-1 ring-gray-400"><div style="width:0%" class="h-2 bg-sys"></div></div><span id="${uid}-text" class="leading-normal pl-1">${(length/(opts.SampleRate )).toFixed(2)} sec</span></div><div class="text-xs text-gray-400">${additionalInfo}</div>`;

    const playButton = document.getElementById(uid+'-play');
    const stopButton = document.getElementById(uid+'-stop');
    const bar = document.getElementById(uid+'-bar');
    const pbar = bar.firstChild;


    let realBuffer;
    if (initial instanceof NumericArrayObject) {
            realBuffer = initial.buffer;
        } else {
            realBuffer = new encoding.format(initial);
    }
 

    env.local.prevState = false;

    playButton.addEventListener('click', () => {        
        env.local.state(true);
    });

    stopButton.addEventListener('click', () => {
        env.local.state(false);        
    });

    const text = document.getElementById(uid + '-text');

    env.local.state = (state = false) => {
        if (env.local.prevState == state) return;

        if (state) {
            text.innerText = 'Playing';
            env.local.state.timer = setInterval(() => {
                const time = player.getTimestamp();
                if (time >= env.local.duration) {
                    pbar.style.width = "100%";
                    return;
                }
                pbar.style.width = Math.round(100 * time / env.local.duration) + "%";        
            }, 50);
            playButton.classList.add('hidden');
            stopButton.classList.remove('hidden');

            player.feed(realBuffer);

        } else {
            text.innerText = 'Stopped';
            if (env.local.state.timer) clearInterval(env.local.state.timer);
            env.local.state.timer = false;
            const time = player.getTimestamp();
            if (time >= env.local.duration) {
                pbar.style.width = "100%";
            }
            stopButton.classList.add('hidden');
            player.interrupt();
            playButton.classList.remove('hidden');   
        }

        env.local.prevState = state;
    };    

  } else if (opts.FullLength && opts.DataOnKernel) {

    const uid = uuidv4();
    const length = opts.FullLength || initial.length || initial.buffer.length;

    env.local.duration = length/(opts.SampleRate );

    let playClass = 'hidden', stopClass = '';
    if (!willPlay) {
        stopClass = 'hidden';
        playClass = '';
    }

    let additionalInfo = "";
    if (opts.DataOnKernel) {
        additionalInfo = "Data is on Kernel";
    }

    env.element.innerHTML = `
    <div class="flex-row flex items-center"><svg class="w-4 h-4 text-gray-500 inline-block mt-auto mb-auto" viewBox="0 0 24 24" fill="none">
<path class="group-hover:opacity-0" d="M3 11V13M6 10V14M9 11V13M12 9
V15M15 6V18M18 10V14M21 11V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M3 11V13M6 8V16M9 10V14M12 7V17M15 4V20M18 9V15M21 11V13" class="opacity-0 group-hover:opacity-100" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg> <button id="${uid}-stop" class="px-1 ${stopClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 256 256"> <path d="M48.227 65.473c0-9.183 7.096-16.997 16.762-17.51 9.666-.513 116.887-.487 125.094-.487 8.207 0 17.917 9.212 17.917 17.71 0 8.499.98 117.936.49 126.609-.49 8.673-9.635 15.995-17.011 15.995-7.377 0-117.127-.327-126.341-.327-9.214 0-17.472-7.793-17.192-16.1.28-8.306.28-116.708.28-125.89zm15.951 4.684c-.153 3.953 0 112.665 0 116.19 0 3.524 3.115 5.959 7.236 6.156 4.12.198 112.165.288 114.852 0 2.686-.287 5.811-2.073 5.932-5.456.12-3.383-.609-113.865-.609-116.89 0-3.025-3.358-5.84-6.02-5.924-2.662-.085-110.503 0-114.155 0-3.652 0-7.083 1.972-7.236 5.924z" fill-rule="evenodd"/>
</svg></button>
<button id="${uid}-play" class="px-1 ${playClass}"><svg fill="currentColor" class="w-3 h-3" viewBox="0 0 24 24"><path d="M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><div id="${uid}-bar" class="h-2 w-6 ring ring-1 ring-gray-400"><div style="width:0%" class="h-2 bg-sys"></div></div><span id="${uid}-text" class="leading-normal pl-1">${(length/(opts.SampleRate )).toFixed(2)} sec</span></div><div class="text-xs text-gray-400">${additionalInfo}</div>`;

    const playButton = document.getElementById(uid+'-play');
    const stopButton = document.getElementById(uid+'-stop');
    const bar = document.getElementById(uid+'-bar');
    const pbar = bar.firstChild;

    server.kernel.io.fire(opts.Event, 0.0, 'Set');
 
    bar.addEventListener('click', (ev) => {
        const p = ev.offsetX/bar.clientWidth;
        if (!opts.Event) return;
        server.kernel.io.fire(opts.Event, p, 'Set');
        env.local.timeOffset = p * env.local.duration;
        pbar.style.width = Math.round(100 * p) + "%"; 
    });

    env.local.prevState = false;

    playButton.addEventListener('click', () => {        
        env.local.state(true);
    });

    stopButton.addEventListener('click', () => {
        env.local.state(false);        
    });

    const text = document.getElementById(uid + '-text');

    env.local.timeOffset = 0;

    function recalcTime() {
        env.local.timeOffset += 30/1000.0;  
        
        if (env.local.timeOffset >= env.local.duration) {
            env.local.state(false);
            env.local.timeOffset = 0;       
            server.kernel.io.fire(opts.Event, true, 'Pause'); 
            server.kernel.io.fire(opts.Event, 0.0, 'Set'); 
        }
    }

    


    callbackOnEnd = () => {
        if (!env.local.prevState) return;   
             
    };
    
    env.local.state = (state = false) => {
        if (env.local.prevState == state) return;

        if (state) {
            text.innerText = 'Playing';
            env.local.state.timer = setInterval(() => {
                const time = env.local.timeOffset;
                if (time >= env.local.duration) return;
                pbar.style.width = Math.round(100 * time / env.local.duration) + "%";        
            }, 50);
            playButton.classList.add('hidden');
            stopButton.classList.remove('hidden');

            if (opts.Event) server.kernel.io.fire(opts.Event, true, 'Resume');
            env.local.ticker = setInterval(recalcTime, 30);

        } else {
            text.innerText = 'Paused';
            if (env.local.state.timer) clearInterval(env.local.state.timer);
            env.local.state.timer = false;
            stopButton.classList.add('hidden');

            if (opts.Event) {
                server.kernel.io.fire(opts.Event, true, 'Pause');
            }  
            playButton.classList.remove('hidden');  
            if (env.local.ticker) clearInterval(env.local.ticker);
            env.local.ticker = false;
        }

        env.local.prevState = state;
    };  

  } else {
    const uid = uuidv4();
    env.element.innerHTML = `<div class="flex flex-row">
    <svg class="w-4 h-4 text-gray-500 inline-block mt-auto mb-auto" viewBox="0 0 24 24" fill="none">
<path id="${uid}-ico" d="M3 11V13M6 8V16M9 10V14M12 7V17M15 4V20M18 9V15M21 11V13" class="text-red-400" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg> <span class="leading-normal pl-1" id="${uid}-text">No buffer</span></div>`;
    
    const ico = document.getElementById(uid + '-ico');
    const text = document.getElementById(uid + '-text');
    
    env.local.state = (state = false) => {
        if (env.local.prevState == state) return;

        if (state) {
            ico.classList.remove('text-red-400');
            ico.classList.add('text-green-400');
            text.innerText = 'Playing';
        } else {
            ico.classList.add('text-red-400');
            ico.classList.remove('text-green-400');
            text.innerText = 'No buffer';
        }

        env.local.prevState = state;
    };
  }

};



core.PCMPlayer.update = async (args, env) => {
  if (env.local.deadPlayer) return;
  const data = await interpretate(args[0], {...env, context: fast});
  env.local.state(true);
  if (data instanceof NumericArrayObject) {
    env.local.player.feed(data.buffer);
  } else {
    env.local.player.feed(new env.local.encoding(data));
  }
  
};

core.PCMPlayer.destroy = (args, env) => {
  env.local.deadPlayer = true;
  env.local.player.destroy();
  if (env.local.state.timer) clearInterval(env.local.state.timer);
};

core.PCMPlayer.virtual = true;

core['CoffeeLiqueur`Extensions`Sound`PCMPlayer'] = core.PCMPlayer;

const sound = {
    name: 'Sound'
};

//like Graphics it has primitives

interpretate.contextExpand(sound);

const isCharDigit = n => n < 10;

const halftonescale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = note => halftonescale[Math.abs(note % halftonescale.length)] + String(3 + Math.floor(note / 12.0));
const noteText = note => { try { return String(note) } catch { return '?'; } };
const notePreview = note => Array.isArray(note) ? note.map(notePreview).join('+') : typeof note == 'number' ? noteName(note) : noteText(note);
const flattenNotes = notes => Array.isArray(notes) ? notes.flatMap(flattenNotes) : [notes];
const midiNote = note => halftonescale[((note % 12) + 12) % 12] + (Math.floor(note / 12) - 1);
const voiceColors = ['#4f46e5', '#0d9488', '#d97706', '#db2777'];
const notePitch = note => {
    if (typeof note == 'number') return note;
    const match = noteText(note).match(/^([A-G])([#b]?)(-?\d+)?$/i);
    if (!match) return null;
    return 12 * ((match[3] || 4) - 3) + ({C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[match[1].toUpperCase()]) + (match[2] == '#' ? 1 : match[2] == 'b' ? -1 : 0);
};
const pianoRoll = (sounds) => {
    const pitches = sounds.map(({notes}) => flattenNotes(notes).map(notePitch).filter((note) => note !== null));
    const all = pitches.flat();
    if (!all.length) return;
    let low = all[0], high = low;
    for (const pitch of all) { low = Math.min(low, pitch); high = Math.max(high, pitch); }
    const position = sounds.map((sound, i) => sound.at === undefined ? i * 8 : sound.at * 16);
    let width = 24;
    for (let i = 0; i < sounds.length; i++) width = Math.max(width, position[i] + (typeof sounds[i].duration == 'number' ? sounds[i].duration * 16 : 8));
    const height = 32;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${Math.ceil(width)} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.width = `${Math.ceil(width)}px`;
    svg.style.maxWidth = 'none';
    for (let i = 0; i < pitches.length; i++) {
        const group = document.createElementNS(svg.namespaceURI, 'g');
        const title = document.createElementNS(svg.namespaceURI, 'title');
        title.textContent = notePreview(sounds[i].notes);
        group.append(title);
        for (const pitch of pitches[i]) {
            const note = document.createElementNS(svg.namespaceURI, 'rect');
            note.setAttribute('x', position[i] + 1);
            note.setAttribute('y', high == low ? 14 : 2 + (high - pitch) * 26 / (high - low));
            note.setAttribute('width', typeof sounds[i].duration == 'number' ? Math.max(3, sounds[i].duration * 16 - 2) : 6);
            note.setAttribute('height', 3);
            note.setAttribute('rx', 1);
            note.setAttribute('fill', sounds[i].voice === undefined ? 'currentColor' : voiceColors[sounds[i].voice % voiceColors.length]);
            group.append(note);
        }
        svg.append(group);
    }
    return svg;
};
const soundDetails = (pool, info) => {
    const events = pool.filter((sound) => 'notes' in sound || sound.rest);
    let duration = 0;
    for (const sound of pool) {
        if (typeof sound.duration == 'number') duration = Math.max(duration, (sound.at || 0) + sound.duration);
        else if (sound.data) duration = Math.max(duration, sound.data.length / sound.rate);
    }
    const details = [];
    if (info.tempo) details.push(`${info.tempo} BPM`);
    const instruments = [...new Set(pool.map((sound) => sound.instrument).filter(Boolean).map(noteText))];
    if (instruments.length) details.push(instruments.join(', '));
    else if (info.instrument) details.push(noteText(info.instrument));
    if (events.length) details.push(`${events.length} event${events.length == 1 ? '' : 's'}`);
    if (duration) details.push(`${duration.toFixed(2)} sec`);
    return details.join(' · ');
};
const inferVoices = (pool) => {
    const notes = pool.filter((sound) => 'notes' in sound);
    if (notes.some((sound) => sound.voice !== undefined) || notes.some((sound) => sound.at === undefined || typeof sound.duration != 'number')) return;
    const lanes = [], assigned = [];
    for (const sound of [...notes].sort((a, b) => a.at - b.at)) {
        let voice = lanes.findIndex((end) => end <= sound.at + 1e-6);
        if (voice < 0) voice = lanes.length;
        lanes[voice] = sound.at + sound.duration;
        assigned.push([sound, voice]);
    }
    if (lanes.length > 1) for (const [sound, voice] of assigned) sound.voice = voice;
};
const pianoView = (pitches, rawNotes, sequenceQ=false) => {
    const active = new Set(flattenNotes(pitches).map(musicPitch).map(notePitch).filter((pitch) => pitch !== null).map((pitch) => (pitch % 12 + 12) % 12));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.addEventListener('click', () => {
      if (sequenceQ) {
        const list = rawNotes.slice(1).map(el => ["MusicNote",["Association",["Rule","'Pitch'",el],["Rule","'Duration'",["MusicDuration",["Association",["Rule","'BeatDuration'",["Times",1,["Power",4,-1]]],["Rule","'Beats'",1]]]]]]);
        
        interpretate(['Sound', ["MusicScore",["Association",["Rule","'VoiceList'",["List",["MusicVoice",["Association",["Rule","'MeasureList'",["List",["MusicMeasure",["Association",["Rule","'NoteList'",["List",...list]],["Rule","'TimeSignature'",["MusicTimeSignature",["Association",["Rule","'Numerator'",4],["Rule","'Denominator'",4],["Rule","'BeatLength'",1]]]]]]]],["Rule","'TimeSignature'",["MusicTimeSignature",["Association",["Rule","'Numerator'",4],["Rule","'Denominator'",4],["Rule","'BeatLength'",1]]]]]]]],["Rule","'TimeSignature'",["MusicTimeSignature",["Association",["Rule","'Numerator'",4],["Rule","'Denominator'",4],["Rule","'BeatLength'",1]]]]]]], {});
        return;
      }      interpretate(['Sound', ["MusicScore",["Association",["Rule","'VoiceList'",["List",["MusicVoice",["Association",["Rule","'MeasureList'",["List",["MusicMeasure",["Association",["Rule","'NoteList'",["List",["MusicChord",["Association",["Rule","'PitchList'",rawNotes],["Rule","'Duration'",["MusicDuration",["Association",["Rule","'BeatDuration'",["Times",1,["Power",4,-1]]],["Rule","'Beats'",1]]]]]]]],["Rule","'TimeSignature'",["MusicTimeSignature",["Association",["Rule","'Numerator'",4],["Rule","'Denominator'",4],["Rule","'BeatLength'",1]]]]]]]],["Rule","'TimeSignature'",["MusicTimeSignature",["Association",["Rule","'Numerator'",4],["Rule","'Denominator'",4],["Rule","'BeatLength'",1]]]]]]]],["Rule","'TimeSignature'",["MusicTimeSignature",["Association",["Rule","'Numerator'",4],["Rule","'Denominator'",4],["Rule","'BeatLength'",1]]]]]]], {});
    });
    svg.setAttribute('viewBox', '0 0 56 24');
    svg.setAttribute('width', '56');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-label', 'Piano keys');
    for (const [i, pitch] of [0, 2, 4, 5, 7, 9, 11].entries()) {
        const key = document.createElementNS(svg.namespaceURI, 'rect');
        key.setAttribute('x', i * 8); key.setAttribute('width', '8'); key.setAttribute('height', '24');
        key.setAttribute('fill', active.has(pitch) ? '#c7d2fe' : 'white');
        key.setAttribute('stroke', 'currentColor'); key.setAttribute('stroke-width', '.5');
        svg.append(key);
    }
    for (const [x, pitch] of [[5.5, 1], [13.5, 3], [29.5, 6], [37.5, 8], [45.5, 10]]) {
        const key = document.createElementNS(svg.namespaceURI, 'rect');
        key.setAttribute('x', x); key.setAttribute('width', '5'); key.setAttribute('height', '14'); key.setAttribute('rx', '1');
        key.setAttribute('fill', active.has(pitch) ? '#4f46e5' : '#374151');
        svg.append(key);
    }
    return svg;
};

const playSoundNote = (notes, duration, env) => {
    const makeNote = (raw) => {
        let note = raw;
        
        if (typeof note == 'string') {
            if (!isCharDigit(note.charAt(note.length - 1))) note = note + '4';
        } else if (typeof note == 'number') {
            
            //console.log((note) % halftonescale.length);
            console.log(note);
            console.log(note);
            note = noteName(note);
            console.log();
            
            
        } else {
            console.warn(note);
            //note = Note.transpose('C4', [note, 0]);
            throw 'Not supported!';
        }
        if (Array.isArray(duration)) {
            env.synth.triggerAttackRelease(note, duration[1]-duration[0], duration[0]);
            console.log(duration[1]-duration[0]);
        } else {
            env.synth.triggerAttackRelease(note, duration, env.now);
        }
        
    };

    if (Array.isArray(notes)) {
        notes.map(makeNote);
    } else {
        makeNote(notes);
    }

    env.now += 0.5;
};

const musicDuration = (duration) => {
    if (typeof duration == 'number') return duration;
    if (typeof duration == 'string') return ({whole: 1, half: .5, quarter: .25, eighth: .125, sixteenth: .0625})[duration.toLowerCase()] || .25;
    if (!duration || typeof duration != 'object') return .25;
    return duration.RealDuration || duration.Duration || (duration.Beats || 1) * (duration.BeatDuration || .25);
};
const musicProperties = async (args, env, names) => {
    const first = await interpretate(args[0], env);
    if (first && typeof first == 'object' && !Array.isArray(first)) return first;
    return Object.fromEntries(await Promise.all(names.map(async (name, i) => [name, i && args[i] !== undefined ? await interpretate(args[i], env) : i ? undefined : first])));
};
const musicPitch = (pitch) => {
    if (typeof pitch == 'number') return midiNote(pitch);
    if (typeof pitch == 'string') return /\d$/.test(pitch) ? pitch : pitch + '4';
    if (!pitch || typeof pitch != 'object') return pitch;
    if (typeof pitch.MIDINumber == 'number') return midiNote(pitch.MIDINumber);
    if (pitch.NameWithOctave) return pitch.NameWithOctave;
    const key = pitch.Key || pitch.Name;
    if (!key) return noteText(pitch);
    const accidental = pitch.Accidental || 0;
    return key + (accidental > 0 ? '#'.repeat(accidental) : 'b'.repeat(-accidental)) + (pitch.Octave === undefined ? 4 : pitch.Octave);
};
const musicSeconds = (duration, tempo) => musicDuration(duration) * 240 / (tempo || 120);
const scheduleMusic = (events, tempo) => {
    let at = 0;
    return events.map((event) => {
        const duration = musicSeconds(event.duration, event.tempo || tempo);
        const scheduled = {...event, at, duration};
        at += duration;
        return scheduled;
    });
};
const queueMusic = (events, tempo, env) => {
    const scheduled = scheduleMusic(events, tempo);
    if (env.soundPool) return env.soundPool.push(...scheduled);
    for (const event of scheduled) if (!event.rest) playSoundNote(event.notes, event.duration, {...env, now: (env.now || 0) + event.at});
};
const musicChordNotes = async (properties) => {
    if (properties.PitchList) return properties.PitchList.map(musicPitch);
    const root = musicPitch(properties.Root);
    if (!properties.Name || !root) return root ? [root] : [];
    if (!Tonal) Tonal = await import('./index-b2828a14.js');
    const octave = root.match(/-?\d+$/)?.[0] || '4';
    const notes = Tonal.Chord.get(root.replace(/-?\d+$/, '') + noteText(properties.Name).toLowerCase()).notes;
    return notes.length ? notes.map((note) => note + octave) : [root];
};

for (const property of ['MusicPitch', 'MusicDuration', 'MusicInterval', 'MusicKeySignature', 'MusicTimeSignature', 'MusicScale']) {
    sound[property] = async (args, env) => interpretate(args[0], env);
}
sound.MusicTempo = () => 'MusicTempo';
sound['CoffeeLiqueur`Extensions`Sound`Internal`PianoViewBox'] = async (args, env) => {
    const pitches = await interpretate(args[0], {...env, context: sound});
    if (env.element) {
        env.element.classList.add(...'inline-block align-middle cursor-pointer'.split(' '));
        env.element.replaceChildren(pianoView(pitches, args[0], await interpretate(args[1], {})));
    }
    return pitches;
};

sound.MusicNote = async (args, env) => {
    const properties = await musicProperties(args, env, ['Pitch', 'Duration']);
    const event = {notes: musicPitch(properties.Pitch), duration: properties.Duration, instrument: properties.Instrument};
    if (env.music) return event;
    if (env.soundInfo) env.soundInfo.tempo = env.musicTempo || 120;
    return queueMusic([event], env.musicTempo || 120, env);
};
sound.MusicRest = async (args, env) => {
    const properties = await musicProperties(args, env, ['Duration']);
    const event = {rest: true, duration: properties.Duration};
    if (env.music) return event;
    if (env.soundInfo) env.soundInfo.tempo = env.musicTempo || 120;
    return queueMusic([event], env.musicTempo || 120, env);
};
sound.MusicChord = async (args, env) => {
    const properties = await musicProperties(args, env, ['PitchList', 'Duration']);
    const event = {notes: await musicChordNotes(properties), duration: properties.Duration, instrument: properties.Instrument};
    if (env.music) return event;
    if (env.soundInfo) env.soundInfo.tempo = env.musicTempo || 120;
    return queueMusic([event], env.musicTempo || 120, env);
};
sound.MusicMeasure = async (args, env) => {
    const source = await interpretate(args[0], {...env, music: true});
    const properties = source && typeof source == 'object' && !Array.isArray(source) ? source : {};
    const options = await core._getRules(args.slice(1), {...env, context: sound});
    const tempo = properties.MusicTempo || options.MusicTempo || env.musicTempo || 120;
    const events = (Array.isArray(source) ? source : properties.NoteList || []).map((event) => ({...event, instrument: event.instrument || properties.Instrument, tempo: properties.MusicTempo || options.MusicTempo}));
    if (env.music) return events;
    if (env.soundInfo) env.soundInfo.tempo = tempo;
    return queueMusic(events, tempo, env);
};
sound.MusicVoice = async (args, env) => {
    const source = await interpretate(args[0], {...env, music: true});
    const properties = source && typeof source == 'object' && !Array.isArray(source) ? source : {};
    const options = await core._getRules(args.slice(1), {...env, context: sound});
    const events = (Array.isArray(source) ? source : properties.MeasureList || []).flat().map((event) => ({...event, instrument: event.instrument || properties.Instrument}));
    const tempo = properties.MusicTempo || options.MusicTempo || env.musicTempo || 120;
    if (env.music) return {events, tempo};
    if (env.soundInfo) env.soundInfo.tempo = tempo;
    return queueMusic(events, tempo, env);
};
sound.MusicScore = async (args, env) => {
    const source = await interpretate(args[0], {...env, music: true});
    const properties = source && typeof source == 'object' && !Array.isArray(source) ? source : {};
    const options = await core._getRules(args.slice(1), {...env, context: sound});
    const voices = Array.isArray(source) ? source : properties.VoiceList || [];
    const tempo = properties.MusicTempo || options.MusicTempo || env.musicTempo || 120;
    const events = voices.flatMap((voice, i) => scheduleMusic(voice.events || voice, voice.tempo || tempo).map((event) => ({...event, instrument: event.instrument || voice.instrument || properties.Instrument, voice: i})));
    if (env.music) return {events, tempo};
    if (env.soundInfo) env.soundInfo.tempo = tempo;
    if (env.soundPool) return env.soundPool.push(...events);
    for (const event of events) if (!event.rest) playSoundNote(event.notes, event.duration, {...env, now: (env.now || 0) + event.at});
};

sound.SoundNote = async (args, env) => {
    let notes = await interpretate(args[0], env);
    if (NumericArrayObject.Q(notes)) notes = notes.normal();
    //console.warn(notes);

    let duration = (await interpretate(args[1], env));
    if (NumericArrayObject.Q(duration)) duration = duration.normal();
    if (!duration) duration = '4n';
    const instrument = args[2] === undefined ? undefined : await interpretate(args[2], env);
    if (instrument && env.soundInfo && !env.soundInfo.instrument) env.soundInfo.instrument = instrument;

    if (env.soundPool) {
        if (Array.isArray(duration)) return env.soundPool.push({notes, duration: duration[1] - duration[0], at: duration[0], instrument});
        return env.soundPool.push({notes, duration, instrument});
    }
    playSoundNote(notes, duration, env);
};
sound.SampledSoundFunction = async (args, env) => {};

let Tone, Tonal;

function isAudioBuffer (buffer) {
	//the guess is duck-typing
	return buffer != null
	&& typeof buffer.length === 'number'
	&& typeof buffer.sampleRate === 'number' //swims like AudioBuffer
	&& typeof buffer.getChannelData === 'function' //quacks like AudioBuffer
	// && buffer.copyToChannel
	// && buffer.copyFromChannel
	&& typeof buffer.duration === 'number'
}
let instrumentSynths, PianoVoice;
const pianoVoice = () => {
    if (PianoVoice) return PianoVoice;
    PianoVoice = class extends Tone.Synth {
        constructor (options) {
            super(options);
            this._secondString = new Tone.Synth({
                context: this.context, volume: -9, detune: 2.4,
                oscillator: {type: 'custom', partials: [1, .52, .3, .17, .09, .045]},
                envelope: {attack: .004, decay: 1.35, sustain: .018, release: 1.1}
            }).connect(this.output);
            this._hammer = new Tone.FMSynth({
                context: this.context, volume: -3,
                harmonicity: 2.01, modulationIndex: 3.2,
                oscillator: {type: 'sine'}, modulation: {type: 'sine'},
                envelope: {attack: .001, decay: .075, sustain: 0, release: .025},
                modulationEnvelope: {attack: .001, decay: .045, sustain: 0, release: .02}
            }).connect(this.output);
        }
        triggerAttack (note, time, velocity) {
            const level = velocity === undefined ? 1 : velocity;
            super.triggerAttack(note, time, level);
            this._secondString.triggerAttack(note, time, level * .7);
            this._hammer.triggerAttack(note, time, level * .45);
            return this;
        }
        triggerRelease (time) {
            super.triggerRelease(time);
            this._secondString.triggerRelease(time);
            this._hammer.triggerRelease(time);
            return this;
        }
        dispose () {
            this._secondString.dispose();
            this._hammer.dispose();
            return super.dispose();
        }
    };
    return PianoVoice;
};
const instrumentSpec = (instrument) => {
    // Instrument names come from SoundNote/Music framework styles. Tone synth
    // class names below remain available as WLJS-specific extensions.
    const name = noteText(instrument || 'Piano').replace(/[^a-z]/gi, '').toLowerCase();
    const spec = {
        amsynth: ['AMSynth'], fmsynth: ['FMSynth'], duosynth: ['DuoSynth'], membranesynth: ['MembraneSynth'], metalsynth: ['MetalSynth'],
        piano: [pianoVoice(), {
            oscillator: {type: 'custom', partials: [1, .68, .4, .24, .14, .08, .045, .025]},
            envelope: {attack: .003, decay: 1.65, sustain: .025, release: 1.35}
        }],
        guitar: ['MonoSynth', {
            oscillator: {type: 'custom', partials: [1, .48, .24, .12, .06]},
            filter: {type: 'lowpass', Q: 1.5, rolloff: -24},
            envelope: {attack: .002, decay: .38, sustain: .04, release: .55},
            filterEnvelope: {attack: .001, decay: .16, sustain: .08, release: .35, baseFrequency: 140, octaves: 4.5}
        }],
        violin: ['DuoSynth', {
            harmonicity: 1.002, vibratoAmount: .12, vibratoRate: 5.5,
            voice0: {
                oscillator: {type: 'sawtooth'}, filter: {type: 'lowpass', Q: 1, rolloff: -12},
                envelope: {attack: .09, decay: .12, sustain: .86, release: .45},
                filterEnvelope: {attack: .08, decay: .16, sustain: .72, release: .4, baseFrequency: 300, octaves: 3.5}
            },
            voice1: {
                oscillator: {type: 'triangle'}, filter: {type: 'lowpass', Q: 1, rolloff: -12},
                envelope: {attack: .11, decay: .14, sustain: .72, release: .5},
                filterEnvelope: {attack: .09, decay: .18, sustain: .65, release: .45, baseFrequency: 260, octaves: 3.2}
            }
        }],
        flute: ['AMSynth', {
            harmonicity: 2, oscillator: {type: 'sine'}, modulation: {type: 'sine'},
            envelope: {attack: .07, decay: .12, sustain: .82, release: .45},
            modulationEnvelope: {attack: .1, decay: .12, sustain: .18, release: .3}
        }],
        trumpet: ['MonoSynth', {
            oscillator: {type: 'sawtooth'}, filter: {type: 'lowpass', Q: 2, rolloff: -24},
            envelope: {attack: .025, decay: .1, sustain: .76, release: .32},
            filterEnvelope: {attack: .015, decay: .14, sustain: .62, release: .25, baseFrequency: 220, octaves: 4.2}
        }],
        organ: ['Synth', {
            oscillator: {type: 'custom', partials: [1, .72, .5, .34, .22, .14, .09, .05]},
            envelope: {attack: .015, decay: .08, sustain: .94, release: .28}
        }],
        marimba: ['FMSynth', {
            harmonicity: 4, modulationIndex: 6,
            oscillator: {type: 'sine'}, modulation: {type: 'sine'},
            envelope: {attack: .001, decay: .72, sustain: 0, release: .16},
            modulationEnvelope: {attack: .001, decay: .14, sustain: 0, release: .08}
        }],
        vibraphone: ['FMSynth', {
            harmonicity: 4, modulationIndex: 2.5,
            oscillator: {type: 'sine'}, modulation: {type: 'sine'},
            envelope: {attack: .003, decay: 2.8, sustain: .08, release: 1.8},
            modulationEnvelope: {attack: .002, decay: .9, sustain: .02, release: .7}
        }],
        drums: ['MembraneSynth', {
            pitchDecay: .035, octaves: 7, oscillator: {type: 'sine'},
            envelope: {attack: .001, decay: .34, sustain: .01, release: .65}
        }]
    }[name] || ['Synth'];
    return [name, typeof spec[0] === 'string' ? Tone[spec[0]] : spec[0], spec[1]];
};
const instrumentSynth = (instrument) => {
    const [name, voice, options] = instrumentSpec(instrument);
    if (!instrumentSynths) instrumentSynths = new Map();
    if (!instrumentSynths.has(name)) instrumentSynths.set(name, (options ? new Tone.PolySynth(voice, {options}) : new Tone.PolySynth(voice)).set({volume: -8}).toDestination());
    return instrumentSynths.get(name);
};

sound.Sound = async (args, env) => {  
    if (!Tone) Tone = (await import('./index-503cf143.js'));

    const soundPool = [];
    const options = await core._getRules(args, {...env, context: sound});
    const soundInfo = {};
    const musicTempo = options.MusicTempo || 120;
    if (options.MusicTempo) soundInfo.tempo = options.MusicTempo;
    const object = await interpretate(args[0], {
        ...env, context:sound, Tone: Tone, soundPool, soundInfo, musicTempo
    });
    if (isAudioBuffer(object)) soundPool.push({buffer: object});
    inferVoices(soundPool);
  
    if (env.element) {
        env.element.classList.add(...('sm-controls cursor-pointer py-1 px-2 bg-gray-50 text-left text-gray-500 wljs-card text-xs'.split(' ')));
          env.element.style.verticalAlign = "middle";
        env.element.innerHTML = `
         <svg class="w-4 h-4 text-gray-500 inline-block mt-auto mb-auto" viewBox="0 0 24 24" fill="none">
     <path class="group-hover:opacity-0" d="M3 11V13M6 10V14M9 11V13M12 9
  V15M15 6V18M18 10V14M21 11V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M3 11V13M6 8V16M9 10V14M12 7V17M15 4V20M18 9V15M21 11V13" class="opacity-0 group-hover:opacity-100" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     </svg>`;
        const notes = soundPool.filter((note) => 'notes' in note);
        if (notes.length) {
            const label = document.createElement('span');
            label.className = 'leading-normal pl-1 inline-block align-middle max-w-80 max-h-12 overflow-auto';
            const roll = pianoRoll(notes);
            if (roll) label.append(roll);
            else label.textContent = notes.map(({notes}) => notePreview(notes)).join(' · ');
            env.element.append(label);
        }
        const details = soundDetails(soundPool, soundInfo);
        if (details) {
            const metadata = document.createElement('div');
            metadata.className = 'pl-5 text-gray-400 leading-normal';
            metadata.textContent = details;
            env.element.append(metadata);
        }
    }
  
    //const targetRate = ctx.sampleRate;
    const play = async () => {
        console.log('Play!');

        if (env.element) await Tone.start();
        for (const synth of instrumentSynths?.values() || []) synth.releaseAll();

        //const synth = new Tone.PolySynth(Tone.Synth).toDestination();
        const now = Tone.now();
        env.now = now;

        for (const sound of soundPool) {
            if (sound.buffer || sound.data) {
                const player = new Tone.Player(sound.buffer || sampledBuffer(sound.data, sound.rate, Tone)).toDestination();
                player.fadeOut = 0.05;
                player.fadeIn = 0.01;
                player.start();
            } else if (!sound.rest) {
                if (sound.at !== undefined) {
                    playSoundNote(sound.notes, sound.duration, {...env, synth: instrumentSynth(sound.instrument), now: now + sound.at});
                    continue;
                }
                env.synth = instrumentSynth(sound.instrument);
                playSoundNote(sound.notes, sound.duration, env);
            }
        }
    };

    if (env.element)
        env.element.addEventListener('click', play);
    else 
        play();
        
  };
  
  
const sampledBuffer = (data, rate, Tone) => {
    //assume 32bit float
    let buffer;

    if (NumericArrayObject.Q(data)) {
      buffer  = Tone.context.createBuffer(1, data.buffer.length, rate);
      buffer.copyToChannel(new Float32Array(data.buffer), 0);      
    } else {
      buffer  = Tone.context.createBuffer(1, data.length, rate);
      buffer.copyToChannel(new Float32Array(data), 0);
    }
    //console.log(buffer.getChannelData(0)[110]);

    return buffer;
};

  sound.SampledSoundList = async (args, env) => {
    const data = await interpretate(args[0], env);
    const rate = await interpretate(args[1], env) | 8000;

    if (env.soundPool) env.soundPool.push({data, rate});
    else return sampledBuffer(data, rate, env.Tone);
};
