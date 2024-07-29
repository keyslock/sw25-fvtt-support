/*
 * ◆先制判定目標値出力（GM向け）
 * 選択された魔物のすべての先制値を取得し、最も高い先制値をチャット欄に表示します。
 * 先制値が取得できない場合、送信されません。
 *
 * 【使用方法】
 * 先制判定の対象となる魔物をすべて選択し、起動します。
 *
 */

// マクロ実行
getPreemptive();

function getPreemptive() {
  let message = `<hr>
    <span class="st-title-message"> 
    [${game.i18n.localize("SW25.ST.Check.Preemptive")}]&nbsp;
    ${game.i18n.localize("SW25.ST.Check.Targetval")}
    :</span>`;
  let preemptive = 0;

  for(const token of canvas.tokens.controlled){
    if(token.actor.type == "monster"){
      if(preemptive < token.actor.system.preemptive){
        preemptive = token.actor.system.preemptive;
      }
    }
  }

  if(preemptive == 0){
    ui.notifications.warn(game.i18n.localize("SW25.ST.Macro.preemptive.warn"));
  } else {
    message += preemptive;
    message += "<hr>";

    ChatMessage.create({
      speaker: null,
      content: message ,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}