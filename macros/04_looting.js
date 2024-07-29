/*
 * ◆戦利品判定（PL向け）
 * 各魔物に対してダイスロールを行い、戦利品の一覧とロールの結果を表示します。
 * （稀な戦利品を獲得するアイテムなどの補正には対応していません。）
 *
 * 【使用方法】
 * 戦利品を判定したい魔物を「ターゲッティング」し、起動します。
 * トレジャーハント（スカウト）等による、戦利品判定の補正を入力し、決定します。
 *
 */

new Dialog({
  title: `${game.i18n.localize("SW25.ST.Macro.General.inputVal")}`,
  content: `
    <form>
        <label for="pmval">${game.i18n.localize("SW25.ST.Macro.General.plusminus")}:</label>
        <input type="number" id="pmval" name="pmval" />
    </form>
  `,
  buttons: {
    yes: {
      icon: "<i class='fas fa-check'></i>",
      label: `${game.i18n.localize("SW25.ST.Macro.General.confirm")}`,
      callback: async (html) => {
        await getLoot(html);
      }
    },
    no: {
      icon: "<i class='fas fa-times'></i>",
      label: `${game.i18n.localize("SW25.ST.Macro.General.cancel")}`
    },
  },
  default: "yes"
}).render(true);

async function getLoot(html) {
  let count = 0;

  // 自分が操作しているキャラクター（デフォルトキャラクター）の取得
  let character = game.user.character;

  // 自分が制御しているトークン（複数選択している場合は先頭のもの）を取得
  let token = canvas.tokens.controlled[0];

  if (!token && !character) {
    ui.notifications.warn("No controlled token or character found.");
    return;
  }

  let speaker = {
    alias: token?.name || character.name,
    actor: token?.actor?.id || character.id,
    token: token?.id || null,
    scene: canvas.scene.id
  };

  // ダイアログからpmvalの値を取得
  const pmval = html.find("#pmval")[0];
  let val = !isNaN(parseInt(pmval.value, 10)) ? parseInt(pmval.value, 10) : 0;

  for (const token of game.user.targets) {
    if (token.actor.type == "monster") {
      let r = new Roll(`2d6`, {});
      await r.evaluate({ async: true });

      const target = token.actor;
      let total = parseInt(r.result, 10) + val;

      let diceResults = r.terms[0].results.map(r => r.result).join(", ");

      const content = `${game.i18n.localize("SW25.Monster.Loot")}
      (${target.name})<hr>${target.system.loot}<hr>
      ${game.i18n.localize("SW25.ST.Macro.General.rollResult")}:&nbsp;${r.result} (${diceResults}) + ${val} = ${total}`;

      ChatMessage.create({
        speaker: speaker,
        content: content,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });

      count++;
    }
  }

  if (count === 0) {
    ui.notifications.warn(game.i18n.localize("SW25.ST.Macro.looting.warn"));
  }
}