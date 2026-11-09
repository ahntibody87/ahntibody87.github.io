import {createPerspective} from './room.mjs?v=3';

document.getElementById('amp-lab').perspective = createPerspective();
await import('../amplicon/lab.mjs?v=vr3');
