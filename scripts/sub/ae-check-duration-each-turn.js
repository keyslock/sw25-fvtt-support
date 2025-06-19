/*
 * ターン開始時の持続ラウンドチェック
 * ソードワールド2.5特有のラウンド概念（手番プレイヤーの次ターン開始までを1ラウンドとする）を再現します。
 */
export function init() {
  Hooks.on("updateCombat", (combat, updateData, options, userId) => {
    if (game.settings.get("sw25-fvtt-support", "checkDurationEachTurn")) {
      if (game.user.isGM) {
        const currentTurn = combat.turns[combat.current.turn];
        const actorId = currentTurn.actorId;
        const actor = game.actors.get(actorId);

        // シーン上に存在するすべてのトークンをループ
        canvas.tokens.placeables.forEach((token) => {
          const actor = token.actor;
          if (!actor) return;

          actor.effects.forEach((effect) => {
            // エフェクトソースがターンのキャラクターIDと一致するか確認
            if (effect.flags.sw25.sourceId) {
              const effectNameMatches =
                effect.flags.sw25.sourceId == `Actor.${actorId}`;

              // 現在のラウンドが持続ラウンド数を経過しているか確認
              const currentRound = combat.current.round;
              const startRound = effect.duration.startRound || 0;
              const duration = effect.duration.rounds || 0;
              const durationExceeded = currentRound - startRound >= duration;
              const durationTurn = 100 <= effect.duration.turns;

              // 条件を満たす場合、エフェクトを削除
              if (effectNameMatches && durationExceeded && durationTurn) {
                effect.delete();
              }
            }
          });
        });
      }
    }
  });
}
