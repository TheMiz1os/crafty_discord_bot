import { ActivityType, Events } from "discord.js";

import { checkConfigFile, config } from "./config.js";
import { type } from "os";
await checkConfigFile();
// Import and run checkConfigFile() before all other imports to set config variable.
// If this isn't done, it will crash.

const { discordClient } = await import("./api/client.js");
const { serverStart } = await import("./api/start_server.js");
const { getStats } = await import("./api/get_stats.js");
const { setAutoStopInterval } = await import("./api/stop_server.js");
const { isIntervalRunning, log } = await import("./util.js");
const { getCommands } = await import("./commands/command_handler.js");
const { help } = await import("./commands/functions/help_response.js");
await import("./commands/deploy_commands.js"); // Deploys commands to Discord API.

let stats = await getStats(); // Tests if the api connection is working (+ other uses)

discordClient.commands = await getCommands();

if (stats.running && !isIntervalRunning("autoStopInterval")) {
    setAutoStopInterval();
    console.debug("Restored existing or missing interval.");
}

async function isServerOnline() {
    try {
        let stats = await getStats();
        return stats.running === true; // Checks if server is online
    } catch (error) {
        console.error("Error when checking server status :", error.message);
        return false; // If fails, the server is considered offline
    }
}

let lastStatus = {
    name: null,
    type: null
}

async function updateStatus() {
    let serverOnline = await isServerOnline(); // Check if server is online
    let newStatus;

    if (!serverOnline) {
        newStatus = {
            name: "Server offline",
            type: ActivityType.Custom
        }
    } else {
        // Get players number
        let stats = await getStats();
        let playerCount = stats.playersOnline || 0;
        
        if (playerCount == 0 ) { 
            // No Players Online
            newStatus = {
                name: "No players online", 
                type: ActivityType.Custom,
            }; 

        } else if ( playerCount == 1 ) { 
            // 1 Player Online
            newStatus = {
                name: "1 player online", 
                type: ActivityType.Watching,
            };

        } else { 
            // Multiple players online  
            newStatus = {
                name: `${playerCount} players`, 
                type: ActivityType.Watching,
            };
            
        };
    }
   
    //Set activity
    if (newStatus.name !== lastStatus.name || newStatus.type !== lastStatus.type) {
        await discordClient.user.setActivity(newStatus.name, { type: newStatus.type });
        log(`Status Update: ${newStatus.name}`);
        lastStatus = newStatus;
        return;
    } else {
       // log('No status change'); 
    }
}


discordClient.on("ready", async (c) => {
    log(`${c.user.tag} is online!`);

    await updateStatus();
    setInterval(updateStatus, 30000);
});

discordClient.on("messageCreate", async (message) => {
    if (!message.content.startsWith(config.commands.text.prefix) || !config.commands.text.enabled) {
        return; // Exit early if the message doesn't start with the prefix or text commands are disabled.
    }
    // only text commands beyond this point
    const command = message.content.substring(1).toLowerCase();
    if (command === "start") {
        await message.reply(await serverStart());
    } else if (command === "help") {
        await message.reply(help(config.commands.text.prefix));
    }
    else {
        message.reply("Unknown command.");
    }
});


discordClient.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) {
        return;
    }

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
		} else {
			await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
		}
	}
});

discordClient.login(config.bot.token);