import loneCoderStage2 from './traits/lone_coder_stage2.json';
import loneCoderStage3 from './traits/lone_coder_stage3.json';
import loneCoderStage4 from './traits/lone_coder_stage4.json';
import loneCoderStage5 from './traits/lone_coder_stage5.json';

import collaboratorStage2 from './traits/collaborator_stage2.json';
import collaboratorStage3 from './traits/collaborator_stage3.json';
import collaboratorStage4 from './traits/collaborator_stage4.json';
import collaboratorStage5 from './traits/collaborator_stage5.json';

import craftsmanStage2 from './traits/craftsman_stage2.json';
import craftsmanStage3 from './traits/craftsman_stage3.json';
import craftsmanStage4 from './traits/craftsman_stage4.json';
import craftsmanStage5 from './traits/craftsman_stage5.json';

import architectStage2 from './traits/architect_stage2.json';
import architectStage3 from './traits/architect_stage3.json';
import architectStage4 from './traits/architect_stage4.json';
import architectStage5 from './traits/architect_stage5.json';

import sprinterStage2 from './traits/sprinter_stage2.json';
import sprinterStage3 from './traits/sprinter_stage3.json';
import sprinterStage4 from './traits/sprinter_stage4.json';
import sprinterStage5 from './traits/sprinter_stage5.json';

import owlHatchling from './shared/owl_hatchling.json';
import owlStage2 from './traits/owl2.json';
import owlStage3 from './traits/owl3.json';
import owlStage4 from './traits/owl4.json';
import owlStage5 from './traits/owl5.json';

export const traitSprites: Record<string, Record<number, any>> = {
    'owl': {
        1: owlStage2,
        2: owlStage2,
        3: owlStage3,
        4: owlStage4,
        5: owlStage5
    },
    'lone_coder': {
        2: owlStage2,
        3: loneCoderStage3,
        4: loneCoderStage4,
        5: loneCoderStage5
    },
    'collaborator': {
        2: collaboratorStage2,
        3: collaboratorStage3,
        4: collaboratorStage4,
        5: collaboratorStage5
    },
    'craftsman': {
        2: craftsmanStage2,
        3: craftsmanStage3,
        4: craftsmanStage4,
        5: craftsmanStage5
    },
    'architect': {
        2: architectStage2,
        3: architectStage3,
        4: architectStage4,
        5: architectStage5
    },
    'sprinter': {
        2: sprinterStage2,
        3: sprinterStage3,
        4: sprinterStage4,
        5: sprinterStage5
    }
};
