import axios from "axios";

import { config } from "../config.js";
import { stopOptions } from "./client.js";
import { getStats } from "./get_stats.js";
import { dateTimeToMilliseconds, minutesToMilliseconds, startInterval, stopInterval, log } from "../util.js";

const waitTime = minutesToMilliseconds(config.auto_stop.empty_wait_time);
const checkInterval = config.auto_stop.check_interval;

let checkedLastLogout = false;
let timeSinceLastLogout = null;

export function setAutoStopInterval() {
    startInterval(autoStop, minutesToMilliseconds(checkInterval), "autoStopInterval");
}

export async function serverStop() {
    log("Stopping server...");

    const stopResponse = await axios(stopOptions); // Call API to stop server.

    if (stopResponse.data.status !== "ok") {
        console.error("Failed - Unexpected response:", stopResponse.data);
        return ("Unexpected result - Failed to stop server!\n" + JSON.stringify(stopResponse.data));
    }

    log("Success!");
    return "Successfully sent request, the server will be offline soon!";
}

export async function autoStop() {
    const stats = await getStats(); // Moved here to make sure stats are correctly read
    let playerCount = stats.playersOnline || 0;
    //log("Player Count at Start " + playerCount); // DEBUG
    try {

        if (!stats.running) {
            return; // Exit early if the server is not running.
        }
        
        //log(stats.playersOnline + " From stats"); // DEBUG
        //log(playerCount + " Player Count"); // DEBUG
        //log("Server is online"); // DEBUG
        
        if (stats.playersOnline > 0) {
            //log(stats.playersOnline + " A"); // DEBUG
            //log(playerCount + " Player Count A"); // DEBUG
            checkedLastLogout = false;
            timeSinceLastLogout = null;
            return; // Reset last logout tracking and exit early if players are online.
        }

        // The following only runs if the server is online, and there are no players online.
        const currentTime = Date.now();
        //log(stats.playersOnline + " B"); //DEBUG
        //log(playerCount + " Player Count B"); // DEBUG
        //log("No player detected"); // DEBUG
        if (!checkedLastLogout) {
            timeSinceLastLogout = currentTime;
            checkedLastLogout = true;
        }

        const serverRunningTime = currentTime - dateTimeToMilliseconds(stats.startTime);
        const timeSinceLastLogoutElapsed = currentTime - timeSinceLastLogout;

        if (stats.waitingStart || serverRunningTime < waitTime || timeSinceLastLogoutElapsed < waitTime) {
            return;
        }

        log("Stopping server due to lack of activity...");

        await serverStop();

        stopInterval("autoStopInterval");
        
        checkedLastLogout = false;
        timeSinceLastLogout = null;

    } catch (error) {
        console.error("Error making one or both requests:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
            console.error("Response headers:", error.response.headers);
        }
    }
}
