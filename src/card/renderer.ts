import { Pet } from '../shared/types';
import { SpriteRenderer } from './sprite-renderer';
import { eggSprite } from '../sprites/egg';

/**
 * Basic SVG renderer for the Pet card.
 * Adheres to .agent/clean-code.md conventions.
 */
export function renderPetCard(pet: Pet): string {
  const { name, hunger, happiness, health, xp, difficulty, stage, trait } = pet;
  const level = Math.floor(Math.sqrt(xp / 10));

  const renderer = new SpriteRenderer();
  const isSick = health < 20;
  const isSad = happiness < 30;
  const palette = renderer.getPaletteForState(trait, isSick, isSad);

  // Decide which sprite to use
  let sprite = eggSprite;
  // TODO: Add conditional logic for other stages/traits

  const spriteSvg = renderer.render(sprite, palette, 10); // Scale 10 for 16x16 -> 160x160

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
          <rect y="5" width="${hunger * 1.8}" height="10" rx="5" fill="#ff9800" />
          
          <text y="35" class="stat-text">Happiness</text>
          <rect y="40" width="180" height="10" rx="5" fill="#333" />
          <rect y="40" width="${happiness * 1.8}" height="10" rx="5" fill="#2196f3" />
          
          <text y="70" class="stat-text">Health</text>
          <rect y="75" width="180" height="10" rx="5" fill="#333" />
          <rect y="75" width="${health * 1.8}" height="10" rx="5" fill="#4caf50" />
        </g>
        
        <text x="0" y="150" class="footer-text">petgotchi.dev • ${trait || 'Youngling'}</text>
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
