import { Pet } from '../shared/types';
import { SpriteRenderer } from './sprite-renderer';
import { PixelMap } from '../shared/pixel-map';

// Sprite Imports
import eggSprite from '../sprites/shared/egg.json';
import hatchlingSprite from '../sprites/shared/hatchling.json';

/**
 * Basic SVG renderer for the Pet card.
 * Adheres to .agent/clean-code.md conventions.
 */
export function renderPetCard(pet: Pet): string {
  const { name, hunger, happiness, health, xp, difficulty, stage, trait, isDormant } = pet;
  const level = Math.floor(Math.sqrt(xp / 10));

  const renderer = new SpriteRenderer();

  // 1. Determine Health State
  let state: 'healthy' | 'hungry' | 'sad' | 'sick' | 'dormant' | 'neutral' = 'neutral';
  if (isDormant) state = 'dormant';
  else if (health < 20) state = 'sick';
  else if (hunger < 40) state = 'hungry';
  else if (happiness < 30) state = 'sad';
  else if (hunger >= 70 && happiness >= 70 && health >= 70) state = 'healthy';

  const palette = renderer.getPaletteForState(trait, state);

  // 2. Select Sprite
  let sprite: PixelMap = (eggSprite as unknown) as PixelMap;
  if (stage === 1) sprite = (hatchlingSprite as unknown) as PixelMap;
  // TODO: Add Stage 2+ trait-specific sprites

  const spriteSvg = renderer.render(sprite, palette as any);

  // Stat color calculation
  const getStatColor = (val: number) => val >= 70 ? '#4caf50' : val >= 40 ? '#ff9800' : '#f44336';

  return `
    <svg width="420" height="200" viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .stat-text { font-family: sans-serif; font-size: 11px; fill: #aaa; }
          .name-text { font-family: sans-serif; font-size: 22px; font-weight: bold; fill: #fff; }
          .meta-text { font-family: sans-serif; font-size: 13px; fill: #888; }
          .footer-text { font-family: sans-serif; font-size: 10px; fill: #444; }
        </style>
      </defs>
      <rect width="420" height="200" rx="16" fill="#1a1a2e" />
      
      <!-- Pet Sprite (60% weight) -->
      <g transform="translate(20, 20)">
        ${spriteSvg}
      </g>
      
      <!-- Content Area (40% weight) -->
      <g transform="translate(200, 30)">
        <text x="0" y="0" class="name-text">${name}</text>
        <text x="0" y="25" class="meta-text">Lv.${level} / ${difficulty.toUpperCase()}</text>
        
        <!-- Stats Bars -->
        <g transform="translate(0, 50)">
          <text y="0" class="stat-text">Hunger</text>
          <rect y="5" width="180" height="10" rx="5" fill="#333" />
          <rect y="5" width="${hunger * 1.8}" height="10" rx="5" fill="${getStatColor(hunger)}" />
          
          <text y="35" class="stat-text">Happiness</text>
          <rect y="40" width="180" height="10" rx="5" fill="#333" />
          <rect y="40" width="${happiness * 1.8}" height="10" rx="5" fill="${getStatColor(happiness)}" />
          
          <text y="70" class="stat-text">Health</text>
          <rect y="75" width="180" height="10" rx="5" fill="#333" />
          <rect y="75" width="${health * 1.8}" height="10" rx="5" fill="${getStatColor(health)}" />
        </g>
        
        <text x="0" y="150" class="footer-text">petgotchi.dev • ${trait || (stage === 0 ? 'Egg' : 'Youngling')} • ${state.toUpperCase()}</text>
      </g>
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
