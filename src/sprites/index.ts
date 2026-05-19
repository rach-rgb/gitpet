import beaver2 from './traits/beaver2.json';
import beaver3 from './traits/beaver3.json';
import beaver4 from './traits/beaver4.json';

import duck2 from './traits/duck2.json';
import duck3 from './traits/duck3.json';
import duck4 from './traits/duck4.json';

import fox2 from './traits/fox2.json';
import fox3 from './traits/fox3.json';
import fox4 from './traits/fox4.json';

import owlStage2 from './traits/owl2.json';
import owlStage3 from './traits/owl3.json';
import owlStage4 from './traits/owl4.json';

import dog2 from './traits/dog2.json';
import dog3 from './traits/dog3.json';
import dog4 from './traits/dog4.json';

export const traitSprites: Record<string, Record<number, any>> = {
    'lone_coder': {
        2: owlStage2,
        3: owlStage3,
        4: owlStage4,
    },
    'collaborator': {
        2: dog2,
        3: dog3,
        4: dog4,
    },
    'craftsman': {
        2: beaver2,
        3: beaver3,
        4: beaver4
    },
    'architect': {
        2: duck2,
        3: duck3,
        4: duck4
    },
    'sprinter': {
        2: fox2,
        3: fox3,
        4: fox4
    }
};
