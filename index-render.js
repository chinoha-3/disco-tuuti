// discord-voice-notify (Render/ホスティング対応版)
// ボイスチャンネル入室通知 + スリープ防止用の簡易Webサーバー付き
//
// 必要パッケージ: discord.js
//   npm install discord.js
//
// Renderにデプロイして使う場合、UptimeRobotなどから
// このアプリのURL（例: https://xxxx.onrender.com）に
// 5〜10分おきにアクセスさせることでスリープを防げます。

const http = require('http');
const { Client, GatewayIntentBits } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const NOTIFY_CHANNEL_ID = process.env.NOTIFY_CHANNEL_ID;

const TARGET_VOICE_CHANNEL_IDS = (process.env.TARGET_VOICE_CHANNEL_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const USE_MENTION = true;

// ---- スリープ防止用の簡易Webサーバー ----
// Renderは「Webサービス」として起動するとポートを開ける必要があるため、
// これがないとデプロイ自体が失敗します。UptimeRobot等はここにアクセスするだけでOKです。
const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bot is alive!');
  })
  .listen(PORT, () => {
    console.log(`Webサーバー起動中 (ポート: ${PORT}) - UptimeRobotなどからここにアクセスさせてください`);
  });

// ---- Discord Bot本体 ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const joinedChannel = newState.channelId && oldState.channelId !== newState.channelId;
    if (!joinedChannel) return;

    if (
      TARGET_VOICE_CHANNEL_IDS.length > 0 &&
      !TARGET_VOICE_CHANNEL_IDS.includes(newState.channelId)
    ) {
      return;
    }

    const member = newState.member;
    const voiceChannel = newState.channel;

    const notifyChannel = await client.channels.fetch(NOTIFY_CHANNEL_ID);
    if (!notifyChannel || !notifyChannel.isTextBased()) {
      console.error('通知先テキストチャンネルが見つからないか、テキストチャンネルではありません');
      return;
    }

    const who = USE_MENTION ? `<@${member.id}>` : `**${member.displayName}**`;
    const text = `🔊 ${who} が「${voiceChannel.name}」に入室しました！`;

    await notifyChannel.send(text);
  } catch (err) {
    console.error('voiceStateUpdate処理でエラー:', err);
  }
});

client.login(TOKEN);
