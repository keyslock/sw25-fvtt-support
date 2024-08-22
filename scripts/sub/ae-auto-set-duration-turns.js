/*
 * ActiveEffectの持続時間変更
 * 「ターン開始時の持続ラウンドチェック」のオプション機能であり、併用することを前提としています。
 * ActiveEffect（バフ）を設定した場合、持続ラウンドの設定があり、持続ターンの設定がないものに自動的に持続ターン100を設定します。
 */
export function init() {

    Hooks.on('createActiveEffect', (effect, options, userId) => {
      if (game.settings.get('sw25-fvtt-support', 'autoSetDurationTurns')) {
        if (effect.duration.rounds && !effect.duration.turns) {
          effect.update({ 'duration.turns': 100 });
        }
      }
    });
    
}
