let party;

core['CoffeeLiqueur`Extensions`CommandPalette`VFX`Internal`iMagicWand'] = async (args, env) => {
  const uid = interpretate(args[0], env);
  let doc = document.getElementById(uid);
  if (!doc) doc = document.getElementsByTagName(uid)[0];
  if (!doc) doc = document.body;

  if (!party) party = (await import('party-js')).default;

  party.sparkles(doc, {
    // Specify further (optional) configuration here.
    count: party.variation.range(10, 60),
    speed: party.variation.range(50, 300),
  });
}
