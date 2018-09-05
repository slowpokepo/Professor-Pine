"use strict";

const Commando = require('discord.js-commando');

let PartyManager;

process.nextTick(() => PartyManager = require('../app/party-manager'));

class NaturalArgumentType extends Commando.ArgumentType {
  constructor(client) {
    super(client, 'natural');
  }

  validate(value, message, arg) {
    const groupIds = PartyManager.getParty(message.channel.id).groups
        .map(group => group.id),
      groupId = value.trim().toUpperCase(),
      validGroup = groupIds.includes(groupId) || groupId === 'A',
      int = Number.parseInt(value);

    if (validGroup) {
      return `To join a group, type \`cancel\` and use the \`${message.client.commandPrefix}group\` command!\n\n${arg.prompt}`;
    }

    if (!Number.isNaN(int) && int > 0) {
      return true;
    }

    return `Please enter a number greater than zero!\n\n${arg.prompt}`;
  }

  parse(value, message, arg) {
    const int = Number.parseInt(value);

    return !!value.match(/^\+\d+/) ?
      int :
      int - 1;
  }

  static get UNDEFINED_NUMBER() {
    return "undefined";
  }
}

module.exports = NaturalArgumentType;
