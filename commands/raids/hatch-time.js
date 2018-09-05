"use strict";

const log = require('loglevel').getLogger('HatchTimeCommand'),
  Commando = require('discord.js-commando'),
  {CommandGroup, TimeParameter} = require('../../app/constants'),
  Helper = require('../../app/helper'),
  PartyManager = require('../../app/party-manager'),
  settings = require('../../data/settings');

class HatchTimeCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'hatch',
      group: CommandGroup.RAID_CRUD,
      memberName: 'hatch',
      aliases: ['hatch-time', 'hatches', 'hatching'],
      description: 'Sets the time an existing raid hatches.',
      details: 'Use this command to set the hatch time for a raid.',
      examples: ['\t!hatch 1:45', '\t!hatch-time 50', '\t!hatches at 9:45'],
      args: [
        {
          key: TimeParameter.HATCH,
          label: 'hatch time',
          prompt: 'How much time is remaining (in minutes) until the raid hatches?\nExample: `43`\n\n*or*\n\nWhen does this raid hatch?\nExample: `6:12`\n',
          type: 'time'
        }
      ],
      argsPromptLimit: 3,
      guildOnly: true
    });

    client.dispatcher.addInhibitor(message => {
      if (!!message.command && message.command.name === 'hatch' &&
        !PartyManager.validParty(message.channel.id)) {
        return ['invalid-channel', message.reply('Set the hatch time for a raid from its raid channel!')];
      }
      return false;
    });
  }

  async run(message, args) {
    const time = args[TimeParameter.HATCH],
      raid = PartyManager.getParty(message.channel.id),
      info = await raid.setRaidHatchTime(time);

    message.react(Helper.getEmoji(settings.emoji.thumbsUp) || '👍')
      .catch(err => log.error(err));

    raid.refreshStatusMessages();
  }
}

module.exports = HatchTimeCommand;
