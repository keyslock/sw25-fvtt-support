// キャラクターシートインポートマクロ
let alignment = "";
let defaultImage = "";
let defaultPortrait = "";
let folder = "";
const dafaultIcon = "icons/svg/mystery-man.svg";

// ゆとシートIIインポートマクロ
async function yt2import() {
  const folders = new Map();

  folders.set("-", "－");
  // すべてのフォルダを取得
  for (const folder of game.folders.values()) {
    if (folder.type === 'Actor') { // キャラクターフォルダのみ対象
      folders.set(folder._id, folder.name);
    }
  }

  // フォルダをドロップダウンリストに追加
  let folderOptions = '';
  for (const folder of folders) {
    folderOptions += `<option value="${folder[0]}">${folder[1]}</option>`;
  }

  // ダイアログ
  let abilist = false;
  let abidesc = false;
  let monabi = false;
  let allattack = false;
  let usefix = false;
  let fileInput = await new Promise((resolve) => {
    let dialogContent = `
      <p>JSONファイル(ゆとシートII出力)を選択してください:</p>
      <p><input type="file" id="json-file-input" accept=".json" style="width: 100%;" /></p>
      <div class="form-group">
        <label for="folderSelect">格納フォルダ</label>
        <select id="folderSelect" name="folderId" class="form-control">
          ${folderOptions}
        </select>
      </div>
      <hr>
          <div class="form-group">
              <label for="alignment" style="width: 100px; display: inline-block">関係性:</label>
              <select id="alignment" name="alignment">
                  <option value="-1">敵対</option>
                  <option value="0">中立</option>
                  <option value="1" selected>友好</option>
              </select>
          </div>
      <hr>
          <div class="form-group">
              <label for="defaultPortrait" style="width: 100px; display: inline-block">コマ絵:</label>
              <input type="text" id="defaultPortrait" name="defaultPortrait" placeholder="ファイルを選択（任意）" style="width: 200px" />
          </div>
          <div class="form-group">
              <label for="defaultImage" style="width: 100px; display: inline-block">立ち絵:</label>
              <input type="text" id="defaultImage" name="defaultImage" placeholder="ファイルを選択（任意）" style="width: 200px" />
          </div>
      <hr>
      <p><b>魔物インポートオプション</b></p>
      <p><input id="abilist" type="checkbox" data-dtype="Boolean" checked/><label for="abilist">魔物能力一覧アイテムを作成</label></p>
      <p><input id="abidesc" type="checkbox" data-dtype="Boolean"/><label for="abidesc">魔物能力一覧を説明タブに展開</label></p>
      <p><input id="monabi" type="checkbox" data-dtype="Boolean"/><label for="monabi">魔物能力の個別アイテムを作成</label></p>
      <p><input id="allattack" type="checkbox" data-dtype="Boolean"/><label for="allattack">多部位魔物：全部位分の攻撃を作成</label></p>
      <p><input id="usefix" type="checkbox" data-dtype="Boolean" checked/><label for="usefix">魔物能力で固定値を使用</label></p>
      <p><input id="prefix" type="checkbox" data-dtype="Boolean"/><label for="prefix">魔物能力に連番を付与（TAH向け）</label></p>
    `;

    new Dialog({
      title: "ゆとシートII インポート",
      content: dialogContent,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: "インポート",
          callback: (html) => {
            let file = html.find("#json-file-input")[0].files[0];
            abilist = html.find("#abilist")[0].checked;
            abidesc = html.find("#abidesc")[0].checked;
            monabi = html.find("#monabi")[0].checked;
            allattack = html.find("#allattack")[0].checked;
            usefix = html.find("#usefix")[0].checked;
            prefix = html.find("#prefix")[0].checked;
            alignment = html.find('[name="alignment"]').val();
            defaultImage = html.find('[name="defaultImage"]').val();
            defaultPortrait = html.find('[name="defaultPortrait"]').val();
            folder = html.find("#folderSelect")[0].value;
            if (!file) {
              ui.notifications.warn("ファイルが選択されていません。");
              return;
            }
            resolve(file);

          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "キャンセル",
          callback: () => resolve(null),
        },
      },
      default: "ok",
      close: () => resolve(null),

      render: (html) => {
        // テキストボックスがクリックされたときにファイルピッカーを開く
        html.find('#defaultImage').on('click', () => {
            new FilePicker({
                type: "image",
                callback: (path) => {
                    html.find('#defaultImage').val(path);
                }
            }).browse();
        });

        html.find('#defaultPortrait').on('click', () => {
            new FilePicker({
                type: "image",
                callback: (path) => {
                    html.find('#defaultPortrait').val(path);
                }
            }).browse();
        });
      }

    }).render(true);
  });

  folder = folder != "-" ? folder : null;
  defaultImage = defaultImage ? defaultImage : dafaultIcon;
  defaultPortrait = defaultPortrait ? defaultPortrait : dafaultIcon;
  // JSON読み込み
  let reader = new FileReader();
  reader.onload = async (event) => {
    try {
      let data = JSON.parse(event.target.result);
      let actorData;
      let itemData = [];

      // アクターデータ作成
      // PC
      let biography = decodeHTML(data.freeNote);

      let hitweapon = "";
      if (data.weapon1Name) hitweapon = data.weapon1Name;

      if (!data.monsterName) {
        itemData = [
          {
            name: "生命抵抗力",
            type: "check",
            system: {
              description: "",
              checkskill: "adv",
              checkabi: "vit",
              showbtcheck: true,
            },
          },
          {
            name: "精神抵抗力",
            type: "check",
            system: {
              description: "",
              checkskill: "adv",
              checkabi: "mnd",
              showbtcheck: true,
            },
          },
        ];
        let resourceList = [];
        let dodgeList = [
          "ファイター",
          "グラップラー",
          "フェンサー",
          "バトルダンサー",
        ];
        let dodgeskill = [0, "-"];
        let shooterLv = 0;
        let wizardList = ["ソーサラー", "コンジャラー"];
        let wzskill = [0, "-"];
        let initiative = [0, "-", "-"];
        let initList = ["スカウト", "ウォーリーダー"];
        let mknowledge = [0, "-", "-"];
        let mknowList = ["セージ", "ライダー"];
        let weakriding = [0, "-", "-"];
        let weakrList = ["ライダー"];
        let weakhiding = [0, "-", "-"];
        let weakhList = [
          "ウィークリング（ガルーダ）",
          "ウィークリング（タンノズ）",
          "ウィークリング（バジリスク）",
          "ウィークリング（ミノタウロス）",
          "ウィークリング（マーマン）",
          "ディアボロ",
          "ドレイク（ナイト）",
          "ドレイク（ブロークン）",
          "バジリスク",
          "ダークトロール",
          "アルボル",
          "バーバヤガー",
          "ケンタウロス",
          "シザースコーピオン",
          "ドーン",
          "コボルド",
          "ラミア",
          "ラルヴァ",
        ];

        // 技能追加
        let baseString = data.sheetDescriptionS.split("技能:")[1].trim();
        let baseSkills = baseString.split("／");
        let skill = baseSkills.map((skill) => {
          let match = skill.match(/([^\d]+)(\d+)/);
          return { name: match[1], level: parseInt(match[2], 10), type: "-" };
        });
        for (let i = 1; ; i++) {
          if (!data[`commonClass${i}`]) break;
          skill.push({
            name: data[`commonClass${i}`],
            level: data[`lvCommon${i}`],
            type: "commonskill",
          });
        }
        for (let i = 0; i < skill.length; i++) {
          let matchItem = game.items.find(
            (item) => item.name === skill[i].name
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium("Item", skill[i].name);
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            setData.system.skilllevel = skill[i].level;
            itemData.push(setData);
          } else {
            itemData.push({
              name: skill[i].name,
              type: "skill",
              system: {
                description: "",
                skilllevel: skill[i].level,
                skilltype: skill[i].type,
              },
            });
          }

          // 判定技能
          if (dodgeList.includes(skill[i].name)) {
            if (dodgeskill[0] < parseInt(skill[i].level)) {
              dodgeskill[0] = parseInt(skill[i].level);
              dodgeskill[1] = skill[i].name;
            }
          }
          if (skill[i].name == "シューター") {
            shooterLv = parseInt(skill[i].level);
          }
          if (wizardList.includes(skill[i].name)) {
            if (wzskill[0] < parseInt(skill[i].level)) {
              wzskill[0] = parseInt(skill[i].level);
              wzskill[1] = skill[i].name;
            }
          }
          if (initList.includes(skill[i].name)) {
            if (initiative[0] < parseInt(skill[i].level)) {
              initiative[0] = parseInt(skill[i].level);
              initiative[1] = skill[i].name;
              initiative[2] = "agi";
            }
          }
          if (mknowList.includes(skill[i].name)) {
            if (mknowledge[0] < parseInt(skill[i].level)) {
              mknowledge[0] = parseInt(skill[i].level);
              mknowledge[1] = skill[i].name;
              mknowledge[2] = "int";
            }
          }
          if (weakrList.includes(skill[i].name)) {
            if (weakriding[0] < parseInt(skill[i].level)) {
              weakriding[0] = parseInt(skill[i].level);
              weakriding[1] = skill[i].name;
              weakriding[2] = "int";
            }
          }

          // リソース用判定
          if (skill[i].name === "バード") {
            resourceList.push("楽素：↑");
            resourceList.push("楽素：↓");
            resourceList.push("楽素：♡");
          } else if (skill[i].name === "ジオマンサー") {
            resourceList.push("天の命脈点");
            resourceList.push("地の命脈点");
            resourceList.push("人の命脈点");
          } else if (skill[i].name === "ウォーリーダー") {
            resourceList.push("陣気");
          }
        }
        if (weakhList.includes(data.race)) {
          weakhiding[1] = "adv";
          weakhiding[2] = "int";
        }

        itemData.push({
          name: "先制",
          type: "check",
          system: {
            description: "",
            checkskill: initiative[1],
            checkabi: initiative[2],
            showbtcheck: true,
          },
        });
        itemData.push({
          name: "魔物知識",
          type: "check",
          system: {
            description: "",
            checkskill: mknowledge[1],
            checkabi: mknowledge[2],
            showbtcheck: true,
          },
        });
        if (weakriding[2] != "-") {
          itemData.push({
            name: "弱点隠蔽（騎獣）",
            type: "check",
            system: {
              description: "",
              checkskill: weakriding[1],
              checkabi: weakriding[2],
              showbtcheck: true,
            },
          });
        }
        if (weakhiding[2] != "-") {
          itemData.push({
            name: "弱点隠蔽",
            type: "check",
            system: {
              description: "",
              checkskill: weakhiding[1],
              checkabi: weakhiding[2],
              showbtcheck: true,
            },
          });
        }
        // 言語追加
        let defaultLang = [
          {
            race: "人間",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "地方語", talk: true, read: true },
            ],
          },
          {
            race: "エルフ",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "エルフ語", talk: true, read: true },
            ],
          },
          {
            race: "ドワーフ",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "ドワーフ語", talk: true, read: true },
            ],
          },
          {
            race: "タビット",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "神紀文明語", talk: false, read: true },
            ],
          },
          {
            race: "ルーンフォーク",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔動機文明語", talk: true, read: true },
            ],
          },
          {
            race: "リカント",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "リカント語", talk: true, read: true },
            ],
          },
          {
            race: "リルドラケン",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "ドラゴン語", talk: true, read: false },
            ],
          },
          {
            race: "グラスランナー",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "グラスランナー語", talk: true, read: true },
            ],
          },
          {
            race: "メリア",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "妖精語", talk: true, read: false },
            ],
          },
          {
            race: "ティエンス",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔神語", talk: true, read: false },
            ],
          },
          {
            race: "レプラカーン",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔動機文明語", talk: true, read: true },
            ],
          },
          {
            race: "アルヴ",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "地方語", talk: true, read: true },
            ],
          },
          {
            race: "シャドウ",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "シャドウ語", talk: true, read: true },
            ],
          },
          {
            race: "ソレイユ",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "ソレイユ語", talk: true, read: false },
            ],
          },
          {
            race: "ウィークリング",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔動機文明語", talk: true, read: true },
            ],
          },
          {
            race: "スプリガン",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔法文明語", talk: true, read: true },
              { name: "巨人語", talk: true, read: true },
            ],
          },
          {
            race: "アビスボーン",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "地方語", talk: true, read: true },
            ],
          },
          {
            race: "ハイマン",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔法文明語", talk: true, read: true },
            ],
          },
          {
            race: "フロウライト",
            lang: [{ name: "交易共通語", talk: true, read: true }],
          },
          {
            race: "ディアボロ",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔神語", talk: true, read: false },
            ],
          },
          {
            race: "ドレイク",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "ドレイク語", talk: true, read: true },
              { name: "汎用蛮族語", talk: true, read: true },
            ],
          },
          {
            race: "バジリスク",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "バジリスク語", talk: true, read: true },
              { name: "ドレイク語", talk: true, read: true },
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "妖魔語", talk: true, read: false },
            ],
          },
          {
            race: "ダークトロール",
            lang: [
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "巨人語", talk: true, read: true },
            ],
          },
          {
            race: "アルボル",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "ドレイク語", talk: true, read: true },
              { name: "妖精語", talk: true, read: false },
            ],
          },
          {
            race: "バーバヤガー",
            lang: [
              { name: "交易共通語", talk: true, read: true },
              { name: "魔法文明語", talk: true, read: true },
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "ドレイク語", talk: true, read: true },
            ],
          },
          {
            race: "ケンタウロス",
            lang: [
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "ケンタウロス語", talk: true, read: true },
            ],
          },
          {
            race: "シザースコーピオン",
            lang: [
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "アンドロスコーピオン語", talk: true, read: true },
              { name: "魔動機文明語", talk: true, read: true },
            ],
          },
          {
            race: "ドーン",
            lang: [
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "交易共通語", talk: true, read: true },
            ],
          },
          {
            race: "コボルド",
            lang: [
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "交易共通語", talk: true, read: true },
              { name: "妖魔語", talk: true, read: false },
            ],
          },
          {
            race: "ドレイクブロークン",
            lang: [
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "交易共通語", talk: true, read: true },
              { name: "ドレイク語", talk: true, read: true },
            ],
          },
          {
            race: "ラミア",
            lang: [
              { name: "汎用蛮族語", talk: true, read: true },
              { name: "交易共通語", talk: true, read: true },
              { name: "ドレイク語", talk: true, read: true },
            ],
          },
          {
            race: "ラルヴァ",
            lang: [
              { name: "地方語", talk: true, read: true },
              { name: "交易共通語", talk: true, read: true },
            ],
          },
        ];
        for (let i = 0; i < defaultLang.length; i++) {
          if (
            data.race == defaultLang[i].race ||
            data.race == "ナイトメア（" + defaultLang[i].race + "）"
          ) {
            for (let j = 0; j < defaultLang[i].lang.length; j++) {
              let matchItem = game.items.find(
                (item) => item.name === defaultLang[i].lang[j].name
              );
              if (!matchItem) {
                matchItem = await findEntryInCompendium(
                  "Item",
                  defaultLang[i].lang[j].name
                );
              }
              if (matchItem) {
                let setData = duplicate(matchItem);
                setData.system.conversation = defaultLang[i].lang[j].talk;
                setData.system.reading = defaultLang[i].lang[j].read;
                itemData.push(setData);
              } else {
                itemData.push({
                  name: defaultLang[i].lang[j].name,
                  type: "language",
                  system: {
                    conversation: defaultLang[i].lang[j].talk,
                    reading: defaultLang[i].lang[j].read,
                  },
                });
              }
            }
          }
        }
        for (let i = 1; ; i++) {
          if (!data[`language${i}`]) break;
          let talk = true;
          let read = true;
          if (!data[`language${i}Talk`]) talk = false;
          if (!data[`language${i}Read`]) read = false;
          let matchItem = game.items.find(
            (item) => item.name === data[`language${i}`]
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium(
              "Item",
              data[`language${i}`]
            );
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            setData.system.conversation = talk;
            setData.system.reading = read;
            itemData.push(setData);
          } else {
            itemData.push({
              name: data[`language${i}`],
              type: "language",
              system: {
                conversation: talk,
                reading: read,
              },
            });
          }
        }
        // 武器追加
        for (let i = 1; ; i++) {
          if (!data[`weapon${i}Name`]) break;
          let dedicated = true;
          if (!data[`weapon${i}Own`]) dedicated = false;
          let category;
          switch (data[`weapon${i}Category`]) {
            case "ソード":
              category = "sword";
              break;
            case "アックス":
              category = "axe";
              break;
            case "スピア":
              category = "spear";
              break;
            case "メイス":
              category = "mace";
              break;
            case "スタッフ":
              category = "staff";
              break;
            case "フレイル":
              category = "flail";
              break;
            case "ウォーハンマー":
              category = "warhammer";
              break;
            case "格闘":
              category = "grapple";
              break;
            case "投擲":
              category = "throw";
              break;
            case "ボウ":
              category = "bow";
              break;
            case "クロスボウ":
              category = "crossbow";
              break;
            case "ガン":
              category = "gun";
              break;
            default:
              break;
          }
          let usage;
          switch (data[`weapon${i}Usage`]) {
            case "1H":
              usage = "1H";
              break;
            case "1H#":
              usage = "1H#";
              break;
            case "1H投":
              usage = "1HT";
              break;
            case "1H拳":
              usage = "1HN";
              break;
            case "1H両":
              usage = "1HB";
              break;
            case "2H":
              usage = "2H";
              break;
            case "2H#":
              usage = "2H#";
              break;
            case "振2H":
              usage = "S2H";
              break;
            case "突2H":
              usage = "P2H";
              break;
            default:
              break;
          }
          let matchItem = game.items.find(
            (item) => item.name === data[`weapon${i}Name`]
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium(
              "Item",
              data[`weapon${i}Name`]
            );
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            setData.system.equip = true;
            setData.system.dedicated = dedicated;
            itemData.push(setData);
          } else {
            itemData.push({
              name: data[`weapon${i}Name`],
              type: "weapon",
              system: {
                description: data[`weapon${i}Note`],
                equip: true,
                dedicated: dedicated,
                usedice: true,
                usepower: true,
                category: category,
                usage: usage,
                reqstr: Number(data[`weapon${i}Reqd`]),
                hit: Number(data[`weapon${i}Acc`]),
                dmod: Number(data[`weapon${i}Dmg`]),
                power: Number(data[`weapon${i}Rate`]),
                cvalue: Number(data[`weapon${i}Crit`]),
              },
            });
          }
        }
        // 防具・盾追加
        for (let i = 1; ; i++) {
          if (!data[`armour${i}Name`]) break;
          let dedicated = true;
          if (!data[`armour${i}Own`]) dedicated = false;
          let category;
          switch (data[`armour${i}Category`]) {
            case "非金属鎧":
              category = "nonmetalarmor";
              break;
            case "金属鎧":
              category = "metalarmor";
              break;
            case "盾":
              category = "shield";
              break;
            case "その他":
              category = "other";
              break;
            default:
              break;
          }
          let matchItem = game.items.find(
            (item) => item.name === data[`armour${i}Name`]
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium(
              "Item",
              data[`armour${i}Name`]
            );
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            setData.system.equip = true;
            setData.system.dedicated = dedicated;
            itemData.push(setData);
          } else {
            itemData.push({
              name: data[`armour${i}Name`],
              type: "armor",
              system: {
                description: data[`armour${i}Note`],
                equip: true,
                dedicated: dedicated,
                category: category,
                reqstr: Number(data[`armour${i}Reqd`]),
                dodge: Number(data[`armour${i}Eva`]),
                pp: Number(data[`armour${i}Def`]),
              },
            });
          }
        }
        // 装飾品追加
        let accessorypart = [
          "Head",
          "Face",
          "Ear",
          "Neck",
          "Back",
          "HandR",
          "HandL",
          "Waist",
          "Leg",
          "Other",
        ];
        for (let i = 0; i < accessorypart.length; i++) {
          let addAcc = 0;
          for (let j = 0; j <= addAcc; j++) {
            let underbar = "";
            for (let k = 0; k < j; k++) {
              underbar += "_";
            }
            let accname = "accessory" + accessorypart[i] + underbar + "Name";
            let accown = "accessory" + accessorypart[i] + underbar + "Own";
            let accnote = "accessory" + accessorypart[i] + underbar + "Note";
            let accadd = "accessory" + accessorypart[i] + underbar + "Add";

            let accpart;
            switch (accessorypart[i]) {
              case "Head":
                accpart = "head";
                break;
              case "Face":
                accpart = "face";
                break;
              case "Ear":
                accpart = "ear";
                break;
              case "Neck":
                accpart = "neck";
                break;
              case "Back":
                accpart = "back";
                break;
              case "HandR":
                accpart = "rhand";
                break;
              case "HandL":
                accpart = "lhand";
                break;
              case "Waist":
                accpart = "waist";
                break;
              case "Leg":
                accpart = "leg";
                break;
              case "Other":
                accpart = "other";
                break;
              default:
                break;
            }

            if (data[accadd]) addAcc += 1;

            if (data[accname]) {
              let dedicated = true;
              if (!data[accown]) dedicated = false;
              let matchItem = game.items.find(
                (item) => item.name === data[accname]
              );
              if (!matchItem) {
                matchItem = await findEntryInCompendium("Item", data[accname]);
              }
              if (matchItem) {
                let setData = duplicate(matchItem);
                setData.system.equip = true;
                setData.system.dedicated = dedicated;

                if (data[accown] == "HP") {
                  setData.effects = [
                    {
                      name: "専用装飾品：最大HP+2",
                      icon: "icons/svg/regen.svg",
                      disabled: false,
                      changes: [
                        {
                          mode: 2,
                          value: "2",
                          key: "system.hp.efhpmod",
                        },
                      ],
                      transfer: true,
                    },
                  ];
                } else if (data[accown] == "MP") {
                  setData.effects = [
                    {
                      name: "専用装飾品：最大MP+2",
                      icon: "icons/svg/regen.svg",
                      disabled: false,
                      changes: [
                        {
                          mode: 2,
                          value: "2",
                          key: "system.mp.efmpmod",
                        },
                      ],
                      transfer: true,
                    },
                  ];
                }
                itemData.push(setData);
              } else {
                let setData = {
                  name: data[accname],
                  type: "accessory",
                  system: {
                    description: data[accnote],
                    equip: true,
                    dedicated: dedicated,
                    accpart: accpart,
                  },
                };
                if (data[accown] == "HP") {
                  setData.effects = [
                    {
                      name: "専用装飾品：最大HP+2",
                      icon: "icons/svg/regen.svg",
                      disabled: false,
                      changes: [
                        {
                          mode: 2,
                          value: "2",
                          key: "system.hp.efhpmod",
                        },
                      ],
                      transfer: true,
                    },
                  ];
                } else if (data[accown] == "MP") {
                  setData.effects = [
                    {
                      name: "専用装飾品：最大MP+2",
                      icon: "icons/svg/regen.svg",
                      disabled: false,
                      changes: [
                        {
                          mode: 2,
                          value: "2",
                          key: "system.mp.efmpmod",
                        },
                      ],
                      transfer: true,
                    },
                  ];
                }
                itemData.push(setData);
              }

            }
          }
        }
        // 種族特徴追加
        let raceab = data.raceAbility.match(/［([^］]+)］/g);
        let raceability = raceab.map((match) => match.replace(/[［］]/g, ""));
        for (let i = 0; i < raceability.length; i++) {
          let matchItem = game.items.find(
            (item) => item.name === raceability[i]
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium("Item", raceability[i]);
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            itemData.push(setData);
          } else {
            itemData.push({
              name: raceability[i],
              type: "raceability",
              system: {
                description: "",
              },
            });
          }
        }
        // 戦闘特技追加
        let combatability = [];
        let metafinalsong = false;
        for (let i in data) {
          if (i.startsWith("combatFeats")) {
            if (!i.startsWith("combatFeatsExc")) {
              combatfeats = data[i].split(",");
              for (const val of combatfeats) {
                combatability.push(val);
              }
            }
          }
        }
        for (let i = 0; i < combatability.length; i++) {
          let matchItem = game.items.find(
            (item) => item.name === combatability[i]
          );
          if (combatability[i] == "終律増強") {
            metafinalsong = true;
          }
          if (combatability[i] == "射手の体術") {
            if (dodgeskill[0] < shooterLv) {
              dodgeskill[0] = shooterLv;
              dodgeskill[1] = "シューター";
            }
          }
          if (!matchItem) {
            matchItem = await findEntryInCompendium("Item", combatability[i]);
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            itemData.push(setData);
          } else {
            itemData.push({
              name: combatability[i],
              type: "combatability",
              system: {
                description: "",
              },
            });
          }
        }

        // 練技追加
        for (let i = 1; ; i++) {
          if (!data[`craftEnhance${i}`]) break;
          let matchItem = game.items.find(
            (item) => item.name === data[`craftEnhance${i}`]
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium(
              "Item",
              data[`craftEnhance${i}`]
            );
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            if (setData.system.usepower) {
              setData.system.powerskill = "エンハンサー";
            }
            itemData.push(setData);
          } else {
            itemData.push({
              name: data[`craftEnhance${i}`],
              type: "enhancearts",
              system: {
                description: "",
              },
            });
          }
        }
        // 呪歌・終律追加
        for (let i = 1; ; i++) {
          if (!data[`craftSong${i}`]) break;
          let type = "song";
          if (/終律：/.test(data[`craftSong${i}`])) type = "final";
          let songname = data[`craftSong${i}`].replace(/終律：/g, "");
          let matchItem = game.items.find((item) => item.name === songname);
          if (!matchItem) {
            matchItem = await findEntryInCompendium("Item", songname);
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            if (setData.system.usepower) {
              setData.system.powerskill = "バード";
              // 終律増強
              if (metafinalsong && setData.system.type == "final") {
                setData.system.power = parseInt(setData.system.power) + 10;
              }
            }
            if (setData.system.usedice) {
              setData.system.checkskill = "バード";
            }
            itemData.push(setData);
          } else {
            itemData.push({
              name: songname,
              type: "magicalsong",
              system: {
                description: "",
                type: type,
              },
            });
          }
        }
        // 騎芸追加
        for (let i = 1; ; i++) {
          if (!data[`craftRiding${i}`]) break;
          let matchItem = game.items.find(
            (item) => item.name === data[`craftRiding${i}`]
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium(
              "Item",
              data[`craftRiding${i}`]
            );
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            if (setData.system.usedice) {
              setData.system.checkskill = "ライダー";
            }
            itemData.push(setData);
          } else {
            itemData.push({
              name: data[`craftRiding${i}`],
              type: "ridingtrick",
              system: {
                description: "",
              },
            });
          }
        }
        // 賦術追加
        for (let i = 1; ; i++) {
          if (!data[`craftAlchemy${i}`]) break;
          let matchItem = game.items.find(
            (item) => item.name === data[`craftAlchemy${i}`]
          );
          if (!matchItem) {
            matchItem = await findEntryInCompendium(
              "Item",
              data[`craftAlchemy${i}`]
            );
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            if (setData.system.usedice) {
              setData.system.checkskill = "アルケミスト";
            }
            itemData.push(setData);
          } else {
            itemData.push({
              name: data[`craftAlchemy${i}`],
              type: "alchemytech",
              system: {
                description: "",
              },
            });
          }
        }
        // 相域追加
        for (let i = 1; ; i++) {
          if (!data[`craftGeomancy${i}`]) break;
          let index = data[`craftGeomancy${i}`].indexOf("相：");
          let paname = data[`craftGeomancy${i}`].substring(
            index + "相：".length
          );
          let patype = data[`craftGeomancy${i}`].charAt(index - 1);
          let type;
          switch (patype) {
            case "天":
              type = "ten";
              break;
            case "地":
              type = "chi";
              break;
            case "人":
              type = "jin";
              break;
            default:
              break;
          }
          let matchItem = game.items.find((item) => item.name === paname);
          if (!matchItem) {
            matchItem = await findEntryInCompendium("Item", paname);
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            itemData.push(setData);
          } else {
            itemData.push({
              name: paname,
              type: "phasearea",
              system: {
                description: "",
                type: type,
              },
            });
          }
        }
        // 鼓砲・陣率追加
        for (let i = 1; ; i++) {
          if (!data[`craftCommand${i}`]) break;
          let type = "drum";
          if (/陣率：/.test(data[`craftCommand${i}`])) type = "camp";
          let tacname = data[`craftCommand${i}`].replace(/陣率：/g, "");
          let matchItem = game.items.find((item) => item.name === tacname);
          if (!matchItem) {
            matchItem = await findEntryInCompendium("Item", tacname);
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            itemData.push(setData);
          } else {
            itemData.push({
              name: tacname,
              type: "tactics",
              system: {
                description: "",
                type: type,
                line: "-",
              },
            });
          }
        }

        // マテリアルカード追加
        let materialE = ["Red", "Gre", "Bla", "Whi", "Gol"];
        let materialJ = ["赤", "緑", "黒", "白", "金"];
        let materialR = ["B", "A", "S", "SS"];
        for (let i = 0; i < materialE.length; i++) {
          for (const crank of materialR) {
            if (data["card" + materialE[i] + crank]) {
              let cardName = "マテリアルカード（" + materialJ[i] + crank + "）";
              let quantity = parseInt(data["card" + materialE[i] + crank]);

              let matchItem = game.items.find((item) => item.name === cardName);
              if (!matchItem) {
                matchItem = await findEntryInCompendium("Item", cardName);
              }
              if (matchItem) {
                let setData = duplicate(matchItem);
                setData.system.quantity = quantity;
                itemData.push(setData);
              } else {
                itemData.push({
                  name: data[`craftEnhance${i}`],
                  type: "item",
                  system: {
                    quantity: quantity,
                    description: "",
                  },
                });
              }
            }
          }
        }

        // リソース追加
        for (const resource of resourceList) {
          let matchItem = game.items.find((item) => item.name === resource);
          if (!matchItem) {
            matchItem = await findEntryInCompendium("Item", resource);
          }
          if (matchItem) {
            let setData = duplicate(matchItem);
            itemData.push(setData);
          } else {
            itemData.push({
              name: resource,
              type: "resource",
              system: {
                description: "",
                quantity: 0,
              },
            });
          }
        }

        actorData = {
          name: data.characterName,
          type: "character",
          folder: folder,
          system: {
            abilities: {
              dex: {
                racevalue: Number(data.sttBaseTec),
                valuebase: Number(data.sttBaseA),
                valuegrowth: Number(data.sttGrowA),
                valuemodify: Number(data.sttAddA),
              },
              agi: {
                valuebase: Number(data.sttBaseB),
                valuegrowth: Number(data.sttGrowB),
                valuemodify: Number(data.sttAddB),
              },
              str: {
                racevalue: Number(data.sttBasePhy),
                valuebase: Number(data.sttBaseC),
                valuegrowth: Number(data.sttGrowC),
                valuemodify: Number(data.sttAddC),
              },
              vit: {
                valuebase: Number(data.sttBaseD),
                valuegrowth: Number(data.sttGrowD),
                valuemodify: Number(data.sttAddD),
              },
              int: {
                racevalue: Number(data.sttBaseSpi),
                valuebase: Number(data.sttBaseE),
                valuegrowth: Number(data.sttGrowE),
                valuemodify: Number(data.sttAddE),
              },
              mnd: {
                valuebase: Number(data.sttBaseF),
                valuegrowth: Number(data.sttGrowF),
                valuemodify: Number(data.sttAddF),
              },
            },
            money: data.moneyTotal,
            race: data.race,
            biography: biography,
            attributes: {
              age: data.age,
              gender: data.gender,
              born: data.birth,
              faith: data.faith,
              honer: {
                rank: data.rank,
                value: data.honor,
              },
              impurity: data.sin,
              totalexp: data.expTotal,
            },
            hitweapon: hitweapon,
            attackskill: data.weapon1Class,
            dodgeskill: dodgeskill[1],
            herbskill: "レンジャー",
            potionskill: "レンジャー",
            repairskill: "ライダー",
            scskill: "ソーサラー",
            cnskill: "コンジャラー",
            wzskill: wzskill[1],
            prskill: "プリースト",
            mtskill: "マギテック",
            frskill: "フェアリーテイマー",
            drskill: "ドルイド",
            dmskill: "デーモンルーラー",
          },
          img: defaultPortrait,
          prototypeToken: {
            disposition: alignment,
            texture: {
              src: defaultImage
            },
          },
        };

        createActor(actorData, itemData);
      }

      // 魔物・騎獣データ
      if (data.monsterName != null) {
        let name = data.monsterName;
        if (data.characterName != null) name = data.characterName;
        let part = data.partsNum + " (" + data.parts + ")";
        if (data.partsNum == 1 || data.partsNum == null) part = null;
        let loot = "";
        let lootNum = Number(data.lootsNum);
        if (lootNum > 0) {
          for (let i = 1; i <= lootNum; i++) {
            let numName = `data.loots${i}Num`;
            let itemName = `data.loots${i}Item`;
            let num = eval(numName);
            let item = eval(itemName);
            loot += num + " : " + item + "<br>";
          }
        }
        let biography;
        let feature = data.skills?.replace(/&lt;br&gt;/g, "<br>");

        let actorNum = parseInt(data.statusNum, 10)
          ? parseInt(data.statusNum, 10)
          : 1;

        let mountLv = parseInt(data.lvMin)
          ? parseInt(data.lv) - parseInt(data.lvMin)
          : 0;
        let access = mountLv == 0 ? 1 : 1 + "-" + (mountLv + 1);

        let vitResist = data.vitResist
          ? data.vitResist
          : data["status" + access + "Vit"];
        let mndResist = data.mndResist
          ? data.mndResist
          : data["status" + access + "Mnd"];

        itemData = [
          {
            name: zeroPad(prefix,"抵抗判定"),
            type: "monsterability",
            system: {
              description: "",
              usedice1: true,
              label1: "生命",
              checkbasemod1: parseValue(vitResist),
              usefix1: usefix,
              applycheck1: false,
              usedice2: true,
              label2: "精神",
              checkbasemod2: parseValue(mndResist),
              usefix2: usefix,
              applycheck2: false,
            },
          },
        ];

        let partsList = [];
        for (var i = 1; i <= actorNum; i++) {
          let mountLv = parseInt(data.lvMin)
            ? parseInt(data.lv) - parseInt(data.lvMin)
            : 0;
          access = mountLv == 0 ? i : i + "-" + (mountLv + 1);
          let itemDamage = data["status" + access + "Damage"] ? data["status" + access + "Damage"].replace(
            /\b2d6\b|\b2d\b/g,
            ""
          ): "";

          if (!isNaN(itemDamage)) {
            itemData.push({
              name: zeroPad(prefix, data["status" + i + "Style"]),
              type: "monsterability",
              system: {
                description: "",
                usedice1: true,
                label1: "命中",
                checkbasemod1: parseValue(data["status" + access + "Accuracy"]),
                usefix1: usefix,
                applycheck1: false,
                usedice2: true,
                label2: "打撃",
                checkbasemod2: itemDamage,
                usefix2: false,
                applycheck2: "on",
                usedice3: true,
                label3: "回避",
                checkbasemod3: parseValue(data["status" + access + "Evasion"]),
                usefix3: usefix,
                applycheck3: false,
              },
            });
          }
          if (abidesc)
            partsList.push([
              data["status" + i + "Style"],
              parseValue(data["status" + access + "Accuracy"]),
              data["status" + access + "Damage"],
              parseValue(data["status" + access + "Evasion"]),
              parseValue(data["status" + access + "Defense"]),
              parseValue(data["status" + access + "Hp"]),
              parseValue(data["status" + access + "Mp"]),
            ]);
        }

        if (abidesc)
          biography = getBiography(feature, data.description, partsList);
        else biography = "<h3><b>解説</b></h3>" + decodeHTML(data.description);

        if (monabi) {
          abilityList = analysisFeature(feature, usefix);
          for (const val of abilityList) {
            itemData.push(val);
          }
        }
        if (abilist) {
          itemData.push({
            name: "全特殊能力",
            type: "monsterability",
            system: {
              description: feature,
            },
          });
        }

        for (var i = 1; i <= actorNum; i++) {
          let partsName = data["status" + i + "Style"];
          partsName = partsName?.replace(/.*[\(（]/, "").replace(/[\)）].*/, "");
          let actName = actorNum == 1 ? name : name + " (" + partsName + ")";

          let mountLv = parseInt(data.lvMin)
            ? parseInt(data.lv) - parseInt(data.lvMin)
            : 0;
          let access = mountLv == 0 ? i : i + "-" + (mountLv + 1);

          actorData = {
            name: actName,
            type: "monster",
            folder: folder,
            system: {
              hp: {
                value: parseValue(data["status" + access + "Hp"]),
              },
              mp: {
                value: parseValue(data["status" + access + "Mp"]),
              },
              monlevel: data.lv,
              hpbase: parseValue(data["status" + access + "Hp"]),
              mpbase: parseValue(data["status" + access + "Mp"]),
              ppbase: parseValue(data["status" + access + "Defense"]),
              type: data.taxa,
              intelligence: data.intellect,
              perception: data.perception,
              reaction: data.disposition,
              impurity: data.sin,
              language: data.language,
              habitat: data.habitat,
              popularity: data.reputation,
              weakpoint: data["reputation+"],
              weakness: data.weakness,
              preemptive: data.initiative,
              move: data.mobility,
              part: part,
              corepart: data.coreParts,
              biography: biography,
              loot: loot,
            },
            img: defaultPortrait,
            prototypeToken: {
              disposition: alignment,
              texture: {
                src: defaultImage
              },
            },
          };

          let applyItemData = [];
          if (!allattack) {
            applyItemData = itemData.filter(
              (item) =>
                !(
                  item.name != data["status" + i + "Style"] &&
                  item.system.label1 == "命中" &&
                  item.system.label2 == "打撃" &&
                  item.system.label3 == "回避"
                )
            );
          } else applyItemData = itemData;

          createActor(actorData, applyItemData);
        }
      }
    } catch (e) {
      ui.notifications.error("ファイル形式エラー");
      console.error(e);
    }
  };
  if (fileInput) {
    reader.readAsText(fileInput);
  }
}

// アクター作成
function createActor(actorData, itemData) {
  Actor.create(actorData)
    .then((actor) => {
      setTimeout(() => {
        actor.update({
          'prototypeToken.disposition': alignment
        });
        let existingItems = actor.items.map((item) => item.id);
        actor
          .deleteEmbeddedDocuments("Item", existingItems)
          .then(() => {
            return actor.createEmbeddedDocuments("Item", itemData);
          })
          .then(() => {
            ui.notifications.info(`「${actor.name}」が作成されました。`);
          })
          .catch((error) => {
            console.error(error);
            ui.notifications.error(
              "アイテムの削除または追加中にエラーが発生しました。"
            );
          });
      }, 500);
    })
    .catch((error) => {
      console.error(error);
      ui.notifications.error("作成に失敗しました。");
    });
}

// 魔物特殊能力解析
function analysisFeature(feature, usefix) {
  const array = feature?.split("<br>");
  var parts = "";
  const patternParts = /^●(.*)$/g;
  const patternMagic =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)+(.*)[/／]魔力([0-9０-９]+).*$/g;
  const patternSkill =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)+(.*)[/／]([0-9０-９]+)[0-9０-９\(\)（）]+[/／](.*)$/g;
  const patternSplit =
    /^(●|\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑).*$/g;
  const patternConst =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*(\[常\]|○|◯|〇)(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*.*$/g;
  const patternMain =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*(\[主\]|＞|▶|〆)(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*.*$/g;
  const patternAux =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*(\[補\]|≫|>>|☆)(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*.*$/g;
  const patternPrep =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*(\[戦\]|△)(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*.*$/g;
  const patternDecia =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*(\[宣\]|🗨|□|☑)(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)*.*$/g;
  const patternReplace =
    /(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑)/g;

  let ability = [];

  var skill = [
    "",
    "",
    "",
    "",
    "",
    false,
    usefix,
    false,
    false,
    false,
    false,
    false,
  ];
  var output = false;
  if(array){
    for (const val of array) {
      var match = "";

      // 能力区切り
      match = val.match(patternSplit);
      if (match != null && output) {
        ability.push({
          name: zeroPad(prefix,skill[0]),
          type: "monsterability",
          system: {
            usedice1: skill[5],
            label1: skill[1],
            checkbasemod1: skill[2],
            usefix1: skill[6],
            applycheck1: false,
            remark: skill[3],
            description: skill[4],
            constant: skill[7],
            main: skill[8],
            aux: skill[9],
            prep: skill[10],
            decla: skill[11],
          },
        });

        skill = [
          "",
          "",
          "",
          "",
          "",
          false,
          usefix,
          false,
          false,
          false,
          false,
          false,
        ];
        output = false;
      }

      // 常時特技
      match = val.match(patternConst);
      if (match != null) {
        skill[0] = match[0].replace(patternReplace, "");
        skill[7] = true;
        output = true;
      }

      // 主動作
      match = val.match(patternMain);
      if (match != null) {
        skill[0] = match[0].replace(patternReplace, "");
        skill[8] = true;
        output = true;
      }

      // 補助動作
      match = val.match(patternAux);
      if (match != null) {
        skill[0] = match[0].replace(patternReplace, "");
        skill[9] = true;
        output = true;
      }

      // 戦闘準備
      match = val.match(patternPrep);
      if (match != null) {
        skill[0] = match[0].replace(patternReplace, "");
        skill[10] = true;
        output = true;
      }

      // 宣言特技
      match = val.match(patternDecia);
      if (match != null) {
        skill[0] = match[0].replace(patternReplace, "");
        skill[11] = true;
        output = true;
      }

      // 部位判定
      match = val.match(patternParts);
      if (match != null) {
        parts = "[" + match[0].replace("●", "") + "]";

        skill = [
          "",
          "",
          "",
          "",
          "",
          false,
          usefix,
          false,
          false,
          false,
          false,
          false,
        ];
        continue;
      }

      // 魔法判定
      match = val.match(patternMagic);
      if (match != null) {
        var split = match[0].split(patternMagic);
        skill[0] = parts != "" ? parts + split[2] : split[2];
        skill[1] = "魔力";
        if (skill[0].includes("真語魔法")) skill[1] = "真語魔力";
        if (skill[0].includes("操霊魔法")) skill[1] = "操霊魔力";
        if (skill[0].includes("深智魔法")) skill[1] = "深智魔力";
        if (skill[0].includes("神聖魔法")) skill[1] = "神聖魔力";
        if (skill[0].includes("魔動機術")) skill[1] = "魔動機術魔力";
        if (skill[0].includes("妖精魔法")) skill[1] = "妖精魔力";
        if (skill[0].includes("森羅魔法")) skill[1] = "森羅魔力";
        if (skill[0].includes("召異魔法")) skill[1] = "召異魔力";
        skill[2] = parseInt(toHalfWidth(split[3]), 10);
        skill[3] = "";
        skill[4] = match[0];
        skill[5] = true;
        skill[6] = usefix;
        output = true;

        continue;
      }

      // 特殊能力判定
      match = val.match(patternSkill);
      if (match != null) {
        var split = match[0].split(patternSkill);

        skill[0] = parts != "" ? parts + split[2] : split[2];
        skill[1] = "判定";
        skill[2] = parseInt(toHalfWidth(split[3]), 10);
        skill[3] = split[4];
        skill[4] = match[0];
        skill[5] = true;
        skill[6] = usefix;
        output = true;

        continue;
      }

      skill[4] = skill[4] + "<br>" + val;
    }
  }

  if (output) {
    ability.push({
      name: zeroPad(prefix,skill[0]),
      type: "monsterability",
      system: {
        usedice1: skill[5],
        label1: skill[1],
        checkbasemod1: skill[2],
        usefix1: skill[6],
        applycheck1: false,
        remark: skill[3],
        description: skill[4],
        constant: skill[7],
        main: skill[8],
        aux: skill[9],
        prep: skill[10],
        decla: skill[11],
      },
    });

    output = false;
  }

  return ability;
}

// 魔物特殊能力HTML成型
function convertHtmlFromFeature(feature) {
  var ret = '<section class="box">';
  const array = feature?.split("<br>");
  var parts = "";
  const patternParts = /^●(.*)$/g;
  const patternSplit =
    /^(\[常\]|○|◯|〇|\[戦\]|△|\[主\]|＞|▶|〆|\[補\]|≫|&gt;&gt;|>>|☆|\[宣\]|🗨|□|☑).*$/g;
  if(array){
    for (const val of array) {
      var match = "";

      // 部位判定
      match = val.match(patternParts);
      if (match != null) {
        ret = ret + "<h3>" + val + "</h3>";
        continue;
      }

      // 能力区切り
      match = val.match(patternSplit);
      if (match != null) {
        ret = ret + "<h4>" + val + "</h4>";
        continue;
      }
      if (val != "") {
        ret = ret + val + "<br>";
      }
    }
  }
  ret = ret + "</section>";
  return ret;
}

function getBiography(feature, description, partsList) {
  let biography = `
      <table class="status">
        <thead>
          <tr>
            <th>攻撃方法（部位）
            <th>命中力
            <th>打撃点
            <th>回避力
            <th>防護点
            <th>ＨＰ
            <th>ＭＰ
        </thead>
        <tbody>
  `;
  for (const parts of partsList) {
    acc = parts[1] + 7;
    eva = parts[3] + 7;
    biography += `
            <tr>
              <td class="pt-item">${parts[0]}
              <td class="pt-item">${parts[1]} (${acc})
              <td class="pt-item">${parts[2]}
              <td class="pt-item">${parts[3]} (${eva})
              <td class="pt-item">${parts[4]}
              <td class="pt-item">${parts[5]}
              <td class="pt-item">${parts[6]}
    `;
  }
  biography += `
        </tbody>
      </table>
  `;

  biography +=
    convertHtmlFromFeature(feature) +
    "<br><h3><b>解説</b></h3>" +
    decodeHTML(description);
  return biography;
}

// 全角半角変換関数
function toHalfWidth(str) {
  // 全角英数字を半角に変換
  str = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
  });
  return str;
}

// 魔物ゼロパディング用
function zeroPadMonabi() {
  let count = 0; 

  return function(enable, label) {
    count += 1; 
    
    return enable ? String(count).padStart(2, '0') + `.${label}` : label;
  };  
}

function parseValue(input) {
  // 数式を計算するための関数
  function evaluateExpression(expression) {
    try {
      // 数式を評価して結果を返す
      return eval(expression);
    } catch (error) {
      // 数式が無効な場合は 0 を返す
      return 0;
    }
  }

  // 全角数字を半角数字に変換する関数
  function convertFullWidthToHalfWidth(str) {
    return str?.replace(/[０１２３４５６７８９]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0xfee0)
    );
  }

  // 数式かどうかのチェック（簡易版）
  function isExpression(str) {
    return /[+\-*/]/.test(str);
  }

  // 数値に変換する関数
  function toNumber(str) {
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  // 数式の場合は計算し、数値に変換する
  if (isExpression(input)) {
    return evaluateExpression(input);
  }

  // 全角数字の場合は半角数字に変換する
  const convertedInput = convertFullWidthToHalfWidth(input);

  // 半角数字であればそのまま数値に変換
  return toNumber(convertedInput);
}


// HTMLデコード関数
function decodeHTML(escapedText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(escapedText, "text/html");
  return doc.documentElement.textContent;
}

function deepCopy(obj) {
  // オブジェクトや配列が null であればそのまま返す
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // オブジェクトか配列かを確認し、適切な新しいインスタンスを作成
  let copy = Array.isArray(obj) ? [] : {};

  // オブジェクトのすべてのプロパティを再帰的にコピー
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }

  return copy;
}

// Compendium検索関数
async function findEntryInCompendium(type, entryName) {
  const packs = game.packs
    .filter((p) => p.documentClass.documentName === type)
    .sort((a, b) => a.metadata.label.localeCompare(b.metadata.label));
  for (const pack of packs) {
    const index = await pack.getIndex();
    const entryIndex = index.find((e) => e.name === entryName);
    if (entryIndex) {
      const compEntry = await pack.getDocument(entryIndex._id);
      return compEntry;
    }
  }
  return null;
}

const zeroPad = zeroPadMonabi();
// マクロ実行
yt2import();