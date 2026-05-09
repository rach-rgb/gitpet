import craftsmanStage2 from './traits/craftsman_stage2.json';
import craftsmanStage3 from './traits/craftsman_stage3.json';
import craftsmanStage4 from './traits/craftsman_stage4.json';

import architectStage2 from './traits/architect_stage2.json';
import architectStage3 from './traits/architect_stage3.json';
import architectStage4 from './traits/architect_stage4.json';

import sprinterStage2 from './traits/sprinter_stage2.json';
import sprinterStage3 from './traits/sprinter_stage3.json';
import sprinterStage4 from './traits/sprinter_stage4.json';

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
        2: craftsmanStage2,
        3: craftsmanStage3,
        4: craftsmanStage4
    },
    'architect': {
        2: architectStage2,
        3: architectStage3,
        4: architectStage4
    },
    'sprinter': {
        2: sprinterStage2,
        3: sprinterStage3,
        4: sprinterStage4
    }
};
