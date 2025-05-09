// This isn't the configuration file! Check for config.json in the root directory. (../config.json)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { compareObjects, createJsonFile, mergeObjects, parseJsonFile, shutDown, log } from "./util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "..", "config.json"); // ../config.json

const defaultConfig = {
    bot: {
        token: "BOT_TOKEN",
    },
    crafty: {
        api_token: "CRAFTY_TOKEN",
        server_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        url: "https://localhost:8000/"
    },
    commands: {
        slash: {
            enabled: true,
        },
        text: {
            enabled: false,
            prefix: "!"
        }
    },
    auto_stop: {
        enabled: true,
        // times are in minutes
        check_interval: 2,
        empty_wait_time: 30
    },
    stop_command: {
        enabled: false,
    }
};

let configFromFile;
export { configFromFile as config };

async function updateConfig(filePath, updatedConfig) {
    const existingConfig = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return mergeObjects(existingConfig, updatedConfig);
}

export async function checkConfigFile() {
    try {
        if (configFromFile) {
            console.debug("Config already checked.");
            return configFromFile;
        }

        if (!fs.existsSync(configPath)) {
            log("No config file found, generating in working directory.")
            await createJsonFile(configPath, defaultConfig);
            log(`Configuration file can be found at ${configPath}\nPlease add Bot token, Crafty token, server URL, and server id to the file before restarting the bot.`);
            shutDown();
        }

        configFromFile = await parseJsonFile(configPath);

        if (!compareObjects(configFromFile, defaultConfig)){
            log("Outdated config.json detected - updating...");
            const updatedConfig = await updateConfig(configPath, defaultConfig);
            await createJsonFile(configPath, updatedConfig); // Overwrites existing file.
            configFromFile = updatedConfig;
        }

        return configFromFile;

    } catch (error) {
        console.error("Error checking config file:", error);
    }
}
