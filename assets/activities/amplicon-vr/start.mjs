import {createPerspective} from './room.mjs?v=2';

document.getElementById('amp-lab').perspective = createPerspective();
await import('../amplicon/lab.mjs?v=vr2');
