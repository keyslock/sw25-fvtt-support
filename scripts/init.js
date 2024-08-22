Hooks.once('init', () => {
    game.settings.register('sw25-fvtt-support', 'checkDurationEachTurn', {
      name: `${game.i18n.localize("SW25.ST.Settings.checkStartEffect")}`,
      hint: `${game.i18n.localize("SW25.ST.Settings.checkStartEffectDesc")}`,
      category: "ae-round",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: value => {
        if (value) {
          import('./sub/ae-check-duration-each-turn.js').then(module => module.init());
        }
      }
    });

    game.settings.register('sw25-fvtt-support', 'autoSetDurationTurns', {
      name: `${game.i18n.localize("SW25.ST.Settings.addTurn")}`,
      hint: `${game.i18n.localize("SW25.ST.Settings.addTurnDesc")}`,
      category: "ae-round",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: value => {
        if (value) {
          import('./sub/ae-auto-set-duration-turns.js').then(module => module.init());
        }
      }
    });
  
});

Hooks.once('ready', () => {
  if (game.settings.get('sw25-fvtt-support', 'checkDurationEachTurn')) {
    import('./sub/ae-check-duration-each-turn.js').then(module => module.init());
  }

  if (game.settings.get('sw25-fvtt-support', 'autoSetDurationTurns')) {
    import('./sub/ae-auto-set-duration-turns.js').then(module => module.init());
  }
});
