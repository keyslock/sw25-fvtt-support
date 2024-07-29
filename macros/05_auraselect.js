/*
 * ◆キャラクター周囲の選択
 * 選択されたキャラクターの周囲のトークンを選択します。
 * 指定キャラクターの一定距離内のキャラクターをターゲット、又は選択します。
 * キャラクター：PCを選択対象とします。
 * モンスター　：魔物を選択対象とします。
 * 自身を含む　：自身を選択対象とします。
 *
 * 【使用方法】
 * 起点となるキャラクターを選択し、起動します。
 * 条件を選択した後、実行します。
 * 所有権を持つキャラクターのみで使用可能です。
 *
 */

// マクロ実行
showSelectionDialog();

function showSelectionDialog() {
  // ダイアログの内容
  const content = `
    <form>
      <div class="form-group">
        <h3>${game.i18n.localize("SW25.ST.Macro.General.selectTarget")}</h3>
      </div>
      <div class="form-group">
        <div>
          <input type="checkbox" id="includeCharacters" name="includeCharacters" checked />
          <label for="includeCharacters">キャラクター</label>
        </div>
        <div>
          <input type="checkbox" id="includeMonsters" name="includeMonsters" checked />
          <label for="includeMonsters">モンスター</label>
        </div>
        <div>
          <input type="checkbox" id="includeSelf" name="includeSelf" checked />
          <label for="includeSelf">${game.i18n.localize("SW25.ST.Macro.selfSelect.includeSelf")}</label>
        </div>
      </div>
      <div class="form-group">
        <label for="distance">${game.i18n.localize("SW25.ST.Macro.selfSelect.distance")} :</label><br>
        <input type="number" id="distance" name="distance" value="3" />
      </div>
      <div class="form-group">
        <h3>${game.i18n.localize("SW25.ST.Macro.General.selectAction")}</h3>
      </div>
      <div class="form-group">
        <div>
          <input type="radio" id="target" name="operation" value="target" checked>
          <label for="target">${game.i18n.localize("SW25.ST.Macro.General.target")}</label>
        </div>
        <div>
          <input type="radio" id="select" name="operation" value="select">
          <label for="select">${game.i18n.localize("SW25.ST.Macro.General.select")}</label>
        </div>
      </div>
    </form>
  `;

  // ダイアログ表示
  new Dialog({
    title: `${game.i18n.localize("SW25.ST.Macro.selfSelect.title")}`,
    content: content,
    buttons: {
      ok: {
        icon: "<i class='fas fa-check'></i>",
        label: `${game.i18n.localize("SW25.ST.Macro.General.confirm")}`,
        callback: async (html) => {
          const includeCharacters = html.find('[name="includeCharacters"]').is(':checked');
          const includeMonsters = html.find('[name="includeMonsters"]').is(':checked');
          const includeSelf = html.find('[name="includeSelf"]').is(':checked');
          const distance = parseInt(html.find('[name="distance"]').val(), 10);
          const operation = html.find('[name="operation"]:checked').val();

          // 自分自身のキャラクター
          const selfToken = canvas.tokens.controlled.find(token => token.actor.type === 'character' && token.owner);

          if (selfToken) {
            findTargets(selfToken, includeCharacters, includeMonsters, includeSelf, distance, operation);
          } else {
            ui.notifications.warn(`${game.i18n.localize("SW25.ST.Macro.selfSelect.warn")}`);
          }
        }
      },
      cancel: {
        icon: "<i class='fas fa-times'></i>",
        label: `${game.i18n.localize("SW25.ST.Macro.General.cancel")}`,
      }
    },
    default: "ok"
  }).render(true);
}

function findTargets(selfToken, includeCharacters, includeMonsters, includeSelf, distance, operation) {
  if (operation === "target") {
    // 現在のターゲットを解除
    game.user.updateTokenTargets([]);
  } else {
    // 現在の選択を解除
    canvas.tokens.releaseAll();
  }

  let count = 0;

  // 全トークンをループして指定された条件に基づいて対象を選択またはターゲット
  canvas.tokens.placeables.forEach(token => {
    if (token === selfToken && !includeSelf) return; // 自身を除く場合のチェック

    const isCharacter = token.actor?.type === "character";
    const isMonster = token.actor?.type === "monster";
    const isWithinDistance = getDistance(selfToken, token) <= distance;

    if (isWithinDistance && 
        ((includeCharacters && isCharacter) || (includeMonsters && isMonster))) {
      if (operation === "target") {
        token.setTarget(true, { releaseOthers: false });
      } else if (operation === "select") {
        token.control({ releaseOthers: false });
      }
      count++;
    }
  });

  ui.notifications.info(`${count}${game.i18n.localize("SW25.ST.Macro.selfSelect.info")}`);
  
}

function getDistance(token1, token2) {
  // 中心から中心までの距離を計算
  const gridSize = canvas.grid.size;
  const dx = (token1.x - token2.x) / gridSize;
  const dy = (token1.y - token2.y) / gridSize;
  return Math.sqrt(dx * dx + dy * dy);
}