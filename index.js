require('dotenv').config();
const {
    Client, GatewayIntentBits, Partials, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
    PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const spamMap = new Map();
const warnsMap = new Map();
const BAD_WORDS = ['hurensohn', 'wichser', 'fotze', 'missgeburt', 'spasti', 'behindert', 'schwuchtel', 'bastard', 'arschloch', 'schlampe', 'hure', 'fick', 'ficken', 'motherfucker', 'asshole', 'bitch', 'cunt', 'nigger', 'retard', 'faggot', 'whore', 'slut', 'vollidiot', 'wixxer', 'penner', 'opfer', 'mongo', 'spast'];

async function sendModLog(guild, embed) {
    const ch = guild.channels.cache.find(c => c.name === '📋・mod-logs');
    if (ch) await ch.send({ embeds: [embed] }).catch(() => { });
}
function addWarn(userId, reason, mod) {
    const w = warnsMap.get(userId) || [];
    w.push({ reason, moderator: mod, date: new Date().toISOString() });
    warnsMap.set(userId, w);
    return w.length;
}
function isMod(member) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    const r = member.guild.roles.cache.find(r => r.name === config.roles.moderator);
    return r && member.roles.cache.has(r.id);
}
function isOwner(member) {
    if (!member) return false;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    const r = member.guild.roles.cache.find(r => r.name === 'Owner');
    return r && member.roles.cache.has(r.id);
}

// ── Setup: creates missing channels/roles and sends embeds ──
async function setupServer(guild) {
    console.log(`⚙️  Checking: ${guild.name}`);

    // ── Auto-create "Regelwerk Akzeptiert" role if missing ──
    let rulesRole = guild.roles.cache.find(r => r.name === config.roles.rulesAccepted);
    if (!rulesRole) {
        try {
            rulesRole = await guild.roles.create({ name: config.roles.rulesAccepted, color: 0x57F287, reason: 'Auto-created by TLS Bot' });
            console.log('  ✅ Rolle "Regelwerk Akzeptiert" erstellt!');
        } catch (e) { console.log('  ❌ Konnte Rolle nicht erstellen:', e.message); }
    }

    // ── Auto-create 📁・portfolio channel if missing ──
    let portfolioCh = guild.channels.cache.find(c => c.name === '📁・portfolio');
    if (!portfolioCh) {
        try {
            portfolioCh = await guild.channels.create({
                name: '📁・portfolio',
                type: ChannelType.GuildText,
                topic: '🎨 TLS Service Portfolio – Unsere Arbeiten & Dienstleistungen',
                reason: 'Auto-created by TLS Bot'
            });
            console.log('  ✅ Channel "📁・portfolio" erstellt!');
        } catch (e) { console.log('  ❌ Konnte Portfolio-Channel nicht erstellen:', e.message); }
    }

    // ── Auto-create 💰・preisliste channel if missing (in Community category) ──
    let preislisteCh = guild.channels.cache.find(c => c.name === '💰・preisliste');
    if (!preislisteCh) {
        try {
            const communityCat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('community'));
            preislisteCh = await guild.channels.create({
                name: '💰・preisliste',
                type: ChannelType.GuildText,
                topic: '💰 TLS Service – Preisliste & Angebote',
                parent: communityCat?.id || null,
                reason: 'Auto-created by TLS Bot'
            });
            console.log('  ✅ Channel "💰・preisliste" erstellt!');
        } catch (e) { console.log('  ❌ Konnte Preisliste-Channel nicht erstellen:', e.message); }
    }

    const channels = {
        verify: guild.channels.cache.find(c => c.name === '✅・verifizierung'),
        ticket: guild.channels.cache.find(c => c.name === '🎫・ticket-erstellen'),
        feedback: guild.channels.cache.find(c => c.name === '📝・feedback'),
        rating: guild.channels.cache.find(c => c.name === '⭐・bewertungen'),
        rules: guild.channels.cache.find(c => c.name === '📜・regelwerk'),
        announce: guild.channels.cache.find(c => c.name === '📢・ankündigungen'),
        portfolio: portfolioCh,
        preisliste: preislisteCh,
    };

    async function sendIfNew(ch, embed, row) {
        if (!ch) return;
        const msgs = await ch.messages.fetch({ limit: 5 });
        if (!msgs.find(m => m.author.id === client.user.id && m.embeds.length > 0)) {
            await ch.send(row ? { embeds: [embed], components: [row] } : { embeds: [embed] });
        }
    }

    // ── Preisliste Embed ──
    if (channels.preisliste) {
        await sendIfNew(channels.preisliste,
            new EmbedBuilder()
                .setTitle('💰 TLS Service – Preisliste')
                .setDescription(
                    '**Unsere Dienstleistungen & Preise**\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '🌐 **Website Erstellung**\n' +
                    '> `10€ – 30€` je nach Wünschen\n' +
                    '> ✦ Responsive Design\n' +
                    '> ✦ Individuelles Layout\n' +
                    '> ✦ Statisches Design (kein Animated)\n' +
                    '> ✦ Inkl. Hosting-Beratung\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '🤖 **Discord Bot Entwicklung**\n' +
                    '> `15€ – 50€` je nach Funktionen\n' +
                    '> ✦ Moderation, Tickets, Verifizierung\n' +
                    '> ✦ Custom Commands & Features\n' +
                    '> ✦ 24/7 Hosting möglich\n' +
                    '> ✦ Nachträgliche Anpassungen\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '🎨 **Logo Design**\n' +
                    '> `5€ – 10€`\n' +
                    '> ✦ Professionelles Design\n' +
                    '> ✦ Statisch (kein Animated)\n' +
                    '> ✦ Alle gängigen Formate\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '🖼️ **Banner Design**\n' +
                    '> `5€`\n' +
                    '> ✦ Discord / Server Banner\n' +
                    '> ✦ Statisch (kein Animated)\n' +
                    '> ✦ Individuelles Design\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '> 💡 **Alle Designs sind statisch – keine animierten Elemente.**\n\n' +
                    '📩 **Interesse?** Erstelle ein Ticket im <#' + (channels.ticket?.id || 'ticket-channel') + '> Kanal!'
                )
                .setColor(0xFEE75C)
                .setImage(config.bannerUrl)
                .setFooter({ text: '© 2026 TLS Service • Preise können variieren' })
                .setTimestamp()
        );
    }

    // ── Clear old Regelwerk messages (to re-send with Akzeptieren button) ──
    if (channels.rules) {
        try {
            const oldMsgs = await channels.rules.messages.fetch({ limit: 10 });
            const botMsgs = oldMsgs.filter(m => m.author.id === client.user.id && m.embeds.length > 0 && !m.components.length);
            for (const [, msg] of botMsgs) {
                await msg.delete().catch(() => { });
            }
        } catch (e) { }
    }

    if (channels.verify) {
        await sendIfNew(channels.verify,
            new EmbedBuilder().setTitle('✅ Verifizierung').setDescription('Willkommen bei **TLS**!\n\nKlicke den Button, um dich zu verifizieren.\n\n> Mit der Verifizierung akzeptierst du unser Regelwerk.').setColor(0x57F287).setImage(config.bannerUrl).setFooter({ text: 'TLS Service' }),
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_user').setLabel('Verifizieren').setStyle(ButtonStyle.Success).setEmoji('✅'))
        );
    }
    if (channels.ticket) {
        await sendIfNew(channels.ticket,
            new EmbedBuilder().setTitle('🎫 Support Ticket').setDescription('Brauchst du Hilfe?\n\nKlicke den Button, um ein privates Ticket zu eröffnen.\n\n> **Bitte missbrauche das System nicht.**').setColor(0x5865F2).setImage(config.bannerUrl).setFooter({ text: 'TLS Service • Support' }),
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket').setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫'))
        );
    }
    if (channels.feedback) {
        await sendIfNew(channels.feedback,
            new EmbedBuilder().setTitle('📝 Feedback').setDescription('Deine Meinung zählt!\n\nKlicke den Button, um uns Feedback zu geben.\n\n> **Jedes Feedback wird vom Team gelesen.**').setColor(0xFEE75C).setImage(config.bannerUrl).setFooter({ text: 'TLS Service • Feedback' }),
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_feedback_modal').setLabel('Feedback schreiben').setStyle(ButtonStyle.Secondary).setEmoji('📝'))
        );
    }
    if (channels.rating) {
        await sendIfNew(channels.rating,
            new EmbedBuilder().setTitle('⭐ Server bewerten').setDescription('Wie gefällt dir **TLS**?\n\nKlicke den Button, um eine Bewertung abzugeben.\n\n> **Deine Bewertung wird öffentlich gepostet.**').setColor(0xFEE75C).setImage(config.bannerUrl).setFooter({ text: 'TLS Service • Bewertungen' }),
            new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_rating_modal').setLabel('Bewerten').setStyle(ButtonStyle.Secondary).setEmoji('⭐'))
        );
    }
    if (channels.rules) {
        await sendIfNew(channels.rules,
            new EmbedBuilder().setTitle('📜 Serverregeln – TLS').setDescription(
                '**§1 – Respekt**\nBeleidigungen und Diskriminierung werden nicht toleriert.\n\n' +
                '**§2 – Spam**\nSpam, Capslock-Missbrauch und Pingen sind verboten.\n\n' +
                '**§3 – Werbung**\nWerbung ohne Genehmigung ist untersagt.\n\n' +
                '**§4 – NSFW**\nPornografische/illegale Inhalte = sofortiger Ban.\n\n' +
                '**§5 – Datenschutz**\nPrivate Infos anderer nicht teilen.\n\n' +
                '**§6 – Team-Anweisungen**\nAnweisungen des Teams befolgen.\n\n' +
                '**§7 – Accounts**\nZweitaccounts = permanenter Ban.\n\n' +
                '> _3 Warns = automatischer Ban._\n\n' +
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                '✅ **Klicke auf "Akzeptieren"**, um zu bestätigen, dass du das Regelwerk gelesen und verstanden hast.'
            ).setColor(0xED4245).setImage(config.bannerUrl).setFooter({ text: 'TLS Service • Stand: Februar 2026' }),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_rules')
                    .setLabel('Akzeptieren')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            )
        );
    }
    if (channels.announce) {
        const msgs = await channels.announce.messages.fetch({ limit: 10 });
        if (!msgs.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title?.includes('Comeback'))) {
            await channels.announce.send({
                content: '@everyone', embeds: [
                    new EmbedBuilder().setTitle('🚀 TLS IST ZURÜCK – DAS GROSSE COMEBACK').setDescription(
                        '**Wir. Sind. Zurück.** 🔥\n\n' +
                        'TLS Service meldet sich offiziell zurück – stärker und professioneller als je zuvor.\n\n' +
                        '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                        '**Was ist TLS?**\nProfessioneller Service für **FiveM Websites** – seit 2025, jetzt 2026 unter neuer Führung.\n\n' +
                        '**👑 Neue Leitung:**\n> 🔹 **Tschuls** – Projektleitung & Strategie\n> 🔹 **Art** – Kreativdirektion & Design\n\n' +
                        '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                        '✦ Premium FiveM Webdesign\n✦ Individuelle Lösungen\n✦ Neue Projekte, neue Standards\n\n' +
                        '**TLS Service – Since 2025. Reborn 2026.** ❤️'
                    ).setColor(0x5865F2).setImage(config.bannerUrl).setFooter({ text: 'TLS Service • Comeback 2026' }).setTimestamp()
                ]
            });
            console.log('  📢 Comeback-Announcement gesendet!');
        }
    }

    // ── Portfolio Channel ──
    if (channels.portfolio) {
        await sendIfNew(channels.portfolio,
            new EmbedBuilder()
                .setTitle('🎨 TLS Service – Portfolio')
                .setDescription(
                    '**Professionelle Dienstleistungen für FiveM & Discord**\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '🌐 **Premium FiveM Webdesign**\n' +
                    '> Moderne, responsive Websites mit Glassmorphism, Animationen und individuellem Design – maßgeschneidert für deinen Server.\n\n' +
                    '🤖 **Discord Bot Entwicklung**\n' +
                    '> Vollständig anpassbare Discord Bots mit Ticket-System, Moderation, Verifizierung, Feedback und mehr.\n\n' +
                    '⚙️ **Custom Scripting**\n' +
                    '> Individuelle FiveM Scripts und Systeme – von der Idee bis zur fertigen Lösung.\n\n' +
                    '🎨 **Branding & Design**\n' +
                    '> Logos, Banner, Server-Icons und komplette visuelle Identitäten für deinen FiveM-Server.\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '💎 **Warum TLS Service?**\n' +
                    '✦ Premium Qualität – keine Standard-Templates\n' +
                    '✦ Individuelle Lösungen nach deinen Wünschen\n' +
                    '✦ Schnelle Lieferung & professioneller Support\n' +
                    '✦ Faire Preise für höchste Qualität\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                    '📩 **Interesse?** Erstelle ein Ticket im <#' + (channels.ticket?.id || 'ticket-channel') + '> Kanal!'
                )
                .setColor(0x5865F2)
                .setImage(config.bannerUrl)
                .setFooter({ text: '© 2026 TLS Service • Since 2025. Reborn 2026.' })
                .setTimestamp()
        );

        // Send a second embed as a visual showcase card
        const msgs = await channels.portfolio.messages.fetch({ limit: 10 });
        const hasShowcase = msgs.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title?.includes('Referenzen'));
        if (!hasShowcase) {
            await channels.portfolio.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📂 Referenzen & Projekte')
                        .setDescription(
                            '**Bisherige Arbeiten von TLS Service:**\n\n' +
                            '🔹 **Nordi City RP** – Premium Website mit Hero-Section, Features, Team-Bereich und dynamischen Animationen\n\n' +
                            '🔹 **TLS Roleplay** – Vollständige FiveM Website mit Custom Cursor, Glassmorphism und professionellem Branding\n\n' +
                            '🔹 **Discord Bot Suite** – Kompletter Bot mit Ticket-System, Moderation, Auto-Mod, Feedback, Bewertungen und Verifizierung\n\n' +
                            '🔹 **Custom Server Setups** – Komplette Discord Server mit Channels, Rollen, eingebetteten Systemen und Branding\n\n' +
                            '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
                            '> _Jedes Projekt wird individuell und mit höchstem Anspruch umgesetzt._'
                        )
                        .setColor(0x57F287)
                        .setFooter({ text: '© 2026 TLS Service | Alle Rechte vorbehalten' })
                        .setTimestamp()
                ]
            });
        }
    }

    console.log('✅ Setup abgeschlossen!');
}

// ── Ready ──
client.once('ready', async () => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ✅ Online: ${client.user.tag}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    for (const [, guild] of client.guilds.cache) await setupServer(guild);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('  Commands: !help');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

client.on('guildMemberAdd', async member => {
    const role = member.guild.roles.cache.find(r => r.name === config.roles.visitor);
    if (role) await member.roles.add(role).catch(() => { });
});

// ── Messages ──
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const content = message.content.toLowerCase();

    // Bad word filter
    if (BAD_WORDS.some(w => content.includes(w)) && !isMod(message.member)) {
        await message.delete().catch(() => { });
        const wc = addWarn(message.author.id, 'Schimpfwort (auto)', 'Bot');
        const m = await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`⚠️ ${message.author}, Nachricht entfernt. **Warn ${wc}/3**`).setColor(0xFF6600)] });
        setTimeout(() => m.delete().catch(() => { }), 6000);
        await sendModLog(message.guild, new EmbedBuilder().setTitle('🔴 Schimpfwort').addFields({ name: 'User', value: message.author.tag, inline: true }, { name: 'Warns', value: `${wc}/3`, inline: true }).setColor(0xFF0000).setTimestamp());
        if (wc >= 3) { await message.member.ban({ reason: '3 Warns' }).catch(() => { }); warnsMap.delete(message.author.id); }
        return;
    }

    // Anti-spam
    const now = Date.now();
    const ud = (spamMap.get(message.author.id) || []).filter(t => now - t < 5000);
    if (ud.length >= 5 && !isMod(message.member)) {
        await message.member.timeout(60000, 'Spam').catch(() => { });
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`⏱️ ${message.author} – 1 Min Timeout (Spam)`).setColor(0xFFAA00)] });
        spamMap.delete(message.author.id); return;
    }
    ud.push(now); spamMap.set(message.author.id, ud);

    // ── MOD COMMANDS ──
    if (content.startsWith('!warn ') && !content.startsWith('!warns')) {
        if (!isMod(message.member)) return;
        const t = message.mentions.members.first();
        if (!t) return message.reply('❌ `!warn @user Grund`');
        const reason = message.content.split(' ').slice(2).join(' ') || 'Kein Grund';
        const wc = addWarn(t.id, reason, message.author.tag);
        const e = new EmbedBuilder().setTitle('⚠️ Verwarnung').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Mod', value: message.author.tag, inline: true }, { name: 'Warns', value: `${wc}/3`, inline: true }, { name: 'Grund', value: reason }).setColor(0xFF6600).setTimestamp();
        await message.channel.send({ embeds: [e] }); await sendModLog(message.guild, e);
        if (wc >= 3) { await t.ban({ reason: '3 Warns' }).catch(() => { }); warnsMap.delete(t.id); }
    }
    if (content.startsWith('!warns')) {
        if (!isMod(message.member)) return;
        const t = message.mentions.users.first(); if (!t) return message.reply('❌ `!warns @user`');
        const w = warnsMap.get(t.id) || [];
        if (!w.length) return message.reply(`✅ ${t.tag} hat keine Warns.`);
        await message.channel.send({ embeds: [new EmbedBuilder().setTitle(`📋 Warns – ${t.tag}`).setDescription(w.map((x, i) => `**${i + 1}.** ${x.reason} _– ${x.moderator}_`).join('\n')).setColor(0xFF6600).setFooter({ text: `${w.length}/3` })] });
    }
    if (content.startsWith('!ban')) {
        if (!isMod(message.member)) return;
        const t = message.mentions.members.first(); if (!t) return message.reply('❌ `!ban @user Grund`');
        if (!t.bannable) return message.reply('❌ Kann nicht gebannt werden.');
        const reason = message.content.split(' ').slice(2).join(' ') || 'Kein Grund';
        await t.ban({ reason }); const e = new EmbedBuilder().setTitle('🔨 Gebannt').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Mod', value: message.author.tag, inline: true }, { name: 'Grund', value: reason }).setColor(0xFF0000).setTimestamp();
        await message.channel.send({ embeds: [e] }); await sendModLog(message.guild, e);
    }
    if (content.startsWith('!kick')) {
        if (!isMod(message.member)) return;
        const t = message.mentions.members.first(); if (!t) return message.reply('❌ `!kick @user Grund`');
        if (!t.kickable) return message.reply('❌ Kann nicht gekickt werden.');
        const reason = message.content.split(' ').slice(2).join(' ') || 'Kein Grund';
        await t.kick(reason); const e = new EmbedBuilder().setTitle('👢 Gekickt').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Mod', value: message.author.tag, inline: true }, { name: 'Grund', value: reason }).setColor(0xFFA500).setTimestamp();
        await message.channel.send({ embeds: [e] }); await sendModLog(message.guild, e);
    }
    if (content.startsWith('!clear')) {
        if (!isMod(message.member)) return;
        const n = parseInt(message.content.split(' ')[1]); if (isNaN(n) || n < 1 || n > 99) return message.reply('❌ `!clear 1-99`');
        const d = await message.channel.bulkDelete(n + 1, true);
        const m = await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`🗑️ ${d.size - 1} Nachrichten gelöscht`).setColor(0x5865F2)] });
        setTimeout(() => m.delete().catch(() => { }), 4000);
    }
    if (content.startsWith('!mute')) {
        if (!isMod(message.member)) return;
        const t = message.mentions.members.first(); if (!t) return message.reply('❌ `!mute @user [Minuten]`');
        const mins = parseInt(message.content.split(' ')[2]) || 10;
        await t.timeout(mins * 60000, `Mute`).catch(e => message.reply(`❌ ${e.message}`));
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`🔇 ${t.user.tag} – ${mins} Min Mute`).setColor(0xFFAA00)] });
    }
    if (content.startsWith('!unmute')) {
        if (!isMod(message.member)) return;
        const t = message.mentions.members.first(); if (!t) return message.reply('❌ `!unmute @user`');
        await t.timeout(null).catch(() => { });
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`🔊 ${t.user.tag} entmutet.`).setColor(0x57F287)] });
    }
    if (content.startsWith('!userinfo')) {
        const t = message.mentions.users.first() || message.author;
        const m = await message.guild.members.fetch(t.id).catch(() => null);
        await message.channel.send({
            embeds: [new EmbedBuilder().setTitle(`👤 ${t.tag}`).setThumbnail(t.displayAvatarURL({ size: 256 })).addFields(
                { name: 'ID', value: t.id, inline: true },
                { name: 'Beigetreten', value: m ? `<t:${Math.floor(m.joinedTimestamp / 1000)}:R>` : '?', inline: true },
                { name: 'Erstellt', value: `<t:${Math.floor(t.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Rollen', value: m ? m.roles.cache.filter(r => r.name !== '@everyone').map(r => `${r}`).join(', ') || 'Keine' : '?' },
                { name: 'Warns', value: `${(warnsMap.get(t.id) || []).length}/3`, inline: true }
            ).setColor(0x5865F2).setTimestamp()]
        });
    }
    if (content === '!serverinfo') {
        const g = message.guild;
        await message.channel.send({
            embeds: [new EmbedBuilder().setTitle(`📊 ${g.name}`).setThumbnail(g.iconURL({ size: 256 })).addFields(
                { name: 'Mitglieder', value: `${g.memberCount}`, inline: true },
                { name: 'Channels', value: `${g.channels.cache.size}`, inline: true },
                { name: 'Rollen', value: `${g.roles.cache.size}`, inline: true },
                { name: 'Erstellt', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
                { name: 'Boost', value: `Level ${g.premiumTier}`, inline: true }
            ).setColor(0x5865F2).setTimestamp()]
        });
    }

    // ── OWNER-ONLY ADMIN COMMANDS ──
    if (content.startsWith('!addrole')) {
        if (!isOwner(message.member)) return message.reply('❌ Nur Owner.');
        const t = message.mentions.members.first();
        const roleName = message.content.split(' ').slice(2).join(' ');
        if (!t || !roleName) return message.reply('❌ `!addrole @user Rollenname`');
        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) return message.reply(`❌ Rolle "${roleName}" nicht gefunden.`);
        await t.roles.add(role).catch(e => message.reply(`❌ ${e.message}`));
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`✅ ${t.user.tag} hat jetzt die Rolle **${role.name}**`).setColor(0x57F287)] });
        await sendModLog(message.guild, new EmbedBuilder().setTitle('➕ Rolle hinzugefügt').addFields({ name: 'User', value: t.user.tag, inline: true }, { name: 'Rolle', value: role.name, inline: true }, { name: 'Von', value: message.author.tag, inline: true }).setColor(0x57F287).setTimestamp());
    }
    if (content.startsWith('!removerole')) {
        if (!isOwner(message.member)) return message.reply('❌ Nur Owner.');
        const t = message.mentions.members.first();
        const roleName = message.content.split(' ').slice(2).join(' ');
        if (!t || !roleName) return message.reply('❌ `!removerole @user Rollenname`');
        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) return message.reply(`❌ Rolle "${roleName}" nicht gefunden.`);
        await t.roles.remove(role).catch(e => message.reply(`❌ ${e.message}`));
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`✅ ${t.user.tag} – Rolle **${role.name}** entfernt`).setColor(0xED4245)] });
    }
    if (content.startsWith('!announce')) {
        if (!isOwner(message.member)) return message.reply('❌ Nur Owner.');
        const text = message.content.substring(10).trim();
        if (!text) return message.reply('❌ `!announce Dein Text hier`');
        const ch = message.guild.channels.cache.find(c => c.name === '📢・ankündigungen');
        if (!ch) return message.reply('❌ Ankündigungskanal nicht gefunden.');
        await ch.send({ content: '@everyone', embeds: [new EmbedBuilder().setTitle('📢 Ankündigung').setDescription(text).setColor(0x5865F2).setTimestamp().setFooter({ text: `von ${message.author.tag}` })] });
        await message.reply('✅ Ankündigung gesendet!');
    }
    if (content.startsWith('!setslowmode')) {
        if (!isOwner(message.member)) return message.reply('❌ Nur Owner.');
        const secs = parseInt(message.content.split(' ')[1]);
        if (isNaN(secs)) return message.reply('❌ `!setslowmode [Sekunden]`');
        await message.channel.setRateLimitPerUser(secs);
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`🐌 Slowmode: **${secs}s**`).setColor(0x5865F2)] });
    }
    if (content.startsWith('!lock')) {
        if (!isOwner(message.member)) return message.reply('❌ Nur Owner.');
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription('🔒 Channel gesperrt.').setColor(0xED4245)] });
    }
    if (content.startsWith('!unlock')) {
        if (!isOwner(message.member)) return message.reply('❌ Nur Owner.');
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
        await message.channel.send({ embeds: [new EmbedBuilder().setDescription('🔓 Channel entsperrt.').setColor(0x57F287)] });
    }
    if (content.startsWith('!nuke')) {
        if (!isOwner(message.member)) return message.reply('❌ Nur Owner.');
        const clone = await message.channel.clone();
        await message.channel.delete();
        await clone.send({ embeds: [new EmbedBuilder().setDescription('💥 Channel wurde zurückgesetzt.').setColor(0xED4245)] });
    }

    if (content === '!help') {
        await message.channel.send({
            embeds: [new EmbedBuilder().setTitle('📖 TLS Bot – Commands').setDescription(
                '**🛡️ Moderation:**\n`!warn` `!warns` `!ban` `!kick` `!mute` `!unmute` `!clear`\n\n' +
                '**ℹ️ Info:**\n`!userinfo` `!serverinfo` `!help`\n\n' +
                '**👑 Owner-Only:**\n`!addrole @user Rolle` – Rolle geben\n`!removerole @user Rolle` – Rolle entfernen\n`!announce Text` – Ankündigung senden\n`!setslowmode Sek` – Slowmode setzen\n`!lock` / `!unlock` – Channel sperren\n`!nuke` – Channel zurücksetzen\n\n' +
                '**⚙️ Automatisch:**\n• Schimpfwörter-Filter\n• Anti-Spam\n• 3 Warns = Auto-Ban'
            ).setColor(0x5865F2).setFooter({ text: 'TLS Service' })]
        });
    }
    if (content === '!pay' && isMod(message.member)) {
        await message.channel.send({ embeds: [new EmbedBuilder().setTitle('💳 PayPal').addFields({ name: 'Link', value: 'https://paypal.me/JulesChaos7669' }).setColor(0x003366)] });
    }
});

// ── Interactions ──
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isButton()) {
            if (interaction.customId === 'verify_user') {
                const vr = interaction.guild.roles.cache.find(r => r.name === config.roles.verified);
                const vis = interaction.guild.roles.cache.find(r => r.name === config.roles.visitor);
                if (vr) { await interaction.member.roles.add(vr).catch(() => { }); if (vis) await interaction.member.roles.remove(vis).catch(() => { }); await interaction.reply({ content: '✅ Verifiziert!', ephemeral: true }); }
                else await interaction.reply({ content: '❌ Fehler.', ephemeral: true });
            }
            if (interaction.customId === 'create_ticket') {
                const name = `ticket-${interaction.user.username}`.toLowerCase();
                if (interaction.guild.channels.cache.find(c => c.name === name)) return interaction.reply({ content: '❌ Du hast bereits ein Ticket.', ephemeral: true });
                const modRole = interaction.guild.roles.cache.find(r => r.name === config.roles.moderator);
                const supportCat = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('SUPPORT'));
                const perms = [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ];
                if (modRole) perms.push({ id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
                if (interaction.guild.members.me) perms.push({ id: interaction.guild.members.me.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
                const ch = await interaction.guild.channels.create({ name, type: ChannelType.GuildText, parent: supportCat?.id || null, permissionOverwrites: perms });
                await ch.send({ content: `${interaction.user}`, embeds: [new EmbedBuilder().setTitle(`🎫 ${interaction.user.username}`).setDescription('Ein Mod wird sich melden.\n\n**Beschreibe dein Anliegen:**').setColor(0x5865F2).setTimestamp()], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒'), new ButtonBuilder().setCustomId('claim_ticket').setLabel('Übernehmen').setStyle(ButtonStyle.Success).setEmoji('✋'))] });
                await interaction.reply({ content: `✅ Ticket: ${ch}`, ephemeral: true });
            }
            if (interaction.customId === 'close_ticket') { await interaction.reply('🔒 Wird geschlossen...'); setTimeout(() => interaction.channel.delete().catch(() => { }), 3000); }
            if (interaction.customId === 'claim_ticket') {
                if (isMod(interaction.member)) { await interaction.channel.setName(`claimed-${interaction.user.username}`); await interaction.reply({ embeds: [new EmbedBuilder().setDescription(`✅ Übernommen von ${interaction.user}`).setColor(0x57F287)] }); }
                else await interaction.reply({ content: '❌ Nur Mods.', ephemeral: true });
            }
            if (interaction.customId === 'accept_rules') {
                const role = interaction.guild.roles.cache.find(r => r.name === config.roles.rulesAccepted);
                if (!role) {
                    return interaction.reply({ content: '❌ Rolle "Regelwerk Akzeptiert" nicht gefunden. Bitte erstelle diese Rolle zuerst.', ephemeral: true });
                }
                if (interaction.member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: '✅ Du hast das Regelwerk bereits akzeptiert!', ephemeral: true });
                }
                await interaction.member.roles.add(role).catch(() => { });
                await interaction.reply({ content: '✅ **Regelwerk akzeptiert!** Du hast bestätigt, dass du die Regeln gelesen und verstanden hast. Viel Spaß auf dem Server!', ephemeral: true });
                await sendModLog(interaction.guild, new EmbedBuilder()
                    .setTitle('📜 Regelwerk akzeptiert')
                    .addFields(
                        { name: 'User', value: interaction.user.tag, inline: true },
                        { name: 'ID', value: interaction.user.id, inline: true }
                    )
                    .setColor(0x57F287)
                    .setTimestamp()
                );
            }
            if (interaction.customId === 'open_rating_modal') {
                const modal = new ModalBuilder().setCustomId('rating_modal').setTitle('⭐ Bewertung');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rt_stars').setLabel('Sterne (1-5)').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rt_text').setLabel('Deine Bewertung').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                await interaction.showModal(modal);
            }
            if (interaction.customId === 'open_feedback_modal') {
                const modal = new ModalBuilder().setCustomId('feedback_modal').setTitle('📝 Feedback');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fb_cat').setLabel('Kategorie (Lob/Kritik/Vorschlag/Bug)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fb_stars').setLabel('Bewertung (1-5)').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fb_text').setLabel('Dein Feedback').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                await interaction.showModal(modal);
            }
        }
        if (interaction.isModalSubmit() && interaction.customId === 'rating_modal') {
            const stars = parseInt(interaction.fields.getTextInputValue('rt_stars'));
            const text = interaction.fields.getTextInputValue('rt_text');
            if (isNaN(stars) || stars < 1 || stars > 5) return interaction.reply({ content: '❌ 1-5!', ephemeral: true });
            const embed = new EmbedBuilder().setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }).setTitle('⭐ Bewertung').addFields({ name: 'Rating', value: `${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)} (${stars}/5)`, inline: true }, { name: 'Review', value: text }).setColor(0xFEE75C).setTimestamp();
            const ch = interaction.guild.channels.cache.find(c => c.name === '⭐・bewertungen');
            if (ch) await ch.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ Danke!', ephemeral: true });
        }
        if (interaction.isModalSubmit() && interaction.customId === 'feedback_modal') {
            const cat = interaction.fields.getTextInputValue('fb_cat');
            const stars = parseInt(interaction.fields.getTextInputValue('fb_stars'));
            const text = interaction.fields.getTextInputValue('fb_text');
            if (isNaN(stars) || stars < 1 || stars > 5) return interaction.reply({ content: '❌ 1-5!', ephemeral: true });
            let color = 0x5865F2;
            if (cat.toLowerCase().includes('lob')) color = 0x57F287;
            else if (cat.toLowerCase().includes('kritik')) color = 0xFF6600;
            else if (cat.toLowerCase().includes('bug')) color = 0xED4245;
            const embed = new EmbedBuilder().setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() }).setTitle(`📝 ${cat}`).addFields({ name: 'Bewertung', value: `${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)} (${stars}/5)`, inline: true }, { name: 'Feedback', value: text }).setColor(color).setTimestamp();
            const ch = interaction.guild.channels.cache.find(c => c.name === '📝・feedback');
            if (ch) await ch.send({ embeds: [embed] });
            await sendModLog(interaction.guild, embed);
            await interaction.reply({ content: '✅ Danke!', ephemeral: true });
        }
    } catch (err) {
        console.error('Error:', err);
        try { if (!interaction.replied) await interaction.reply({ content: '❌ Fehler.', ephemeral: true }); } catch (e) { }
    }
});

client.login(process.env.DISCORD_TOKEN);
