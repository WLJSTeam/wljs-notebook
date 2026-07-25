class DisabledMarkedRenderer {
  link() {
    return '';
  }
}

class DisabledMarked {
  constructor(options = {}) {
    this.async = options.async === true;
  }

  parse() {
    return this.async ? Promise.resolve('') : '';
  }
}

const markedLoader = async (self) => {
  console.warn('Marked was disabled in lazy loaded package');

  self["default"] = DisabledMarked;
  self["Renderer"] = DisabledMarkedRenderer;
};

const katexLoader = async (self) => {
  const [{ default: katex }, { default: autorender }] = await Promise.all([
    import('./katex-8744854e.js'),
    import('./auto-render-633a37ce.js')
  ]);

  self["default"] = katex;
  self["autorender"] = autorender;
};

new interpretate.shared(
  "katex",
  katexLoader
);

new interpretate.shared(
  "Marked",
  markedLoader
);
