const codemirror = window.SupportedCells['codemirror'].context;

let timeout = false;
let ae;

core['CoffeeLiqueur`Extensions`Autocomplete`Private`UIAutocompleteConnect'] = async (args, env) => {
    console.log('Autocomplete connected to a server');
    ae.symbols = new Set();
    
    const hash = await interpretate(args[0], env);
    //const channel = await interpretate(args[1], env);

    //check the store
    if (localStorage.getItem("codemirror-autocomplete-hash") != String(hash)) {
      let completeInfo = await server.ask('CoffeeLiqueur`Extensions`Autocomplete`Private`GetDefaults');
      completeInfo = await interpretate(completeInfo, env);
      console.warn('Update static autocomplete info');
      console.warn(completeInfo);
      localStorage.setItem("codemirror-autocomplete-hash", String(completeInfo.hash));
      localStorage.setItem("codemirror-autocomplete", JSON.stringify(completeInfo.data));
      codemirror.EditorAutocomplete.replaceAll(completeInfo.data);
    } else {
      codemirror.EditorAutocomplete.replaceAll(JSON.parse(localStorage.getItem("codemirror-autocomplete")));
    }
    
    server.kernel.io.fire('autocomplete', true, 'Connect');
}

core['CoffeeLiqueur`Extensions`FileEditor`WL`Internal`UIAutocompleteActivate'] = async (args, env) => {
    codemirror.EditorAutocomplete.replaceAll(JSON.parse(localStorage.getItem("codemirror-autocomplete")));
}

ae = async (args, env) => {
    

    const data = await interpretate(args[0], env);
    console.log('Autocomplete populate with ' + data.length + ' symbols');
    
    
    data.forEach((element)=>{
      const name = element[0];
      const usage = element[1];
  
      if (!ae.symbols.has(name)) {
        codemirror.EditorAutocomplete.extend([  
          {
              "label": name,
              "type": usage == "User's defined symbol" ? "variable" : "keyword",
              "info": usage,
              "c": true
          }]);
  
        ae.symbols.add(name);
      }
    });

    codemirror.EditorAutocomplete.refresh();
}


ae.symbols = new Set();
core['CoffeeLiqueur`Extensions`Autocomplete`Private`UIAutocompleteExtend'] = ae;