"use strict";

const log = require('loglevel').getLogger('GymNotificationsCommand'),
  Commando = require('discord.js-commando'),
  {CommandGroup} = require('../../app/constants'),
  {MessageEmbed} = require('discord.js'),
  Gym = require('../../app/gym'),
  Helper = require('../../app/helper'),
  Notify = require('../../app/notify');

class GymNotificationsCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'targets',
      group: CommandGroup.NOTIFICATIONS,
      memberName: 'targets',
      aliases: ['faves', 'favorites'],
      description: 'Shows currently active notifications for gyms.',
      details: 'Use this command to get your currently active gym notifications.',
      examples: ['\t!targets'],
      guildOnly: true
    });

    client.dispatcher.addInhibitor(message => {
      if (!!message.command && message.command.name === 'targets' && !Helper.isBotChannel(message)) {
        return ['invalid-channel', message.reply(Helper.getText('favorites.warning', message))];
      }
      return false;
    });
  }

  async run(message, args) {
    return Notify.getGymNotifications(message.member)
      .then(async results => {
        const embed = new MessageEmbed();
        embed.setTitle('Currently assigned gym notifications:');
        embed.setColor(4437377);

        const regionGymList = Gym.filterRegions(results);

        if (regionGymList.length > 0) {
          regionGymList
            .forEach(([region, gyms]) => {
              embed.addField(`#${region}`, gyms
                .map(gymId => Gym.getGym(gymId))
                .map(gym => !!gym.nickname ?
                  gym.nickname :
                  gym.gymName)
                .sort()
                .join('\n'));
            });
        } else {
          embed.setDescription('<None>');
        }

        const messages = [];
        try {
          messages.push(await message.direct({embed}));
          messages.push(await message.reply('Sent you a DM with current gym notifications.'));
        } catch (err) {
          messages.push(await message.reply('Unable to send you the notifications list DM. You probably have DMs disabled.'));
        }
        return messages;
      })
      .catch(err => log.error(err));
  }
}

module.exports = GymNotificationsCommand;
