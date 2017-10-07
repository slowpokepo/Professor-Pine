"use strict";

const log = require('loglevel').getLogger('CheckInCommand'),
	Commando = require('discord.js-commando'),
	NaturalArgumentType = require('../../types/natural'),
	Raid = require('../../app/raid'),
	{RaidStatus} = require('../../app/constants'),
	Utility = require('../../app/utility');

class CheckInCommand extends Commando.Command {
	constructor(client) {
		super(client, {
			name: 'here',
			group: 'basic-raid',
			memberName: 'here',
			aliases: ['arrive', 'arrived', 'present', 'check-in'],
			description: 'Lets others know you have arrived at an active raid.',
			details: 'Use this command to tell everyone you are at the raid location and to ensure that no one is left behind.',
			examples: ['\t!here +1', '\t!arrived', '\t!present'],
			args: [
				{
					key: 'additional_attendees',
					label: 'additional attendees',
					prompt: 'How many additional people are here with you?\nExample: `+1`\n\n*or*\n\nHow many people are here (including yourself)?\nExample: `2`\n',
					type: 'natural',
					default: NaturalArgumentType.UNDEFINED_NUMBER
				}
			],
			argsPromptLimit: 3,
			guildOnly: true
		});

		client.dispatcher.addInhibitor(message => {
			if (!!message.command && message.command.name === 'here' &&
				!Raid.validRaid(message.channel.id)) {
				return ['invalid-channel', message.reply('Check into a raid from its raid channel!')];
			}
			return false;
		});
	}

	async run(message, args) {
		const additional_attendees = args['additional_attendees'],
			info = Raid.setMemberStatus(message.channel.id, message.member.id, RaidStatus.PRESENT, additional_attendees);

		message.react('👍')
			.catch(err => log.error(err));

		Utility.cleanConversation(message);

		Raid.refreshStatusMessages(info.raid);
	}
}

module.exports = CheckInCommand;
