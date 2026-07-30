let mermaidDiagrams = false;

class MermaidCell {
  dispose() {
    
  }
  
  constructor(parent, data) {
    let elt = document.createElement("div");
    const uid = parent.uid;
    
    elt.classList.add("frontend-object");
    elt.style.display = "block";
    
    parent.element.appendChild(elt);
    parent.element.classList.add('padding-fix');
  
    let cotainer = document.createElement("div");
    

    if (!mermaidDiagrams) {
      import('./mermaid.core-ad8d5d2d.js').then(function (n) { return n.br; }).then(({ default: mermaid }) => {
        mermaidDiagrams = mermaid;
        mermaidDiagrams.initialize({ startOnLoad: false });
        mermaidDiagrams.render('mermaid-'+uid, data).then((data)=>{
          const {svg, bindFunctions} = data;
          cotainer.innerHTML = svg;
        });  
      });
    
    } else {
      mermaidDiagrams.render('mermaid-'+uid, data).then((data)=>{
        const {svg, bindFunctions} = data;
        cotainer.innerHTML = svg;
      });
    }
  
    elt.appendChild(cotainer);
    
    return this;
  }
}

window.SupportedCells['mermaid'] = {
  view: MermaidCell
};
