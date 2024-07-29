/*
 * ◆テンプレート範囲内の選択
 * テンプレート範囲内のキャラクターをターゲット、又は選択します。
 *
 * 【使用方法】
 * 起動し、範囲対象となるテンプレートを選択して実行します。
 *
 */

// マクロ実行
showTemplateSelectionDialog();

function showTemplateSelectionDialog() {
  // ダイアログの内容
  const content = `
    <form>
      <div class="form-group">
        <h3>${game.i18n.localize("SW25.ST.Macro.General.selectTemplate")}</h3>
      </div>
      <div class="form-group">
        <label for="templateSelect">${game.i18n.localize("SW25.ST.Macro.General.template")}:</label>
        <select id="templateSelect" name="templateSelect" style="width: 100%;">
          ${canvas.templates.placeables.map(template => `
            <option value="${template.id}" data-bg-color="${template.document.fillColor}" data-border-color="${template.document.strokeColor}" style="background-color:${template.document.fillColor}; color:${template.document.strokeColor};">
              ${template.document.name || template.id}
            </option>
          `).join('')}
        </select>
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
    title: `${game.i18n.localize("SW25.ST.Macro.templateSelect.title")}`,
    content: content,
    buttons: {
      ok: {
        icon: "<i class='fas fa-check'></i>",
        label: `${game.i18n.localize("SW25.ST.Macro.General.confirm")}`,
        callback: async (html) => {
          const selectElement = html.find('[name="templateSelect"]')[0];
          const operationSelect = html.find('[name="operation"]')[0];
          const selectedTemplateId = selectElement.value;
          const operation = operationSelect.value;

          const selectedTemplate = canvas.templates.get(selectedTemplateId);

          if (selectedTemplate) {
            applyOperationToTokens(selectedTemplate, operation);
          } else {
            ui.notifications.warn(`${game.i18n.localize("SW25.ST.Macro.templateSelect.warn")}`);
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

function applyOperationToTokens(templateDoc, operation) {

  // テンプレートの形状と位置情報を取得
  let { shape, x, y } = templateDoc;
  let radius = shape.radius;

  // 全てのトークンを取得
  let tokens = canvas.tokens.placeables;

  // テンプレート内にあるトークンを収集
  let tokensInTemplate = tokens.filter(token => {
    let tokenCenter = token.center;
    let dx = tokenCenter.x - x;
    let dy = tokenCenter.y - y;
    return (dx * dx + dy * dy) <= (radius * radius);
  });


  if (operation === "target") {
    // ターゲットをクリアしてから新しいターゲットを設定
    game.user.updateTokenTargets([]);
    tokensInTemplate.forEach(token => token.setTarget(true, { releaseOthers: false }));
  } else if (operation === "select") {
    canvas.tokens.releaseAll();
    tokensInTemplate.forEach(token => token.control({ releaseOthers: false }));
  }

  // 結果の通知
  ui.notifications.info(`${tokensInTemplate.length}${game.i18n.localize("SW25.ST.Macro.templateSelect.info")}`);
}