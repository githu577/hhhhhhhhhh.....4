const fs = require("fs-extra");
const path = require("path");

const filePath = path.join(__dirname, "cache", "moodData.json");

// Ensure cache directory & data file exist
if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ status: false, allowedUsers: [] }, null, 2));
}

function getMoodData() {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveMoodData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
    config: {
        name: "mood",
        version: "1.1.0",
        author: "Md Hamim",
        countDown: 3,
        role: 2, // Only Bot Admin / Owner can configure mood mode
        shortDescription: "Bot Mood Mode (Completely ignores unauthorized users)",
        longDescription: "Turn on mood mode so the bot won't reply to tags, commands, prefix, or messages from normal users.",
        category: "system",
        guide: "{pn} [on/off] | {pn} add [reply/mention] | {pn} remove [reply/mention] | {pn} list"
    },

    onStart: async function ({ api, event, args, message }) {
        const { mentions, type, messageReply } = event;
        let moodData = getMoodData();

        if (args.length === 0) {
            return message.reply(`🎭 Bot Mood Status: ${moodData.status ? "ON 🔴" : "OFF 🟢"}\n\nCommands:\n• ${this.config.name} on - Turn ON Mood Mode\n• ${this.config.name} off - Turn OFF Mood Mode\n• ${this.config.name} add - Reply/Mention to allow a user\n• ${this.config.name} remove - Reply/Mention to remove a user\n• ${this.config.name} list - Show allowed users list`);
        }

        const action = args[0].toLowerCase();

        if (action === "on") {
            moodData.status = true;
            saveMoodData(moodData);
            return message.reply("🎭 Mood Mode study turned ON!\nEkon theke Owner, Admin ar Whitelisted users chara bot karo prefix, mention, ba normal message-er uttor dibe na.");
        } 
        
        else if (action === "off") {
            moodData.status = false;
            saveMoodData(moodData);
            return message.reply("🎭 Mood Mode turned OFF!\nBot normal mode-e phire esheche, shobai bebohar korte parbe.");
        } 

        else if (action === "add") {
            let targetID;
            if (type === "message_reply") {
                targetID = messageReply.senderID;
            } else if (Object.keys(mentions).length > 0) {
                targetID = Object.keys(mentions)[0];
            } else if (args[1] && !isNaN(args[1])) {
                targetID = args[1];
            }

            if (!targetID) {
                return message.reply("❌ Kake Mood list-e add korte chan take mention korun othoba tar message-e reply din!");
            }

            if (moodData.allowedUsers.includes(targetID)) {
                return message.reply("⚠️ Ei user allready Mood list-e add ache.");
            }

            moodData.allowedUsers.push(targetID);
            saveMoodData(moodData);
            return message.reply(`✅ User (${targetID}) ke Mood Whitelist-e add kora hoyeche. Ekon theke bot tar kotha-o shunbe.`);
        } 

        else if (action === "remove") {
            let targetID;
            if (type === "message_reply") {
                targetID = messageReply.senderID;
            } else if (Object.keys(mentions).length > 0) {
                targetID = Object.keys(mentions)[0];
            } else if (args[1] && !isNaN(args[1])) {
                targetID = args[1];
            }

            if (!targetID) {
                return message.reply("❌ Kake remove korte chan take mention/reply korun.");
            }

            if (!moodData.allowedUsers.includes(targetID)) {
                return message.reply("⚠️️ Ei user Mood list-e nai.");
            }

            moodData.allowedUsers = moodData.allowedUsers.filter(id => id !== targetID);
            saveMoodData(moodData);
            return message.reply(`❌ User (${targetID}) ke Mood Whitelist theke soriye dewa hoyeche.`);
        } 

        else if (action === "list") {
            if (moodData.allowedUsers.length === 0) {
                return message.reply("📜 Mood Whitelist-e kono extra user nei.");
            }
            return message.reply(`📜 Whitelisted Users ID List:\n\n${moodData.allowedUsers.map((id, index) => `${index + 1}.${id}`).join("\n")}`);
        } 

        else {
            return message.reply("❌ Invalid command parameter! Use `/mood` to see options.");
        }
    },

    // Strict global check for all incoming chat/events/commands
    onChat: async function ({ api, event, config, isUserAdmin }) {
        const moodData = getMoodData();

        // Mood OFF thakle kono kichu block hobe na
        if (!moodData.status) return;

        const senderID = event.senderID;
        const botAdmins = config.ADMINBOT || [];
        const botOwners = config.NDH || config.OWNER || [];

        // Check user permission status
        const isOwner = botOwners.includes(senderID);
        const isAdmin = botAdmins.includes(senderID);
        const isWhitelisted = moodData.allowedUsers.includes(senderID);

        // Sender jodi Admin, Owner ba Whitelisted na hoy
        if (!isOwner && !isAdmin && !isWhitelisted) {
            // Message stop, seen ignore, plus command execution crash safeguard
            event.body = ""; 
            return false;
        }
    }
};
