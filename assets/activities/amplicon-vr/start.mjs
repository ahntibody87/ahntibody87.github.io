import {createPerspective} from './room.mjs';

document.getElementById('amp-lab').perspective = createPerspective();
await import('../amplicon/lab.mjs?v=vr1');
