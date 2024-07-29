/*
 * ◆魔物知識判定目標値出力（GM向け）
 * 選択された魔物の知名度／弱点値を取得し、チャットに表示します。
 * 「限定的PLへの表示名」が設定されている場合、その名称が用いられます。
 *
 * 【使用方法】
 * 魔物知識判定の対象となる魔物をすべて選択し、起動します。
 *
 */

// マクロ実行
getPopularity();

function getPopularity() {
  let message = `<hr>
    <span class="st-title-message">
    [${game.i18n.localize("SW25.ST.Check.MonsterKnowledge")}]&nbsp;
    ${game.i18n.localize("SW25.Monster.Popularity")}/
    ${game.i18n.localize("SW25.Monster.Weakpoint")}
    </span><br>`;

  let count = 0;

  for(const token of canvas.tokens.controlled){
    if(token.actor.type == "monster"){
      let name =  token.actor.system.udname == "" ? token.actor.name : token.actor.system.udname;
      let popularity = token.actor.system.popularity;
      let weakpoint = token.actor.system.weakpoint;
      message += `${name}:${popularity}/${weakpoint}<br>`;
      count++;
    }
  }

  message += "<hr>";

  if(count == 0){
    ui.notifications.warn(game.i18n.localize("SW25.ST.Macro.mknow.warn"));
  } else { 
    ChatMessage.create({
      speaker: null,
      content: message ,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}