"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAppleTeam = formatAppleTeam;
function formatAppleTeam({ appleTeamIdentifier, appleTeamName, }) {
    return `Team ID: ${appleTeamIdentifier}${appleTeamName ? `, Team name: ${appleTeamName}` : ''}`;
}
