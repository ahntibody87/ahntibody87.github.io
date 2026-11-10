import {createPerspective} from './room.mjs?v=5';

document.getElementById('amp-lab').perspective = createPerspective();
await import('../amplicon/lab.mjs?v=vr5');
