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

  const spriteSvg = renderer.render(sprite, palette, 5); // Scale 5 for 16x16 -> 80x80

  return `
    <svg width="400" height="160" viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .stat-text { font-family: sans-serif; font-size: 10px; fill: #aaa; }
          .name-text { font-family: sans-serif; font-size: 18px; font-weight: bold; fill: #fff; }
          .meta-text { font-family: sans-serif; font-size: 12px; fill: #888; }
        </style>
      </defs>
      <rect width="400" height="160" rx="10" fill="#1a1a2e" />
      
      <!-- Pet Sprite -->
      <g transform="translate(20, 20)">
        ${spriteSvg}
      </g>
      
      <!-- Pet Info -->
      <text x="120" y="40" class="name-text">${name}</text>
      <text x="380" y="40" class="meta-text" text-anchor="end">Lv.${level} / ${difficulty.toUpperCase()}</text>
      
      <!-- Stats Bars -->
      <g transform="translate(120, 60)">
        <text y="0" class="stat-text">Hunger</text>
        <rect y="5" width="200" height="8" rx="4" fill="#333" />
        <rect y="5" width="${hunger * 2}" height="8" rx="4" fill="#ff9800" />
        
        <text y="30" class="stat-text">Happiness</text>
        <rect y="35" width="200" height="8" rx="4" fill="#333" />
        <rect y="35" width="${happiness * 2}" height="8" rx="4" fill="#2196f3" />
        
        <text y="60" class="stat-text">Health</text>
        <rect y="65" width="200" height="8" rx="4" fill="#333" />
        <rect y="65" width="${health * 2}" height="8" rx="4" fill="#4caf50" />
      </g>
      
      <text x="20" y="145" font-family="sans-serif" font-size="10" fill="#444">petgotchi.dev • ${trait || 'Youngling'}</text>
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
