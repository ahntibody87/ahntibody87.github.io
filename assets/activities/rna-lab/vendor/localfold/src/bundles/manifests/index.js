export const MODEL_BUNDLES={rosettafold3:{remote:'https://huggingface.co/sokrypton/localfold/resolve/6634c1398a781455e5be3b06573179f896ae8ad8/rosettafold3-int5/',load:()=>import('./rosettafold3.js')}};
export const AF3_FAMILIES=['rosettafold3'];
export function bundleBaseUrl(family){if(!MODEL_BUNDLES[family])throw Error('Unsupported model');return MODEL_BUNDLES[family].remote;}
export async function loadManifest(family){return (await MODEL_BUNDLES[family].load()).MANIFEST;}
