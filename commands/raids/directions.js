"use strict";

const log = require('loglevel').getLogger('DirectionsCommand'),
  Commando = require('discord.js-commando'),
  {CommandGroup} = require('../../app/constants'),
  {MessageEmbed} = require('discord.js'),
  Gym = require('../../app/gym'),
  PartyManager = require('../../app/party-manager');

class DirectionsCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'where',
      group: CommandGroup.BASIC_RAID,
      memberName: 'where',
      aliases: ['directions'],
      description: 'Requests an image of the gym\'s location and a link for directions to get there.',
      details: 'Use this command get directions to the raid\'s location.',
      examples: ['\t!where', '\t!directions'],
      guildOnly: true
    });

    client.dispatcher.addInhibitor(message => {
      if (!!message.command && message.command.name === 'where' &&
        !PartyManager.validParty(message.channel.id)) {
        return ['invalid-channel', message.reply('Ask for directions to a raid from its raid channel!')];
      }
      return false;
    });
  }

  async run(message, args) {
    const raid = PartyManager.getParty(message.channel.id),
      gymId = raid.gymId,
      gym = Gym.getGym(gymId),
      embed = new MessageEmbed();

    embed.setColor('GREEN');
    embed.setImage(`attachment://${gymId}.png`);

    message.channel
      .send(`https://www.google.com/maps/search/?api=1&query=${gym.gymInfo.latitude}%2C${gym.gymInfo.longitude}`, {
        files: [
          require.resolve(`PgP-Data/data/images/${gymId}.png`)
        ],
        embed
      })
      .catch(err => log.error(err));
  }
}

module.exports = DirectionsCommand;
