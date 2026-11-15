// Fold cards: the choice after every cleared leg. Each fold is a paper-folding
// trick that changes how the plane flies, in plain words on the card.

export const FOLDS = [
  {
    id: 'wide-wings', name: 'Wide Wings', icon: '🪽',
    text: 'Lift capacity +25. More sky before you stall.',
    apply(plane, sky) { plane.liftMaxBonus += 25; sky.liftMax += 25; sky.lift += 25; },
  },
  {
    id: 'sharp-fold', name: 'Sharp Fold', icon: '➤',
    text: 'Fly 12% faster, boost included.',
    apply(plane) { plane.speedBonus += 0.12; },
  },
  {
    id: 'star-magnet', name: 'Star Magnet', icon: '🧲',
    text: 'Stars drift toward you from far away.',
    apply(plane) { plane.starMagnet = 180; },
  },
  {
    id: 'storm-shield', name: 'Storm Shield', icon: '🛡',
    text: 'One free hit each leg — the shield takes it.',
    apply(plane) { plane.shield = true; },
  },
  {
    id: 'twin-trail', name: 'Twin Trail', icon: '✦✦',
    text: 'Every star is worth double score.',
    apply(plane) { plane.twinTrail = true; },
  },
  {
    id: 'steady-hands', name: 'Steady Hands', icon: '🧭',
    text: 'Wind pushes you only half as hard.',
    apply(plane) { plane.steadyHands = true; },
  },
];

export function rollFoldChoices(random, count = 3) {
  const pool = [...FOLDS];
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}

export function applyFold(fold, plane, sky) {
  fold.apply(plane, sky);
}
