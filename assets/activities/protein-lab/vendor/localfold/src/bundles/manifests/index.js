// Registry limited to the two ESMFold2 bundles used by this laboratory.
export const MODEL_BUNDLES = {
  "ef2-fast-300m": {companion:"esmc-300m", remote:"https://huggingface.co/sokrypton/localfold/resolve/7f265c212f303a9ad57aff2e122cb8bf607eefab/ef2-fast-300m-int5/", load:()=>import("./ef2-fast-300m.js")},
  "esmc-300m": {remote:"https://huggingface.co/sokrypton/localfold/resolve/71ece3571b80e6cdb06f3b95f785187171c718da/esmc-300m-int3/", load:()=>import("./esmc-300m.js")}
};
export function bundleBaseUrl(family){return MODEL_BUNDLES[family].remote;}
export async function loadManifest(family){return (await MODEL_BUNDLES[family].load()).MANIFEST;}
