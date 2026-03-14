let siri;
let siriInstance  = false;
let party;

core['CoffeeLiqueur`Extensions`CommandPalette`VFX`MagicWand'] = async (args, env) => {
  const uid = interpretate(args[0], env);
  let doc = document.getElementById(uid);
  if (!doc) doc = document.getElementsByTagName(uid)[0];
  if (!doc) return;

  if (!party) party = (await import('party-js')).default;

  party.sparkles(doc, {
    // Specify further (optional) configuration here.
    count: party.variation.range(10, 60),
    speed: party.variation.range(50, 300),
  });
}

core['MagicWand'] = core['CoffeeLiqueur`Extensions`CommandPalette`VFX`MagicWand']

core['CoffeeLiqueur`Extensions`CommandPalette`AI`Private`Siriwave'] = async (args, env) => {
  const op = await interpretate(args[0], env);
  const id = await interpretate(args[1], env);
  const doc = document.getElementById(id);

  if (!siri) siri = (await import('siriwave')).default;
  if (!party) party = (await import('party-js')).default;

  switch(op) {
    case 'Start':
      if (siriInstance) return;
      siriInstance = new siri({
        container: doc,
        autostart: true,
        style: "ios9",
        amplitude:10,
        curveDefinition: [
          { color: "255,255,255", supportLine: true },
          { color: "15, 82, 255" }, // blue
          { color: "255, 57, 76" }, // red
          { color: "48, 220, 0" }, // green
      ]
      });
    break;

    case 'Stop':
      if (!siriInstance) return;
      siriInstance.setAmplitude(5);
      const u = siriInstance;
      setTimeout(() => u.dispose(), 2000);
      siriInstance = false;
    break;
  }
}

core.ReadClipboardExtended = async (args, env) => {
  const clipboardContents = await navigator.clipboard.read();
  for (const item of clipboardContents) {

    const data = new Uint8Array(await (await item.getType(item.types[0])).arrayBuffer());
    const type = item.types[0];
    return [type, Array.from(data)];
  }
}

let marked;

function unicodeToChar(text) {
  return text.replace(/\\:[\da-f]{4}/gi, 
         function (match) {
              return String.fromCharCode(parseInt(match.replace(/\\:/g, ''), 16));
         });
}


core.ChatRunMarkdownProcessor = async (args, env) => {
  if (!marked) {
    await window.interpretate.shared.Marked.load();
    marked = new window.interpretate.shared.Marked.default;
  }
  
  if (env.element.nodeType !== 1) return;

  const list = env.element.querySelectorAll("p[data-type='1']");
  console.log(list);
  for (let i=0; i<list.length; ++i) {
    const e = list[i];
    e.innerHTML = marked.parse( decodeURIComponent(e.innerText) );
    e.classList.remove('hidden');
  }
  
}