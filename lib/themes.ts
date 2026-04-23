// =========================================================================
// THEMES
// Each theme has:
//   - an id (matches profiles.theme)
//   - a human label
//   - a copy dictionary (UI strings that get flavored per theme)
//   - a set of CSS variable values applied to <body data-theme="...">
// CSS variable values live in styles/themes.css keyed off data-theme.
// =========================================================================

export type ThemeId = 'dnd' | 'alien' | 'horror' | 'marquee' | 'cozy' | 'neutral';

export type ThemeCopy = {
  appName: string;
  tasks: string;             // plural for nav + headers
  task: string;              // singular
  newTask: string;           // button: "Add Task"
  completeTask: string;      // button: "Mark Done"
  completedToast: (xp: number, gold: number) => string;
  tasksSubtitle: string;
  inventory: string;
  inventorySubtitle: string;
  searchInventory: string;
  depleted: string;
  lowStock: string;
  recipes: string;
  recipesSubtitle: string;
  allIngredientsPresent: string;
  missingIngredients: (n: number) => string;
  notifications: string;
  notificationsSubtitle: string;
  sendNotification: string;
  xpLabel: string;           // e.g. "XP" or "SIGNAL"
  goldLabel: string;         // e.g. "GP" or "CREDITS" or "HONEY"
  levelLabel: string;
  todayLabel: string;
  filters: {
    all: string;
    mine: string;
    open: string;
    urgent: string;
    done: string;
  };
  tiers: { common: string; rare: string; epic: string; urgent: string };
  assignee: string;
  ornament: string;          // decorative divider character(s)
};

export const THEMES: Record<ThemeId, { id: ThemeId; label: string; copy: ThemeCopy }> = {
  neutral: {
    id: 'neutral',
    label: 'Neutral',
    copy: {
      appName: 'Household',
      tasks: 'Tasks',
      task: 'Task',
      newTask: 'Add Task',
      completeTask: 'Mark Done',
      completedToast: (xp, gold) => `Done · +${xp} XP · +${gold} coin`,
      tasksSubtitle: 'what needs doing',
      inventory: 'Kitchen',
      inventorySubtitle: 'what\'s in the house',
      searchInventory: 'Search items…',
      depleted: 'Out',
      lowStock: 'Low',
      recipes: 'Recipes',
      recipesSubtitle: 'what we can cook',
      allIngredientsPresent: 'All ingredients on hand',
      missingIngredients: (n) => `${n} ingredient${n === 1 ? '' : 's'} missing`,
      notifications: 'Alerts',
      notificationsSubtitle: 'news from the house',
      sendNotification: 'Send Alert',
      xpLabel: 'XP',
      goldLabel: 'Coin',
      levelLabel: 'Lv',
      todayLabel: 'Today',
      filters: { all: 'All', mine: 'Mine', open: 'Open', urgent: 'Urgent', done: 'Done' },
      tiers: { common: 'Easy', rare: 'Medium', epic: 'Hard', urgent: 'Urgent' },
      assignee: 'for',
      ornament: '·',
    },
  },

  // ----- CHARLYSSA -------------------------------------------------------
  dnd: {
    id: 'dnd',
    label: 'D&D',
    copy: {
      appName: 'The Keep',
      tasks: 'Quests',
      task: 'Quest',
      newTask: 'Inscribe Quest',
      completeTask: 'Mark Vanquished',
      completedToast: (xp, gold) => `⚔ Quest vanquished · +${xp} XP · +${gold} GP ⚔`,
      tasksSubtitle: 'deeds of valor await the bold',
      inventory: 'Provisions',
      inventorySubtitle: 'that which sustains the Keep',
      searchInventory: 'Seek thy provision…',
      depleted: 'Depleted',
      lowStock: 'Running low',
      recipes: 'Tomes',
      recipesSubtitle: 'recipes gathered through the ages',
      allIngredientsPresent: 'All components present',
      missingIngredients: (n) => `${n} component${n === 1 ? '' : 's'} missing`,
      notifications: 'Ravens',
      notificationsSubtitle: 'tidings from across the Keep',
      sendNotification: 'Dispatch Raven',
      xpLabel: 'XP',
      goldLabel: 'GP',
      levelLabel: 'Lv',
      todayLabel: 'Today',
      filters: { all: 'All', mine: 'Mine', open: 'Open', urgent: 'Urgent', done: 'Vanquished' },
      tiers: { common: 'Common', rare: 'Rare', epic: 'Epic', urgent: 'Urgent' },
      assignee: '◈',
      ornament: '❦',
    },
  },

  // ----- JAMIE -----------------------------------------------------------
  alien: {
    id: 'alien',
    label: 'Alien Girlie',
    copy: {
      appName: 'MOTHERSHIP',
      tasks: 'Directives',
      task: 'Directive',
      newTask: 'New Directive',
      completeTask: 'Transmit Complete',
      completedToast: (xp, gold) => `>> DIRECTIVE COMPLETE · +${xp} SIGNAL · +${gold} CREDITS <<`,
      tasksSubtitle: '// pending protocols from command',
      inventory: 'Kitchen',
      inventorySubtitle: '// supply hold inventory',
      searchInventory: 'scan supply hold…',
      depleted: 'DEPLETED',
      lowStock: 'LOW SUPPLY',
      recipes: 'Protocols',
      recipesSubtitle: '// nutritional synthesis routines',
      allIngredientsPresent: '>> ALL MATERIALS LOCATED',
      missingIngredients: (n) => `>> ${n} MATERIAL${n === 1 ? '' : 'S'} MISSING`,
      notifications: 'Transmissions',
      notificationsSubtitle: '// incoming signals from the crew',
      sendNotification: 'Transmit',
      xpLabel: 'SIG',
      goldLabel: 'CRD',
      levelLabel: 'RANK',
      todayLabel: 'CYCLE',
      filters: { all: 'ALL', mine: 'MINE', open: 'ACTIVE', urgent: 'PRIORITY', done: 'ARCHIVE' },
      tiers: { common: 'ROUTINE', rare: 'ELEVATED', epic: 'CRITICAL', urgent: 'PRIORITY' },
      assignee: '►',
      ornament: '◉',
    },
  },

  // ----- JALEX -----------------------------------------------------------
  horror: {
    id: 'horror',
    label: 'Horror',
    copy: {
      appName: 'The Haunting',
      tasks: 'Rituals',
      task: 'Ritual',
      newTask: 'Inscribe Ritual',
      completeTask: 'Complete Ritual',
      completedToast: (xp, gold) => `† the ritual is complete · +${xp} dread · +${gold} coin †`,
      tasksSubtitle: 'what the house demands of us',
      inventory: 'The Larder',
      inventorySubtitle: 'what remains in the pantry',
      searchInventory: 'search the shelves…',
      depleted: 'Gone',
      lowStock: 'Dwindling',
      recipes: 'Grimoires',
      recipesSubtitle: 'recipes from the old cookbook',
      allIngredientsPresent: 'all is prepared',
      missingIngredients: (n) => `${n} thing${n === 1 ? '' : 's'} missing`,
      notifications: 'Whispers',
      notificationsSubtitle: 'what the walls have been saying',
      sendNotification: 'Whisper',
      xpLabel: 'Dread',
      goldLabel: 'Coin',
      levelLabel: 'Depth',
      todayLabel: 'Tonight',
      filters: { all: 'All', mine: 'Mine', open: 'Open', urgent: 'Cursed', done: 'Laid to Rest' },
      tiers: { common: 'Mundane', rare: 'Uneasy', epic: 'Grim', urgent: 'Cursed' },
      assignee: '†',
      ornament: '†',
    },
  },

  // ----- KELLY -----------------------------------------------------------
  marquee: {
    id: 'marquee',
    label: 'Marquee',
    copy: {
      appName: 'The Main Stage',
      tasks: 'Showstoppers',
      task: 'Showstopper',
      newTask: 'Add to Billing',
      completeTask: 'Take a Bow',
      completedToast: (xp, gold) => `✨ BRAVO! · +${xp} applause · +${gold} gold ✨`,
      tasksSubtitle: 'tonight\'s performance schedule',
      inventory: 'Green Room',
      inventorySubtitle: 'backstage provisions',
      searchInventory: 'search the dressing room…',
      depleted: 'Sold Out',
      lowStock: 'Last Call',
      recipes: 'Playbill',
      recipesSubtitle: 'featured numbers for dinner',
      allIngredientsPresent: 'The cast is ready — curtain up!',
      missingIngredients: (n) => `${n} understud${n === 1 ? 'y' : 'ies'} missing from the cast`,
      notifications: 'Callboard',
      notificationsSubtitle: 'notes from the stage manager',
      sendNotification: 'Post to Callboard',
      xpLabel: 'Stars',
      goldLabel: 'Gold',
      levelLabel: 'Act',
      todayLabel: 'Tonight',
      filters: { all: 'All', mine: 'Mine', open: 'On Deck', urgent: 'Headliner', done: 'Encore' },
      tiers: { common: 'Opening Act', rare: 'Featured', epic: 'Headliner', urgent: 'Showstopper' },
      assignee: '★',
      ornament: '✦',
    },
  },

  // ----- JANIYA ----------------------------------------------------------
  cozy: {
    id: 'cozy',
    label: 'Cozy',
    copy: {
      appName: 'The Little House',
      tasks: 'Helpful Things',
      task: 'Helpful Thing',
      newTask: 'Add a Helpful Thing',
      completeTask: 'All Done!',
      completedToast: (xp, gold) => `🌻 Lovely work! · +${xp} stars · +${gold} honey pots`,
      tasksSubtitle: 'little things that help the house',
      inventory: 'Kitchen',
      inventorySubtitle: 'what we have in the cupboards',
      searchInventory: 'what are we looking for?',
      depleted: 'All gone',
      lowStock: 'Almost out',
      recipes: 'Cookbook',
      recipesSubtitle: 'warm things to make together',
      allIngredientsPresent: 'We have everything we need!',
      missingIngredients: (n) => `We need ${n} more thing${n === 1 ? '' : 's'}`,
      notifications: 'Notes',
      notificationsSubtitle: 'little notes for the house',
      sendNotification: 'Leave a Note',
      xpLabel: 'Stars',
      goldLabel: 'Honey',
      levelLabel: 'Lv',
      todayLabel: 'Today',
      filters: { all: 'All', mine: 'Mine', open: 'To Do', urgent: 'Soon', done: 'Done!' },
      tiers: { common: 'Quick', rare: 'A bit', epic: 'Big one', urgent: 'Soon!' },
      assignee: 'for',
      ornament: '✿',
    },
  },
};

export function getTheme(id: ThemeId | string | null | undefined) {
  if (!id) return THEMES.neutral;
  return THEMES[id as ThemeId] ?? THEMES.neutral;
}
