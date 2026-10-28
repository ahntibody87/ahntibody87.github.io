// Generate the small, offline RNA topology table from public wwPDB CCD files.
// Usage: node scripts/generate-rna-chemistry.mjs <directory containing A/C/G/U.cif>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const source=process.argv[2];
if(!source)throw Error('Provide a directory containing the four CCD CIF files.');
const chemistry={},digests={};
for(const base of ['A','C','G','U']){
  const text=fs.readFileSync(path.join(source,base+'.cif'),'utf8');
  digests[base]=crypto.createHash('sha256').update(text).digest('hex');
  const rows=category=>{
    const lines=text.split(/\r?\n/),start=lines.findIndex(l=>l.startsWith(category+'.'));
    const fields=[];let i=start;while(lines[i]?.startsWith(category+'.'))fields.push(lines[i++].trim().slice(category.length+1));
    const result=[];
    while(lines[i]&&!lines[i].startsWith('#')){
      const values=[...lines[i++].matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(m=>m[1]??m[2]??m[3]);
      if(values.length!==fields.length)throw Error('Unexpected CIF row');
      result.push(Object.fromEntries(fields.map((f,j)=>[f,values[j]])));
    }
    return result;
  };
  const atoms=Object.fromEntries(rows('_chem_comp_atom').filter(a=>a.type_symbol!=='H').map(a=>[a.atom_id,{element:a.type_symbol,xyz:['x','y','z'].map(k=>Number(a['pdbx_model_Cartn_'+k+'_ideal']))}]));
  const bonds=rows('_chem_comp_bond').filter(b=>atoms[b.atom_id_1]&&atoms[b.atom_id_2]).map(b=>[b.atom_id_1,b.atom_id_2,Math.hypot(...atoms[b.atom_id_1].xyz.map((x,i)=>x-atoms[b.atom_id_2].xyz[i]))]);
  chemistry[base]={atoms,bonds};
}
const header='// Generated from wwPDB Chemical Component Dictionary, retrieved 2026-10-28.\n// Source: https://files.rcsb.org/ligands/download/{A,C,G,U}.cif\n// Bond lengths use ideal CCD coordinates; these are screening targets, not a force field.\n';
fs.writeFileSync('assets/activities/rna-lab/rna-chemistry.js',header+'export const CCD_SHA256='+JSON.stringify(digests)+';\nexport const RNA_CHEMISTRY='+JSON.stringify(chemistry,null,2)+';\n');
console.log('Generated standard RNA heavy-atom topology and ideal coordinates.');
