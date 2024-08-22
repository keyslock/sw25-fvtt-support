/*
 * ターン開始時の持続ラウンドチェック
 * ソードワールド2.5特有のラウンド概念（手番プレイヤーの次ターン開始までを1ラウンドとする）を再現します。
 */
export function init() {

    Hooks.on('updateCombat', (combat, updateData, options, userId) => {
console.log("aaa");

      if (game.settings.get('sw25-fvtt-support', 'checkDurationEachTurn')) {
        const currentTurn = combat.turns[combat.current.turn];
        const actorId = currentTurn.actorId;
        const actor = game.actors.get(actorId);


        // 戦闘参加者全員をループ
        combat.combatants.forEach(combatant => {
          const actor = combatant.actor;
          if (!actor) return;

          // アクターの全てのアクティブエフェクトをチェック
          actor.effects.forEach(effect => {
            // エフェクトソースがターンのキャラクターIDと一致するか確認
            if(effect.flags.sourceId){
              const effectNameMatches = ( effect.flags.sourceId == `Actor.${actorId}`);

              // 現在のラウンドが持続ラウンド数を経過しているか確認
              const currentRound = combat.current.round;
              const startRound = effect.duration.startRound || 0;
              const duration = effect.duration.rounds || 0;
              const durationExceeded = (currentRound - startRound) >= duration;
              const durationTurn = 100 <= effect.duration.turns;

              // 条件を満たす場合、エフェクトを削除
              if (effectNameMatches && durationExceeded && durationTurn) {
                let existingEffect = actor.effects.get(effect.id);
                if (existingEffect) {
                  effect.delete();
                }
              }
            }
          });
        });
      }
    });
}

