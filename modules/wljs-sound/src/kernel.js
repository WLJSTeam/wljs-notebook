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

function FUPCMPlayer(option) {
    this.init(option);
}

FUPCMPlayer.prototype.init = function(option) {
    var defaults = {
        encoding: '16bitInt',
        channels: 1,
        sampleRate: 16000,
    };
    this.option = Object.assign({}, defaults, option);
    this.callback = this.option.callback;
    this.callbackTimeAhead = this.option.callbackTimeAhead;
    this.callbackOnEnd = this.option.callbackOnEnd;

    this.flush = this.flush.bind(this);
    this.maxValue = this.getMaxValue();
    this.typedArray = this.getTypedArray();
    this.playingBufferNode = null;
    this.scheduledBufferNode = null;
    this.createContext();
    this.resetState();
};

FUPCMPlayer.prototype.getMaxValue = function () {
    var encodings = {
        '8bitInt': 128,
        '16bitInt': 32768,
        '32bitInt': 2147483648,
        '32bitFloat': 1
    };

    return encodings[this.option.encoding] ? encodings[this.option.encoding] : encodings['16bitInt'];
};

FUPCMPlayer.prototype.getTypedArray = function () {
    var typedArrays = {
        '8bitInt': Int8Array,
        '16bitInt': Int16Array,
        '32bitInt': Int32Array,
        '32bitFloat': Float32Array
    };

    return typedArrays[this.option.encoding] ? typedArrays[this.option.encoding] : typedArrays['16bitInt'];
};

FUPCMPlayer.prototype.createContext = function() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // context needs to be resumed on iOS and Safari (or it will stay in "suspended" state)
    this.audioCtx.resume();
    this.audioCtx.onstatechange = () => {if (this.audioCtx) {console.log('audioCtx.state',  this.audioCtx.state)}};   // if you want to see "Running" state in console and be happy about it
    unlockAudioContext(this.audioCtx);

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1;
    this.gainNode.connect(this.audioCtx.destination);
    this.startTime = this.audioCtx.currentTime;
};

FUPCMPlayer.prototype.resetState = function() {
    this.playingStartTime = -1;
    this.lastGotTimestamp = 0;
    this.samples = new Float32Array();
    this.timeout = undefined;
    this.flag_request_stop = false;
    this.startTime = 0;
};

FUPCMPlayer.prototype.isTypedArray = function(data) {
    return (data.byteLength && data.buffer && data.buffer.constructor == ArrayBuffer);
};

FUPCMPlayer.prototype.feed = function(data) {
    if (!this.isTypedArray(data)) return;
    data = this.getFormatedValue(data);
    var tmp = new Float32Array(this.samples.length + data.length);
    tmp.set(this.samples, 0);
    tmp.set(data, this.samples.length);
    this.samples = tmp;
    if(!this.timeout) {
        this.flush();
    }
};

FUPCMPlayer.prototype.getFormatedValue = function(data) {
    var data = new this.typedArray(data.buffer),
        float32 = new Float32Array(data.length),
        i;

    for (i = 0; i < data.length; i++) {
        float32[i] = data[i] / this.maxValue;
    }
    return float32;
};

FUPCMPlayer.prototype.volume = function(volume) {
    this.gainNode.gain.value = volume;
};

FUPCMPlayer.prototype.destroy = function() {
    if (this.interval) {
        clearInterval(this.interval);
    }
    this.samples = null;
    this.audioCtx.close();
    this.audioCtx = null;
};

FUPCMPlayer.prototype.getTimestamp = function(elapsedMs) {
    if(this.playingStartTime >= 0) {
        if(!elapsedMs) {
            return this.audioCtx.currentTime - this.playingStartTime;
        }
        const ret = this.lastGotTimestamp;
        this.lastGotTimestamp += elapsedMs / 1000;
        return ret;
    }
    return 0;
};

FUPCMPlayer.prototype.setRequestStop = function() {
    this.flag_request_stop = true;
};

FUPCMPlayer.prototype.setOnEnd = function(cb) {
    this.onEnd = cb;
};

FUPCMPlayer.prototype.interrupt = function(cb) {
    this.scheduledBufferNode && this.scheduledBufferNode.stop(0);
    this.playingBufferNode && this.playingBufferNode.stop(0);
    this.ensuredClearTimeout();
    this.resetState();
    this.flag_request_stop = false;
};

// (即时超过超时时间也)确保会触发
FUPCMPlayer.prototype.ensuredSetTimeout = (function() {
    let startTimestamp;
    return function(fn, timeout, fn2, timeout2) {


        startTimestamp = performance.now();
        let checker;
        
        if (fn2) {
            let done = false;

            checker = (timestamp) => {
                if(timestamp - startTimestamp >= timeout2 && !done) {
                    done = true;
                    fn2(timestamp);
                }

                if(timestamp - startTimestamp >= timeout) {
                    this.timeout = undefined;
                    fn();
                } else {
                    this.timeout = requestAnimationFrame(checker);
                }
            };
        } else {
            checker = (timestamp) => {
                if (timestamp - startTimestamp >= timeout) {
                    this.timeout = undefined;
                    fn();
                } else {
                    this.timeout = requestAnimationFrame(checker);
                }
            };            
        }
        this.timeout = requestAnimationFrame(checker);
    }
})();

FUPCMPlayer.prototype.ensuredClearTimeout = function() {
    if(this.timeout) {
        cancelAnimationFrame(this.timeout);
        this.timeout = undefined;
    }
};

FUPCMPlayer.prototype.flush = function() {

    if (!this.samples) return;
    if (!this.samples.length) {
        console.warn('End');
        if (this.callbackOnEnd) {
            console.warn('End');
            this.callbackOnEnd(false);
        }
        return;
    }
    
    var bufferSource = this.audioCtx.createBufferSource(),
        length = this.samples.length / this.option.channels,
        audioBuffer = this.audioCtx.createBuffer(this.option.channels, length, this.option.sampleRate),
        audioData,
        channel,
        offset,
        i;

    for (channel = 0; channel < this.option.channels; channel++) {
        audioData = audioBuffer.getChannelData(channel);
        offset = channel;
        for (i = 0; i < length; i++) {
            audioData[i] = this.samples[offset];
            offset += this.option.channels;
        }
    }
    if (this.startTime < this.audioCtx.currentTime) {
        this.startTime = this.audioCtx.currentTime;
    }
    this.samples = new Float32Array();
    
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(this.gainNode);

    bufferSource.start(this.startTime);
    this.playingBufferNode = this.scheduledBufferNode;
    this.scheduledBufferNode = bufferSource;
    if(this.playingStartTime < 0) {
        this.playingStartTime = this.startTime;
    }
    this.startTime += audioBuffer.duration;
    
    if(!this.flag_request_stop) {
        const nextTimeGap = (this.startTime - this.audioCtx.currentTime)*1000;
       
        this.ensuredSetTimeout(this.flush, Math.max(5, nextTimeGap - 70), this.callback, Math.max(2, nextTimeGap - this.callbackTimeAhead - 70));
        
    } else {
        this.flag_request_stop = false;
        bufferSource.onended = () => {
            this.resetState();
            this.onEnd && this.onEnd();
        };
    }
};

const rates = {
    SignedInteger16: {type: '16bitInt', format: Int16Array},
    SignedInteger8: {type: '8bitInt', format: Int8Array},
    Real32: {type: '32bitFloat', format: Float32Array},
    SignedInteger32: {type: '32bitInt', format: Int32Array}   
}

core.SampleRate = () => "SampleRate"

const fast = {};
fast.List = (args, env) => {
  return args.map((a) => interpretate(a, env))
}

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
    }
  }

  env.local.state = () => {};
  let callbackOnEnd;

  if (opts.AutoRemove) {
    callbackOnEnd = () => {
        console.warn('Autoremove!');
        env.root.dispose();
    }
  } else {
    callbackOnEnd = () => {
        env.local.state(false)
    }
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
                    pbar.style.width = "100%"
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
                pbar.style.width = "100%"
            }
            stopButton.classList.add('hidden');
            player.interrupt();
            playButton.classList.remove('hidden');   
        }

        env.local.prevState = state;
    }    

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
        additionalInfo = "Data is on Kernel"
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
    })

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
    }  

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
    }
  }

}



core.PCMPlayer.update = async (args, env) => {
  if (env.local.deadPlayer) return;
  const data = await interpretate(args[0], {...env, context: fast});
  env.local.state(true);
  if (data instanceof NumericArrayObject) {
    env.local.player.feed(data.buffer);
  } else {
    env.local.player.feed(new env.local.encoding(data));
  }
  
}

core.PCMPlayer.destroy = (args, env) => {
  env.local.deadPlayer = true;
  env.local.player.destroy();
  if (env.local.state.timer) clearInterval(env.local.state.timer);
}

core.PCMPlayer.virtual = true

core['CoffeeLiqueur`Extensions`Sound`PCMPlayer'] = core.PCMPlayer;

const sound = {
    name: 'Sound'
};

//like Graphics it has primitives

interpretate.contextExpand(sound);

const isCharDigit = n => n < 10;

const halftonescale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
//TODO: Implement those
sound.SoundNote = async (args, env) => {
    if (env.hold) return (env) => {
        return sound.SoundNote(args, env)
    };
    
    let notes = await interpretate(args[0], env);
    if (NumericArrayObject.Q(notes)) notes = notes.normal();
    //console.warn(notes);

    let duration = (await interpretate(args[1], env));
    if (NumericArrayObject.Q(duration)) duration = duration.normal();
    if (!duration) duration = '4n';    

    const makeNote = (raw) => {
        let note = raw;
        
        if (typeof note == 'string') {
            if (!isCharDigit(note.charAt(note.length - 1))) note = note + '4';
        } else if (typeof note == 'number') {
            
            //console.log((note) % halftonescale.length);
            console.log(note);
            console.log(note);
            note = (halftonescale[Math.abs((note) % halftonescale.length)] + String(3 + Math.floor(note / 12.0)))
            console.log();
            
            
        } else {
            console.warn(note);
            //note = Note.transpose('C4', [note, 0]);
            throw 'Not supported!';
            console.warn(note);
        }
        if (Array.isArray(duration)) {
            env.synth.triggerAttackRelease(note, duration[1]-duration[0], duration[0]);
            console.log(duration[1]-duration[0]);
        } else {
            env.synth.triggerAttackRelease(note, duration, env.now);
        }
        
    }

    if (Array.isArray(notes)) {
        notes.map(makeNote);
    } else {
        makeNote(notes);
    }

    env.now += 0.5;
}
sound.SampledSoundFunction = async (args, env) => {

}

let Tone;

function isAudioBuffer (buffer) {
	//the guess is duck-typing
	return buffer != null
	&& typeof buffer.length === 'number'
	&& typeof buffer.sampleRate === 'number' //swims like AudioBuffer
	&& typeof buffer.getChannelData === 'function' //quacks like AudioBuffer
	// && buffer.copyToChannel
	// && buffer.copyFromChannel
	&& typeof buffer.duration === 'number'
};

let globalSynth;

sound.Sound = async (args, env) => {  
    if (!Tone) Tone = (await import('tone'));
    if (!globalSynth) globalSynth = new Tone.PolySynth(Tone.Synth).set({'volume': -8}).toDestination(); 

    const object = await interpretate(args[0], {
        ...env, context:sound, Tone: Tone, hold: true
    });
  
    if (env.element) {
        env.element.classList.add(...('sm-controls cursor-pointer py-1 px-2 bg-gray-50 text-left text-gray-500 wljs-card text-xs'.split(' ')));
          env.element.style.verticalAlign = "middle";
        env.element.innerHTML = `
         <svg class="w-4 h-4 text-gray-500 inline-block mt-auto mb-auto" viewBox="0 0 24 24" fill="none">
     <path class="group-hover:opacity-0" d="M3 11V13M6 10V14M9 11V13M12 9
  V15M15 6V18M18 10V14M21 11V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M3 11V13M6 8V16M9 10V14M12 7V17M15 4V20M18 9V15M21 11V13" class="opacity-0 group-hover:opacity-100" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
     </svg> <span class="leading-normal pl-1">${object.length} sec</span>`;
    }
  
    //const targetRate = ctx.sampleRate;
    if (isAudioBuffer(object)) {
        const player = await new Tone.Player(object).toDestination();
        player.fadeOut = 0.05;
        player.fadeIn = 0.01;
        // play as soon as the buffer is loaded
        if (env.element)
            env.element.addEventListener('click', () => player.start());
        else 
            player.start();

        return;
    }

    const play = async () => {
        console.log('Play!');

        
        
        env.synth = globalSynth;

        env.synth.releaseAll();
        const synth = env.synth;

        //const synth = new Tone.PolySynth(Tone.Synth).toDestination();
        const now = Tone.now();
        env.synth = synth;
        env.now = now;

        if (Array.isArray(object)) {
            //assumming sound note
            const copy = {...env, context: sound};
            for (const note of object) {
                console.log(note);
                interpretate(note, copy);
            }
        } else {
      
            object({...env, context: sound});
        }
    };

    if (env.element)
        env.element.addEventListener('click', play);
    else 
        play();
        
  }
  
  
  sound.SampledSoundList = async (args, env) => {
    //assume 32bit float

    let data = await interpretate(args[0], env);
    const rate = await interpretate(args[1], env) | 8000;
  
    //console.log(data);
    
    const length = data.length / rate;
    let buffer;

    if (NumericArrayObject.Q(data)) {
      buffer  = env.Tone.context.createBuffer(1, data.buffer.length, rate);
      buffer.copyToChannel(new Float32Array(data.buffer), 0);      
    } else {
      buffer  = env.Tone.context.createBuffer(1, data.length, rate);
      buffer.copyToChannel(new Float32Array(data), 0);
    }
    //console.log(buffer.getChannelData(0)[110]);

    return buffer;
}

