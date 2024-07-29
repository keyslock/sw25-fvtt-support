/*
 * ◆HP/MP回復用
 * 選択したキャラクターのHP、MPを全回復します。
 * 6時間睡眠の結果や朝を迎えたメリアを想定しています。
 * 3時間睡眠による回復等は対応していません。
 *
 * 【使用方法】
 * HP、MPを回復したいキャラクターを選択し、起動します。
 *
 */


// マクロ実行
execRecover();

function execRecover() {
  let message = `<hr>
    <span class="st-title-message">
    ${game.i18n.localize("SW25.ST.Macro.recover.exec")}
    </span><br>`;

  let count = 0;

  for(const token of canvas.tokens.controlled){
    let name = token.actor.name;
    let actor = token.actor;
    let hpval = actor.system.hp.value;
    let mpval = actor.system.mp.value;
    
    let obj = {};
    obj['system.hp.value'] = actor.system.hp.max;
    obj['system.mp.value'] = actor.system.mp.max;

    actor.update(obj);

    message += `${name}:
    ${game.i18n.localize("SW25.Hp")}:${hpval} >> ${actor.system.hp.max} ,
    ${game.i18n.localize("SW25.Mp")}:${mpval} >> ${actor.system.mp.max}<br>`;
    count++;
  }

  message += "<hr>";

  if(count == 0){
    ui.notifications.warn(game.i18n.localize("SW25.ST.Macro.recover.warn"));
  } else { 
    ChatMessage.create({
      speaker: null,
      content: message ,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}