"use strict";

const log = require('loglevel').getLogger('ImageProcessor'),
	fs = require('fs'),
	path = require('path'),
	uuidv1 = require('uuid/v1'),
	tesseract = require('tesseract.js'),
	moment = require('moment'),
	Helper = require('../app/helper'),
	Jimp = require('Jimp'),
	GymArgumentType = require('../types/gym'),
	TimeArgumentType = require('../types/time'),
	PokemonArgumentType = require('../types/pokemon'),
	Raid = require('../app/raid'),
	region_map = require('PgP-Data/data/region-map'),
	{ TimeParameter} = require('../app/constants');

// currently being used to store all images locally regardless of what was able to be determined from them
const debug_flag = false;//function checkDebugFlag() { for (let arg of process.argv) { if (arg == '--debug') { return true } } return false; }();

class ImageProcess {
	constructor() {
		this.image_path = '/../assets/processing/';

		if (!fs.existsSync(path.join(__dirname, this.image_path))){
		    fs.mkdirSync(path.join(__dirname, this.image_path));
		}
	}

	process(message, url) {
		// easier test case
		if (message.content == 'ping') {
			message.is_fake = true;
			url = path.join(__dirname, this.image_path, 'image59.png');
		}

		// if not in a proper raid channel, cancel out immediately
		if (!region_map[message.channel.name]) { return; }

		Jimp.read(url).then(image => {
			if (!image) { return; }
			const id = uuidv1();

			// resize to some standard size to help tesseract
			image.scaleToFit(1440, 2560, Jimp.RESIZE_HERMITE);

			return this.getRaidData(id, message, image);
		}).then(data => {
			console.log(data);
			if (data) {
				this.createRaid(message, data);
			}
		}).catch(err => {
			log.warn(err);
		});
	}

	/**
	 * Header can contain black-gray text or white-gray text
	 *		need to turn these areas into extremes and filter out everything else
	 **/
	filterHeaderContent(x, y, idx) {
		const red   = this.bitmap.data[ idx + 0 ];
		const green = this.bitmap.data[ idx + 1 ];
		const blue  = this.bitmap.data[ idx + 2 ];
		const alpha = this.bitmap.data[ idx + 3 ];

		if ((red >= 180 && green >= 190 && blue >= 190) || (red <= 50 && green <= 50 && blue <= 50)) {
			this.bitmap.data[ idx + 0 ] = 255;
			this.bitmap.data[ idx + 1 ] = 255;
			this.bitmap.data[ idx + 2 ] = 255;
		} else {
			this.bitmap.data[ idx + 0 ] = 0;
			this.bitmap.data[ idx + 1 ] = 0;
			this.bitmap.data[ idx + 2 ] = 0;
		}
	}

	/**
	 * Header can contain black-gray text or white-gray text
	 *		need to turn these areas into extremes and filter out everything else
	 **/
	filterHeaderContent2(x, y, idx) {
		const red   = this.bitmap.data[ idx + 0 ];
		const green = this.bitmap.data[ idx + 1 ];
		const blue  = this.bitmap.data[ idx + 2 ];
		const alpha = this.bitmap.data[ idx + 3 ];

		if ((red >= 220 && green >= 220 && blue >= 220) || (red <= 30 && green <= 30 && blue <= 30)) {
			this.bitmap.data[ idx + 0 ] = 255;
			this.bitmap.data[ idx + 1 ] = 255;
			this.bitmap.data[ idx + 2 ] = 255;
		} else {
			this.bitmap.data[ idx + 0 ] = 0;
			this.bitmap.data[ idx + 1 ] = 0;
			this.bitmap.data[ idx + 2 ] = 0;
		}
	}

	/**
	 * Normal body text will always be white-gray text, don't need to be as aggressive here
	 **/
	filterBodyContent(x, y, idx) {
		const red   = this.bitmap.data[ idx + 0 ];
		const green = this.bitmap.data[ idx + 1 ];
		const blue  = this.bitmap.data[ idx + 2 ];
		const alpha = this.bitmap.data[ idx + 3 ];

		if (red >= 180 && green >= 180 && blue >= 180) {
			this.bitmap.data[ idx + 0 ] = 255;
			this.bitmap.data[ idx + 1 ] = 255;
			this.bitmap.data[ idx + 2 ] = 255;
		} else {
			this.bitmap.data[ idx + 0 ] = 0;
			this.bitmap.data[ idx + 1 ] = 0;
			this.bitmap.data[ idx + 2 ] = 0;
		}
	}

	/**
	 * Normal body text will always be white-gray text, don't need to be as aggressive here
	 **/
	filterBodyContent2(x, y, idx) {
		const red   = this.bitmap.data[ idx + 0 ];
		const green = this.bitmap.data[ idx + 1 ];
		const blue  = this.bitmap.data[ idx + 2 ];
		const alpha = this.bitmap.data[ idx + 3 ];

		if (red >= 220 && green >= 220 && blue >= 220) {
			this.bitmap.data[ idx + 0 ] = 255;
			this.bitmap.data[ idx + 1 ] = 255;
			this.bitmap.data[ idx + 2 ] = 255;
		} else {
			this.bitmap.data[ idx + 0 ] = 0;
			this.bitmap.data[ idx + 1 ] = 0;
			this.bitmap.data[ idx + 2 ] = 0;
		}
	}

	/**
	 * Large text such as the pokemon name, cp, or tier information is here and will always be white-gray
	 **/
	filterLargeBodyContent(x, y, idx) {
		const red   = this.bitmap.data[ idx + 0 ];
		const green = this.bitmap.data[ idx + 1 ];
		const blue  = this.bitmap.data[ idx + 2 ];
		const alpha = this.bitmap.data[ idx + 3 ];

		if (red >= 200 && green >= 200 && blue >= 200) {
			this.bitmap.data[ idx + 0 ] = 255;
			this.bitmap.data[ idx + 1 ] = 255;
			this.bitmap.data[ idx + 2 ] = 255;
		} else {
			this.bitmap.data[ idx + 0 ] = 0;
			this.bitmap.data[ idx + 1 ] = 0;
			this.bitmap.data[ idx + 2 ] = 0;
		}
	}

	/**
	 * Mostly for the tier checking....
	 **/
	filterPureWhiteContent(x, y, idx) {
		const red   = this.bitmap.data[ idx + 0 ];
		const green = this.bitmap.data[ idx + 1 ];
		const blue  = this.bitmap.data[ idx + 2 ];
		const alpha = this.bitmap.data[ idx + 3 ];

		if (red >= 240 && green >= 240 && blue >= 240) {
			this.bitmap.data[ idx + 0 ] = 255;
			this.bitmap.data[ idx + 1 ] = 255;
			this.bitmap.data[ idx + 2 ] = 255;
		} else {
			this.bitmap.data[ idx + 0 ] = 0;
			this.bitmap.data[ idx + 1 ] = 0;
			this.bitmap.data[ idx + 2 ] = 0;
		}
	}



	async getPhoneTime(id, message, image, region) {
		let values, phone_time;

		// try different levels of processing to get time
		for (let processing_level=0; processing_level<2; processing_level++) {
			const debug_image_path1 = path.join(__dirname, this.image_path, `${id}1-phone-time-a-${processing_level}.png`);
			const debug_image_path2 = path.join(__dirname, this.image_path, `${id}1-phone-time-b-${processing_level}.png`);

			values = await this.getOCRPhoneTime(id, message, image, region, processing_level);
			phone_time = values.text;

			if (phone_time) {
				// Determine of AM or PM time
				if (phone_time.search(/(a|p)m/gi) >= 0) {
					phone_time = moment(phone_time, 'hh:mma');
				} else {
					// figure out if time should be AM or PM
					const now = moment();
					const time_am = moment(phone_time + 'am', 'hh:mma');
					const time_pm = moment(phone_time + 'pm', 'hh:mma');
					const times = [ time_am.diff(now), time_pm.diff(now) ];

					// whatever time is closer to current time (less diff), use that
					if (Math.abs(times[0]) < Math.abs(times[1])) {
						phone_time = time_am;
					} else {
						phone_time = time_pm;
					}
				}
			}

			// something has gone wrong if no info was matched, save image for later analysis
			if (debug_flag || log.getLevel() === log.levels.DEBUG) {
				values.image1.write(debug_image_path1);
				values.image2.write(debug_image_path2);
			}

			// don't jump up to next level of processing if a time has been found
			if (phone_time && phone_time.isValid()) {
				break;
			}
		}

		// NOTE:  There is a chance that the time is not valid, but when that's the case
		//			I think we should just leave the time unset, rather than guessing that the time is now.
		//			Don't want to confuse people with slightly incorrect times.
		return { phone_time };
	}

	getOCRPhoneTime(id, message, image, region, level=0) {
		return new Promise((resolve, reject) => {
			let width;

			if (level === 0) {
				width = region.width / 4.9;
			} else {
				width = region.width / 4;
			}

			// checking left and right sides of image for time...
			const region1 = { x: (region.width - width) / 2, y: region.y, width, height: region.height };
			const region2 = { x: region.width - width, y: region.y, width, height: region.height };

			let promises = [];

			promises.push(new Promise((resolve, reject) => {
				let new_image = image.clone().crop(region1.x, region1.y, region1.width, region1.height);

				// basic level 0 processing by default
				if (level === 0) {
					new_image = new_image.scan(0, 0, region1.width, region1.height, this.filterHeaderContent).blur(1);
				} else {
					new_image = new_image.blur(1).scan(0, 0, region1.width, region1.height, this.filterHeaderContent2).blur(1);
				}

				new_image = new_image.getBuffer(Jimp.MIME_PNG, (err, image) => {
					if (err) { reject(err); }

					tesseract.recognize(image)
						.catch(err => reject(err))
						.then(result => {
							// basically strip out everything except spaces and colons, then match any typical time values
							const match = result.text.replace(/[^\w\s:]/g, '').replace(/o|O/g, 0).match(/([0-9]{1,2}:[0-9]{1,2}){1}\s?(a|p)?m?/gi);
							if (match && match.length) {
								resolve({ image: new_image, text: match[0], result });
							} else {
								resolve({ image: new_image, result });
							}
						});
				});
			}));

			promises.push(new Promise((resolve, reject) => {
				let new_image = image.clone().crop(region2.x, region2.y, region2.width, region2.height)

				// basic level 0 processing by default
				if (level === 0) {
					new_image = new_image.scan(0, 0, region1.width, region1.height, this.filterHeaderContent).blur(1);
				} else {
					new_image = new_image.blur(1).scan(0, 0, region1.width, region1.height, this.filterHeaderContent2).blur(1);
				}

				new_image = new_image.getBuffer(Jimp.MIME_PNG, (err, image) => {
					if (err) { reject(err); }

					tesseract.recognize(image)
						.catch(err => reject(err))
						.then(result => {
							// basically strip out everything except spaces and colons, then match any typical time values
							const match = result.text.replace(/[^\w\s:]/g, '').replace(/o|O/g, 0).match(/([0-9]{1,2}:[0-9]{1,2}){1}\s?(a|p)?m?/gi);
							if (match && match.length) {
								resolve({ image: new_image, text: match[0], result });
							} else {
								resolve({ image: new_image, result });
							}
						});
				});
			}));

			// pass along collected data once all promises have resolved
			Promise.all(promises).then(values => {
				resolve({
					image1: values[0].image,
					image2: values[1].image,
					text: values[0].text || values[1].text
				});
			}).catch(err => {
				reject(err);
			});
		});
	}




	async getRaidTimeRemaining(id, message, image, region) {
		const debug_image_path1 = path.join(__dirname, this.image_path, `${id}5-time-remaining-a.png`);
		const debug_image_path2 = path.join(__dirname, this.image_path, `${id}5-time-remaining-b.png`);
		const values = await this.getOCRRaidTimeRemaining(id, message, image, region);

		// something has gone wrong if no info was matched, save image for later analysis
		if (debug_flag || (!values.text && log.getLevel() === log.levels.DEBUG)) {
			values.image1.write(debug_image_path1);
			values.image2.write(debug_image_path2);
		}

		// NOTE:  There is a chance time_remaining could not be determined... not sure if we would want to do
		//			a different time of image processing at that point or not...
		return { time_remaining: values.text, egg: values.egg };
	}

	getOCRRaidTimeRemaining(id, message, image, region, level=0) {
		return new Promise((resolve, reject) => {
			let region1 = { x: region.width - (region.width / 3.4), y: region.height - (region.height / 2.2), width: region.width / 4, height: region.height / 12 };
			let region2 = { x: 0, y: region.height / 6.4, width: region.width, height: region.height / 8 };

			let promises = [];

			promises.push(new Promise((resolve, reject) => {
				const new_image = image.clone()
					.crop(region1.x, region1.y, region1.width, region1.height)
					.scan(0, 0, region1.width, region1.height, this.filterPureWhiteContent)
					.getBuffer(Jimp.MIME_PNG, (err, image) => {
						if (err) { reject(err); }

						tesseract.recognize(image)
							.catch(err => reject(err))
							.then(result => {
								const match = result.text.replace(/[^\w\s:]/g, '').replace(/o|O/g, 0).match(/([0-9]{1,2}:[0-9]{1,2}){2}/g);
								if (match && match.length) {
									resolve({ image: new_image, text: match[0], result });
								} else {
									resolve({ image: new_image, result });
								}
							});
					});
			}));

			promises.push(new Promise((resolve, reject) => {
				const new_image = image.clone()
					.crop(region2.x, region2.y, region2.width, region2.height)
					.scan(0, 0, region2.width, region2.height, this.filterPureWhiteContent)
					.getBuffer(Jimp.MIME_PNG, (err, image) => {
						if (err) { reject(err); }

						tesseract.recognize(image)
							.catch(err => reject(err))
							.then(result => {
								const match = result.text.replace(/[^\w:]/g, '').replace(/o|O/g, 0).match(/([0-9]{1,2}:[0-9]{1,2}){2}/g);
								if (match && match.length) {
									resolve({ image: new_image, text: match[0], result });
								} else {
									resolve({ image: new_image, result });
								}
							});
					});
			}));

			// pass along collected data once all promises have resolved
			Promise.all(promises).then(values => {
				resolve({
					egg: !!values[1].text,
					image1: values[0].image,
					image2: values[1].image,
					text: values[0].text || values[1].text
				});
			}).catch(err => {
				reject(err);
			});
		});
	}



	async getGymName(id, message, image, region) {
		const GymType = new GymArgumentType(Helper.client);
		let values, gym_name, gym_words;
		let match = true;

		// try different levels of processing to get time
		for (let processing_level=0; processing_level<2; processing_level++) {
			const debug_image_path = path.join(__dirname, this.image_path, `${id}2-gym-name-${processing_level}.png`);
			values = await this.getOCRGymName(id, message, image, region, processing_level);

			// start by splitting into words of 3 characters or more, and sorting by size of each word
			gym_name = values.text;
			gym_words = gym_name.split(' ').filter(word => { return word.length > 2; }).sort((a, b) => { return a.length < b.length; });

			// re-combine shortened gym name
			gym_name = gym_words.join(' ');

			// ensure gym exist and is allowed to be created
			if (await GymType.validate(gym_name, message) === true) {
				match = true;
			}

			if (!match) {
				// If gym_name doesn't exist, start popping off the shortest words in an attempt to get a match
				//		Example: 6 words = 3 attempts, 2 words = 1 attempt
				for (let i=0; i<=Math.floor(gym_words.length/2); i++) {
					const word = gym_words[gym_words.length - 1];

					// only remove words of length 4 characters or lower
					if (word && word.length <= 4) {
						gym_words.pop();
						gym_name = gym_words.join(' ');

						// ensure gym exist and is allowed to be created
						if (await GymType.validate(gym_name, message) === true) {
							match = true;
							break;
						}
					} else {
						// stop trying to remove words
						break;
					}
				}
			}

			if (debug_flag || log.getLevel() === log.levels.DEBUG) {
				log.warn(id, values.result.text);
				values.image.write(debug_image_path);
			}

			if (match) {
				break;
			}
		}

		if (match) {
			return await GymType.parse(gym_name, message);
		}

		// If nothing has been determined to make sense, then either OCR or Validation has failed for whatever reason
		// TODO:  Try a different way of getting tesseract info from image
		log.warn(await GymType.validate(gym_name, message));
		return false;
	}

	getOCRGymName(id, message, image, region, level=0) {
		return new Promise((resolve, reject) => {
			let new_image = image.clone().crop(region.x, region.y, region.width, region.height);

			// basic level 0 processing by default
			if (level === 0) {
				new_image = new_image.scan(0, 0, region.width, region.height, this.filterBodyContent).blur(1);
			} else {
				new_image = new_image.blur(1).scan(0, 0, region.width, region.height, this.filterBodyContent2).blur(1);
			}

			new_image = new_image.getBuffer(Jimp.MIME_PNG, (err, image) => {
				if (err) { reject(err); }

				tesseract.recognize(image)
					.catch(err => reject(err))
					.then(result => {
						const text = result.text.replace(/[^\w\s]/g, '').replace(/\n/g, ' ').trim();
						resolve({ image: new_image, text, result });
					});
			});
		});
	}




















	async getPokemonName(id, message, image, region) {
		const debug_image_path = path.join(__dirname,  this.image_path, `${id}3-pokemon-name.png`);
		const PokemonType = new PokemonArgumentType(Helper.client);
		const values = await this.getOCRPokemonName(id, message, image, region);

		let pokemon = values.pokemon;
		let cp = values.cp;
		if (PokemonType.validate(pokemon, message) === true) {
			pokemon = PokemonType.parse(pokemon, message);
		} else if (PokemonType.validate(`${cp}`, message) === true) {
			pokemon = PokemonType.parse(`${cp}`, message);
		} else {
			// if not a valid pokemon, use some placeholder information
			pokemon = { placeholder: true, name: 'pokemon', tier: '????' };
		}

		// something has gone wrong if no info was matched, save image for later analysis
		if (debug_flag || (pokemon.placeholder && log.getLevel() === log.levels.DEBUG)) {
			log.warn(id, values.result.text);
			values.image.write(debug_image_path);
		}

		// NOTE:  There is a chance pokemon could not be determined and we may need to try image processing again on a different setting/level
		return { pokemon, cp: values.cp };
	}

	getOCRPokemonName(id, message, image, region, level=0) {
		return new Promise((resolve, reject) => {
			const new_image = image.clone()
				.crop(region.x, region.y, region.width, region.height)
				.blur(3)
				.brightness(-0.2)
				.scan(0, 0, region.width, region.height, this.filterLargeBodyContent)
				.getBuffer(Jimp.MIME_PNG, (err, image) => {
					if (err) { reject(err); }

					tesseract.recognize(image)
						.catch(err => reject(err))
						.then(result => {
							const text = result.text.replace(/[^\w\s\n]/gi, '');
							const cp = new Number(text.match(/[0-9]+/g)).valueOf();
							const pokemon = text.replace(/(cp)?\s?[0-9]*/g, '');
							resolve({ image: new_image, cp, pokemon, result });
						});
				});
		});
	}






	async getTier(id, message, image, region) {
		const debug_image_path = path.join(__dirname,  this.image_path, `${id}5-tier.png`);
		const PokemonType = new PokemonArgumentType(Helper.client);
		const values = await this.getOCRTier(id, message, image, region);

		// NOTE: Expects string in validation of egg tier
		let pokemon = `${values.tier}`;
		if (PokemonType.validate(pokemon, message) === true) {
			pokemon = PokemonType.parse(pokemon, message);
		} else {
			// if not a valid tier, use some placeholder information
			pokemon = { placeholder: true, name: 'egg', tier: '????' };
		}

		// something has gone wrong if no info was matched, save image for later analysis
		if (debug_flag || (pokemon.placeholder && log.getLevel() === log.levels.DEBUG)) {
			log.warn(id, values.result.text);
			values.image.write(debug_image_path);
		}

		// NOTE:  There is a chance egg tier could not be determined and we may need to try image processing again before returning...
		return { tier: values.tier, pokemon };
	}

	async getOCRTier(id, message, image, region) {
		return new Promise((resolve, reject) => {
			const new_image = image.clone()
				.crop(region.x, region.y, region.width, region.height)
				.scan(0, 0, region.width, region.height, this.filterPureWhiteContent)
				.blur(3)
				.getBuffer(Jimp.MIME_PNG, (err, image) => {
					if (err) { reject(err); }

					tesseract.recognize(image)
						.catch(err => reject(err))
						.then(result => {
							// NOTE:  This doesn't match 1 character alone... too many jibberish character to match T1 raids like this...
							// will smash all the characters together and attempt to find the longest matching repeated sequence
							const match = result.text.replace(/\s/g, '').match(/(.)\1+/gi).sort((a, b) => { return a.length < b.length; });
							if (match && match.length) {
								resolve({ image: new_image, tier: match[0].length, result });
							} else {
								resolve({ image: new_image, tier: 0, result });
							}
						});
				});
		});
	}



	async getRaidData(id, message, image) {
		// some phones are really wierd? and have way too much height to them, and need this check to push cropping around a bit
		const check_phone_color = Jimp.intToRGBA(image.getPixelColor(0, 85));

		// location of cropping / preprocessing for different pieces of information (based on % width & % height for scalability purposes)
		let gym_location = { x: image.bitmap.width / 5.1, y: image.bitmap.height / 26, width: image.bitmap.width - (image.bitmap.width / 2.55), height: image.bitmap.height / 13 };
		let phone_time_crop = { x: image.bitmap.width / 2.5, y: 0, width: image.bitmap.width, height: image.bitmap.height / 27 };
		let pokemon_name_crop = { x: 0, y: image.bitmap.height / 6.4, width: image.bitmap.width, height: image.bitmap.height / 5 };
		let tier_crop = { x: 0, y: image.bitmap.height / 4.0, width: image.bitmap.width, height: image.bitmap.height / 9 };
		let all_crop = { x: 0, y: 0, width: image.bitmap.width, height: image.bitmap.height };
		let promises = [];

		// special case for some kind of odd vertical phone
		if (check_phone_color.r <= 20 && check_phone_color.g <= 20 && check_phone_color.b <= 20) {
			gym_location.y += 100;
		}

		// GYM NAME
		const gym = await this.getGymName(id, message, image, gym_location);

		if (!gym) { return false; }

		// PHONE TIME
		promises.push(this.getPhoneTime(id, message, image, phone_time_crop));

		// TIME REMAINING
		const { time_remaining, egg } = await this.getRaidTimeRemaining(id, message, image, all_crop);

		// NOTE:  This seems like a bug in await syntax, but I can't use shorthands for settings values
		//			when they're await within an IF function like this... really stupid.
		if (egg) {
			// POKEMON TIER
			promises.push(this.getTier(id, message, image, tier_crop));
		} else {
			// POKEMON NAME
			promises.push(this.getPokemonName(id, message, image, pokemon_name_crop));
		}


		// CLARIFICATION:  So basically tier, pokemon, cp, and phone time are not dependant on each other,
		//		so by making them totally asynchronise, we speed up execution time slightly.
		return Promise.all(promises).then(values => {
			// write original image as a reference
			if (debug_flag || log.getLevel() === log.levels.DEBUG) {
				image.write(path.join(__dirname, this.image_path, `${id}.png`));
			}

			return {
				egg,
				gym,
				time_remaining,
				phone_time: values[0].phone_time,
				tier: values[1].tier || 0,
				cp: values[1].cp || 0,
				pokemon: values[1].pokemon
			};
		}).catch(err => {
			log.warn(err);
			return false;
		});
	}

	createRaid(message, data) {
		const TimeType = new TimeArgumentType(Helper.client);

		let gym = data.gym;
		let pokemon = data.pokemon;
		let time = data.phone_time;
		let duration = moment.duration(data.time_remaining, 'hh:mm:ss');
		let arg = {};

		// Need to fake TimeType data in order to validate/parse time...
		message.argString = '';
		message.is_exclusive = false;
		arg.prompt = '';
		arg.key = (data.egg)? TimeParameter.HATCH: TimeParameter.END;

		// add duration to time if both exist
		if (time && time.isValid() && duration.asMilliseconds() > 0) {
			// add time remaining to phone's current time to get final hatch or despawn time
			time = time.add(duration);

			if (TimeType.validate(time.format('[at] h:mma'), message, arg) === true) {
				time = TimeType.parse(time.format('[at] h:mma'), message, arg);
			} else {
				// time was not valid, don't set any time (would rather have accurate time, than an inaccurate guess at the time)
				time = undefined;
				message.channel.send('Invalid Raid Time');
				return;
			}
		}

		console.log('Processing Time: ' + ((Date.now() - message.createdTimestamp) / 1000) + ' seconds');

		let raid;

		Raid.createRaid(message.channel.id, message.member.id, pokemon, gym, time)
			.then(async info => {
				raid = info.raid;
				const raid_channel_message = await Raid.getRaidChannelMessage(raid),
					formatted_message = await Raid.getFormattedMessage(raid);

				return message.channel.send(raid_channel_message, formatted_message);
			})
			.then(announcement_message => {
				return Raid.setAnnouncementMessage(raid.channel_id, announcement_message);
			})
			.then(async bot_message => {
				return Raid.getChannel(raid.channel_id).then(channel => {
					// if pokemon, time remaining, or phone time was not determined, need to add original image to new channel,
					//		in the hope the someone can manually read the screenshot and set the appropriate information
					if (!message.is_fake && pokemon.placeholder === false) {
						return channel.send('**Pokemon** could not be determined, please help set the pokemon by typing \`!pokemon <name>\`', {files: [
							message.attachments.first().url
						]}).catch(err => log.error(err));
					} else if (!message.is_fake && !time) {
						return channel.send('**Time** could not be determined, please help set the time by typing either \`!hatch <time>\` or \`!end <time>\`', {files: [
							message.attachments.first().url
						]}).catch(err => log.error(err));
					} else {
						return channel;
					}
				});
			})
			.then(async bot_message => {
				const raid_source_channel_message = await Raid.getRaidSourceChannelMessage(raid),
					formatted_message = await Raid.getFormattedMessage(raid);

				return Raid.getChannel(raid.channel_id)
					.then(channel => {
						return channel.send(raid_source_channel_message, formatted_message)
					})
					.catch(err => log.error(err));
			})
			.then(channel_raid_message => {
				Raid.addMessage(raid.channel_id, channel_raid_message, true);
				message.channel.send('Processing Time: ' + Math.round((Date.now() - message.createdTimestamp) / 10) / 100 + ' seconds');
			})
			.then(result => message.delete())
			.catch(err => log.error(err))
	}
}

module.exports = new ImageProcess();
