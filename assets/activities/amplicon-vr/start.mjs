import {createPerspective} from './room.mjs?v=4';

document.getElementById('amp-lab').perspective = createPerspective();
await import('../amplicon/lab.mjs?v=vr4');
