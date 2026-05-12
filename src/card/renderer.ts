import { Pet, PetStage } from '../shared/types';
import { SpriteRenderer } from './sprite-renderer';
import { PixelMap } from '../shared/pixel-map';

// Sprite Imports
import eggSprite from '../sprites/shared/egg.json';
import hatchlingSprite from '../sprites/shared/hatchling.json';
import { traitSprites } from '../sprites';

/**
 * Basic SVG renderer for the Pet card.
 * Adheres to .agent/clean-code.md conventions.
 */
export function renderPetCard(pet: Pet, dashboardUrl?: string): string {
  const { name, hunger, happiness, xp, difficulty, stage, trait, isDormant } = pet;
  const level = Math.floor(Math.sqrt(xp / 10));

  const renderer = new SpriteRenderer();

  // 1. Determine Health State
  let state: 'healthy' | 'hungry' | 'sad' | 'dormant' | 'neutral' = 'neutral';
  if (isDormant) state = 'dormant';
  else if (hunger < 40) state = 'hungry';
  else if (happiness < 30) state = 'sad';
  else if (hunger >= 70 && happiness >= 70) state = 'healthy';

  const palette = renderer.getPaletteForState(trait, state, pet.petId, stage);

  // 2. Select Sprite
  let sprite: PixelMap = (eggSprite as unknown) as PixelMap;
  if (stage === 1) {
    sprite = (hatchlingSprite as unknown) as PixelMap;
  } else if (stage >= 2 && trait && traitSprites[trait]) {
    // Map stage (if > 4, cap at 4)
    const mappedStage = Math.min(stage, 4) as PetStage;
    sprite = (traitSprites[trait][mappedStage] as unknown) as PixelMap;
  }

  const spriteSvg = renderer.render(sprite, palette as any);

  // Stat color calculation
  const getStatColor = (val: number) => val >= 70 ? '#4caf50' : val >= 40 ? '#ff9800' : '#f44336';

  const content = `
      <defs>
        <style>
          .stat-text { font-family: sans-serif; font-size: 11px; fill: #aaa; }
          .name-text { font-family: sans-serif; font-size: 22px; font-weight: bold; fill: #fff; }
          .meta-text { font-family: sans-serif; font-size: 13px; fill: #888; }
          .footer-text { font-family: sans-serif; font-size: 10px; fill: #444; }
          .logo-text { font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 800; fill: #fff; letter-spacing: 0.05em; }
          .logo-text-outline { font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 800; fill: none; stroke: #6366f1; stroke-width: 1.2; letter-spacing: 0.05em; }
        </style>
      </defs>
      <rect width="420" height="220" rx="16" fill="#1a1a2e" />
      <!-- GitChi Logo (왼쪽 상단) -->
      <g transform="translate(20, 28)">
        <text x="0" y="0" class="logo-text-outline" text-anchor="start">GitChi</text>
        <text x="0" y="0" class="logo-text" text-anchor="start">GitChi</text>
      </g>
      
      <!-- Pet Sprite (60% weight) -->
      <g transform="translate(20, 44)">
        ${spriteSvg}
      </g>
      
      <!-- Content Area (40% weight) -->
      <g transform="translate(200, 44)">
        <text x="0" y="0" class="name-text">${name}</text>
        <text x="0" y="25" class="meta-text">Lv.${level} / ${difficulty.toUpperCase()}</text>
        
        <!-- Stats Bars -->
        <g transform="translate(0, 50)">
          <text y="0" class="stat-text">Fullness</text>
          <rect y="5" width="180" height="10" rx="5" fill="#333" />
          <rect y="5" width="${hunger * 1.8}" height="10" rx="5" fill="${getStatColor(hunger)}" />
          
          <text y="35" class="stat-text">Happiness</text>
          <rect y="40" width="180" height="10" rx="5" fill="#333" />
          <rect y="40" width="${happiness * 1.8}" height="10" rx="5" fill="${getStatColor(happiness)}" />
        </g>
        
        <text x="0" y="165" class="footer-text">GitChi • ${trait || (stage === 0 ? 'Egg' : 'Youngling')} • ${state.toUpperCase()} • ${xp} XP</text>
      </g>
  `;

  return `
    <svg width="420" height="220" viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      ${dashboardUrl ? `<a xlink:href="${dashboardUrl}" target="_blank">${content}</a>` : content}
    </svg>
  `.trim();
}

/**
 * Renders a placeholder card when no pet is found.
 */
export function renderPlaceholderCard(): string {
  return `
    <svg width="400" height="160" viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="160" rx="10" fill="#1a1a2e" />
      <text x="200" y="85" font-family="sans-serif" font-size="16" fill="#666" text-anchor="middle">No Pet Found</text>
    </svg>
  `.trim();
}
