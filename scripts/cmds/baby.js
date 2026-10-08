const axios = require('axios');

const baseApiUrl = async () => {
    return "https://noobs-api.top/dipto";
};

module.exports.config = {
    name: "baby",
    aliases: ["baby", "bbe", "babe", "bot chan"],
    version: "6.9.1",
    author: "dipto edit by MAMUN",
    countDown: 0,
    role: 0,
    description: "better then all sim simi",
    category: "chat",
    guide: {
        en: "{pn} [anyMessage] OR\nteach [YourMessage] - [Reply1], [Reply2]... OR\nteach react [YourMessage] - [react1], [react2]... OR\nremove [YourMessage] OR\nrm [YourMessage] - [indexNumber] OR\nmsg [YourMessage] OR\nlist OR\nall OR\nedit [YourMessage] - [NewMessage]"
    }
};

module.exports.onStart = async ({ api, event, args, usersData }) => {
    const link = `${await baseApiUrl()}/baby`;
    const dipto = args.join(" ").toLowerCase();
    const uid = event.senderID;
    let command, comd, final;

    try {
        if (!args[0]) {
            const ran = ["Bolo baby", "hum", "type help baby", "type #baby hi"];
            return api.sendMessage(ran[Math.floor(Math.random() * ran.length)], event.threadID, event.messageID);
        }

        if (args[0] === 'remove') {
            const fina = dipto.replace("remove ", "");
            const dat = (await axios.get(`${link}?remove=${fina}&senderID=${uid}`)).data.message;
            return api.sendMessage(dat, event.threadID, event.messageID);
        }

        if (args[0] === 'rm' && dipto.includes('-')) {
            const [fi, f] = dipto.replace("rm ", "").split(/\s*-\s*/);
            const da = (await axios.get(`${link}?remove=${fi}&index=${f}`)).data.message;
            return api.sendMessage(da, event.threadID, event.messageID);
        }

        if (args[0] === 'list') {
            if (args[1] === 'all') {
                const data = (await axios.get(`${link}?list=all`)).data;
                const limit = parseInt(args[2]) || 100;
                const limited = data?.teacher?.teacherList?.slice(0, limit) || [];
                const teachers = await Promise.all(limited.map(async (item) => {
                    const number = Object.keys(item)[0];
                    const value = item[number];
                    const name = await usersData.getName(number).catch(() => number) || "Not found";
                    return { name, value };
                }));
                teachers.sort((a, b) => b.value - a.value);
                const output = teachers.map((t, i) => `${i + 1}/ ${t.name}: ${t.value}`).join('\n');
                return api.sendMessage(`Total Teach = ${data.length}\n👑 | List of Teachers of baby\n${output}`, event.threadID, event.messageID);
            } else {
                const d = (await axios.get(`${link}?list=all`)).data;
                return api.sendMessage(`❇️ | Total Teach = ${d.length || "api off"}\n♻️ | Total Response = ${d.responseLength || "api off"}`, event.threadID, event.messageID);
            }
        }

        if (args[0] === 'msg') {
            const fuk = dipto.replace("msg ", "");
            const d = (await axios.get(`${link}?list=${fuk}`)).data.data;
            return api.sendMessage(`Message ${fuk} = ${d}`, event.threadID, event.messageID);
        }

        if (args[0] === 'edit') {
            const command = dipto.split(/\s*-\s*/)[1];
            if (!command || command.length < 2) return api.sendMessage('❌ | Invalid format! Use edit [YourMessage] - [NewReply]', event.threadID, event.messageID);
            const dA = (await axios.get(`${link}?edit=${args[1]}&replace=${command}&senderID=${uid}`)).data.message;
            return api.sendMessage(`changed ${dA}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] !== 'amar' && args[1] !== 'react') {
            [comd, command] = dipto.split(/\s*-\s*/);
            final = comd.replace("teach ", "");
            if (!command || command.length < 2) return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
            const re = await axios.get(`${link}?teach=${final}&reply=${command}&senderID=${uid}&threadID=${event.threadID}`);
            const tex = re.data.message;
            const teacher = (await usersData.get(re.data.teacher))?.name || "Unknown";
            return api.sendMessage(`✅ Replies added ${tex}\nTeacher: ${teacher}\nTeachs: ${re.data.teachs}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'amar') {
            [comd, command] = dipto.split(/\s*-\s*/);
            final = comd.replace("teach ", "");
            if (!command || command.length < 2) return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
            const tex = (await axios.get(`${link}?teach=${final}&senderID=${uid}&reply=${command}&key=intro`)).data.message;
            return api.sendMessage(`✅ Replies added ${tex}`, event.threadID, event.messageID);
        }

        if (args[0] === 'teach' && args[1] === 'react') {
            [comd, command] = dipto.split(/\s*-\s*/);
            final = comd.replace("teach react ", "");
            if (!command || command.length < 2) return api.sendMessage('❌ | Invalid format!', event.threadID, event.messageID);
            const tex = (await axios.get(`${link}?teach=${final}&react=${command}`)).data.message;
            return api.sendMessage(`✅ Replies added ${tex}`, event.threadID, event.messageID);
        }

        if (dipto.includes('amar name ki') || dipto.includes('amr nam ki') || dipto.includes('amar nam ki') || dipto.includes('amr name ki') || dipto.includes('whats my name')) {
            const data = (await axios.get(`${link}?text=amar name ki&senderID=${uid}&key=intro`)).data.reply;
            return api.sendMessage(data, event.threadID, event.messageID);
        }

        const d = (await axios.get(`${link}?text=${encodeURIComponent(dipto)}&senderID=${uid}&font=1`)).data.reply;
        api.sendMessage(d, event.threadID, (error, info) => {
            if (info && global.GoatBot) {
                global.GoatBot.onReply.set(info.messageID, {
                    commandName: this.config.name,
                    type: "reply",
                    messageID: info.messageID,
                    author: event.senderID,
                    d,
                    apiUrl: link
                });
            }
        }, event.messageID);

    } catch (e) {
        console.error(e);
        api.sendMessage("Check console for error", event.threadID, event.messageID);
    }
};

module.exports.onReply = async ({ api, event, Reply }) => {
    try {
        if (event.type === "message_reply") {
            const link = await baseApiUrl();
            const a = (await axios.get(`${link}/baby?text=${encodeURIComponent(event.body?.toLowerCase())}&senderID=${event.senderID}&font=1`)).data.reply;
            await api.sendMessage(a, event.threadID, (error, info) => {
                if (info && global.GoatBot) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: this.config.name,
                        type: "reply",
                        messageID: info.messageID,
                        author: event.senderID,
                        a
                    });
                }
            }, event.messageID);
        }
    } catch (err) {
        return api.sendMessage(`Error: ${err.message}`, event.threadID, event.messageID);
    }
};

module.exports.onChat = async ({ api, event }) => {
    try {
        if (!event.body) return;
        const body = event.body.toLowerCase();
        
        if (body.startsWith("baby") || body.startsWith("bby") || body.startsWith("bot") || body.startsWith("jan") || body.startsWith("babu") || body.startsWith("janu")) {
            const arr = body.replace(/^\S+\s*/, "").trim();

            const randomReplies = [
                "〆 𝐇𝐮𝐦𝐦 𝐛𝐨𝐥𝐨, 𝐬𝐡𝐮𝐧𝐜𝐡𝐢… 𝐓𝐚𝐢𝐛𝐚 𝐚𝐜𝐡𝐢! 🖤",
                "〆 𝐀𝐫𝐞 𝐒𝐢𝐫, 𝐛𝐨𝐥𝐞𝐧… 𝐓𝐚𝐢𝐛𝐚 𝐤𝐢 𝐤𝐨𝐫𝐭𝐞 𝐩𝐚𝐫𝐢? 😌",
                "〆 𝐇𝐮𝐦𝐦 𝐁𝐨𝐬𝐬, 𝐝𝐚𝐤𝐥𝐞𝐧 𝐤𝐞𝐧? 𝐓𝐚𝐢𝐛𝐚 𝐭𝐨 𝐡𝐚𝐳𝐢𝐫! 😎",
                "〆 𝐊𝐢 𝐡𝐨𝐥𝐨 𝐁𝐨𝐬𝐬? 𝐓𝐚𝐢𝐛𝐚-𝐤𝐞 𝐦𝐨𝐧𝐞 𝐩𝐨𝐫𝐞𝐜𝐡𝐞? 👀",
                "〆 𝐒𝐢𝐫, 𝐫𝐚𝐚𝐭 𝐣𝐚𝐠𝐛𝐞𝐧 𝐧𝐚… 𝐓𝐚𝐢𝐛𝐚 𝐤𝐢𝐧𝐭𝐮 𝐛𝐨𝐤𝐛𝐞! 😤😂",
                "〆 𝐁𝐨𝐬𝐬, 𝐚𝐦𝐚𝐤𝐞 𝐝𝐚𝐤𝐥𝐞𝐧? 𝐍𝐚𝐤𝐢 𝐓𝐚𝐢𝐛𝐚-𝐫 𝐤𝐨𝐭𝐡𝐚 𝐦𝐨𝐧𝐞 𝐩𝐨𝐫𝐞𝐜𝐡𝐞? 😏",
                "〆 𝐇𝐮𝐦𝐦 𝐬𝐡𝐮𝐧𝐜𝐡𝐢… 𝐓𝐚𝐢𝐛𝐚 𝐞𝐤𝐡𝐨𝐧 𝐟𝐮𝐥𝐥 𝐚𝐭𝐭𝐞𝐧𝐭𝐢𝐨𝐧! 👀✨",
                "〆 𝐀𝐜𝐜𝐡𝐚 𝐁𝐨𝐬𝐬, 𝐛𝐨𝐥𝐨… 𝐚𝐣𝐤𝐞 𝐤𝐢 𝐤𝐨𝐧𝐨 𝐩𝐥𝐚𝐧 𝐚𝐜𝐡𝐞? 😎",
                "〆 𝐓𝐚𝐢𝐛𝐚 𝐨𝐧𝐥𝐢𝐧𝐞, 𝐛𝐨𝐫𝐢𝐧𝐠𝐧𝐞𝐬𝐬 𝐨𝐟𝐟𝐥𝐢𝐧𝐞! 😂🔥",
                "〆 𝐁𝐨𝐬𝐬, 𝐦𝐨𝐧 𝐤𝐡𝐚𝐫𝐚𝐩 𝐧𝐚𝐤𝐢? 𝐓𝐚𝐢𝐛𝐚 𝐚𝐜𝐡𝐢, 𝐛𝐨𝐥𝐨 🫶",
                "〆 𝐒𝐢𝐫, 𝐞𝐭𝐨 𝐫𝐚𝐚𝐭𝐞 𝐤𝐢 𝐤𝐨𝐫𝐞𝐧? 𝐓𝐚𝐢𝐛𝐚 𝐤𝐢𝐧𝐭𝐮 𝐠𝐡𝐮𝐦𝐚𝐭𝐞 𝐣𝐚𝐛𝐞 😴",
                "〆 𝐇𝐮𝐦𝐦 𝐁𝐨𝐬𝐬, 𝐓𝐚𝐢𝐛𝐚 𝐤𝐞 𝐝𝐚𝐤𝐥𝐞𝐧 𝐦𝐚𝐧𝐞 𝐤𝐢 𝐚𝐝𝐝𝐚 𝐝𝐫𝐚𝐦𝐚 𝐬𝐭𝐚𝐫𝐭? 😂",
                "〆 𝐒𝐢𝐫, 𝐚𝐣 𝐓𝐚𝐢𝐛𝐚-𝐫 𝐦𝐨𝐨𝐝 𝐟𝐮𝐥𝐥 𝐟𝐮𝐧𝐧𝐲! 🤣🔥",
                "〆 𝐁𝐨𝐬𝐬, 𝐣𝐢𝐛𝐨𝐧𝐞 𝐭𝐞𝐧𝐬𝐢𝐨𝐧 𝐧𝐢𝐲𝐞 𝐛𝐨𝐬𝐡𝐛𝐞𝐧 𝐧𝐚… 𝐓𝐚𝐢𝐛𝐚 𝐚𝐜𝐡𝐞! 💪🖤",
                "〆 𝐓𝐚𝐢𝐛𝐚 𝐤𝐞 𝐝𝐚𝐤𝐥𝐞 𝐫𝐞𝐩𝐥𝐲 𝐧𝐚 𝐝𝐢𝐲𝐞 𝐭𝐡𝐚𝐤𝐚 𝐣𝐚𝐲 𝐧𝐚! 😌",
                "〆 𝐀𝐫𝐞 𝐁𝐨𝐬𝐬, 𝐤𝐢 𝐜𝐡𝐚𝐧? 𝐓𝐚𝐢𝐛𝐚 𝐤𝐢𝐧𝐭𝐮 𝐫𝐞𝐚𝐝𝐲! 😎",
                "〆 𝐒𝐢𝐫, 𝐭𝐨𝐦𝐚𝐫 𝐤𝐢 𝐓𝐚𝐢𝐛𝐚-𝐫 𝐤𝐨𝐭𝐡𝐚 𝐦𝐨𝐧𝐞 𝐩𝐨𝐫𝐜𝐡𝐞? 💭",
                "〆 𝐇𝐮𝐦𝐦… 𝐓𝐚𝐢𝐛𝐚 𝐬𝐡𝐮𝐧𝐜𝐡𝐢, 𝐭𝐮𝐦𝐢 𝐛𝐨𝐥𝐨! 🖤",
                "〆 𝐁𝐨𝐬𝐬, 𝐤𝐨𝐭𝐡𝐚 𝐤𝐨𝐦, 𝐚𝐝𝐝𝐚 𝐛𝐞𝐬𝐡𝐢! 😂",
                "〆 𝐒𝐢𝐫, 𝐓𝐚𝐢𝐛𝐚-𝐫 𝐬𝐚𝐦𝐧𝐞 𝐤𝐢𝐧𝐭𝐮 𝐦𝐢𝐭𝐡𝐲𝐚 𝐛𝐨𝐥𝐚 𝐜𝐡𝐨𝐥𝐛𝐞 𝐧𝐚! 😏",
                "〆 𝐓𝐚𝐢𝐛𝐚 𝐚𝐜𝐡𝐞 𝐦𝐚𝐧𝐞 𝐯𝐚𝐥𝐨 𝐯𝐚𝐥𝐨 𝐤𝐨𝐭𝐡𝐚 𝐡𝐨𝐛𝐞! ✨",
                "〆 𝐁𝐨𝐬𝐬, 𝐥𝐢𝐟𝐞 𝐤𝐡𝐚𝐫𝐚𝐩 𝐠𝐞𝐥𝐞𝐨 𝐡𝐚𝐬𝐡𝐭𝐞 𝐡𝐨𝐛𝐞… 𝐓𝐚𝐢𝐛𝐚 𝐛𝐨𝐥𝐜𝐡𝐞! 😎🔥",
                "〆 𝐒𝐢𝐫, 𝐬𝐮𝐜𝐡𝐧𝐚 𝐛𝐚𝐫𝐚𝐧 𝐧𝐚… 𝐓𝐚𝐢𝐛𝐚 𝐬𝐮𝐜𝐡𝐧𝐚 𝐝𝐞𝐛𝐞! 😂",
                "〆 𝐁𝐨𝐬𝐬, 𝐓𝐚𝐢𝐛𝐚 𝐤𝐞 𝐝𝐚𝐤𝐥𝐞 𝐦𝐨𝐨𝐝 𝐧𝐚 𝐤𝐡𝐚𝐫𝐚𝐩 𝐤𝐨𝐫𝐞𝐧! 😌",
                "〆 𝐀𝐫𝐞 𝐒𝐢𝐫, 𝐚𝐣𝐤𝐞 𝐤𝐢 𝐧𝐨𝐭𝐮𝐧 𝐤𝐚𝐡𝐢𝐧𝐢 𝐚𝐜𝐡𝐞? 👀🔥",
                "〆 𝐇𝐮𝐦𝐦 𝐁𝐨𝐬𝐬… 𝐓𝐚𝐢𝐛𝐚 𝐬𝐡𝐮𝐧𝐜𝐡𝐢, 𝐦𝐨𝐧 𝐝𝐢𝐲𝐞 𝐛𝐨𝐥𝐨! 🫶",
                "〆 𝐒𝐢𝐫, 𝐓𝐚𝐢𝐛𝐚 𝐚𝐜𝐡𝐞… 𝐤𝐢𝐧𝐭𝐮 𝐠𝐡𝐮𝐦 𝐚𝐫 𝐧𝐨𝐲! 😂",
                "〆 𝐁𝐨𝐬𝐬, 𝐚𝐦𝐚𝐤𝐞 𝐝𝐚𝐤𝐥𝐞𝐧 𝐣𝐚𝐦𝐞𝐥𝐚 𝐧𝐚 𝐤𝐢 𝐛𝐢𝐬𝐡𝐞𝐬𝐡 𝐩𝐫𝐨𝐣𝐞𝐤𝐭? 😂",
                "〆 𝐓𝐚𝐢𝐛𝐚 𝐛𝐨𝐥𝐜𝐡𝐞—𝐬𝐰𝐚𝐠𝐚𝐭𝐨𝐦, 𝐁𝐨𝐬𝐬! 👑",
                "〆 𝐒𝐢𝐫, 𝐣𝐢𝐛𝐨𝐧 𝐜𝐡𝐨𝐭𝐨 𝐡𝐨𝐤, 𝐬𝐰𝐚𝐩𝐧𝐨 𝐤𝐡𝐚𝐭𝐨 𝐛𝐚𝐫𝐚 𝐫𝐚𝐤𝐡𝐛𝐞𝐧! 💪🔥",
                "〆 𝐓𝐚𝐢𝐛𝐚 𝐛𝐨𝐥𝐜𝐡𝐞, 𝐡𝐚𝐫 𝐦𝐚𝐧𝐞 𝐧𝐚 𝐩𝐞𝐫𝐞 𝐣𝐚𝐨𝐲𝐚 𝐧𝐨𝐲! 👑✨"
            ];

            // যদি শুধু কাস্টম নাম দিয়ে ডাকে (যেমন: baby, bby, janu)
            if (!arr) {
                const replyText = randomReplies[Math.floor(Math.random() * randomReplies.length)];
                return api.sendMessage(replyText, event.threadID, (error, info) => {
                    if (info && global.GoatBot) {
                        global.GoatBot.onReply.set(info.messageID, {
                            commandName: this.config.name,
                            type: "reply",
                            messageID: info.messageID,
                            author: event.senderID
                        });
                    }
                }, event.messageID);
            }

            // যদি নামের সাথে অন্য কিছু লেখে (যেমন: baby hi)
            const link = await baseApiUrl();
            const res = await axios.get(`${link}/baby?text=${encodeURIComponent(arr)}&senderID=${event.senderID}&font=1`);
            const a = res.data.reply;

            await api.sendMessage(a, event.threadID, (error, info) => {
                if (info && global.GoatBot) {
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName: this.config.name,
                        type: "reply",
                        messageID: info.messageID,
                        author: event.senderID,
                        a
                    });
                }
            }, event.messageID);
        }
    } catch (err) {
        console.error(err);
    }
};
