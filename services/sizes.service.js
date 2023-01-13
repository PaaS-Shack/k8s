"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "sizes",
	version: 1,

	mixins: [
		DbService({
			cache: {

			},
		}),
		ConfigLoader(['sizes.**'])
	],

	/**
	 * Service dependencies
	 */
	dependencies: [

	],

	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/sizes/",

		fields: {
			id: {
				type: "string",
				primaryKey: true,
				secure: true,
				columnName: "_id"
			},


			name: {
				type: "string",
				required: true,
				empty: false,
			},
			group: {
				type: "string",
				required: true,
				empty: false,
			},

			memory: {
				type: "number",
				required: true
			},
			swap: {
				type: "number",
				required: true
			},
			memoryReservation: {
				type: "number",
				required: true
			},
			cpu: {
				type: "number",
				required: true
			},
			cpuReservation: {
				type: "number",
				required: true
			},
			ioBandwidth: {
				type: "number",
				required: true
			},
			iops: {
				type: "number",
				required: true
			},


			options: { type: "object" },
			createdAt: {
				type: "number",
				readonly: true,
				onCreate: () => Date.now(),
			},
			updatedAt: {
				type: "number",
				readonly: true,
				onUpdate: () => Date.now(),
			},
			deletedAt: {
				type: "number",
				readonly: true,
				hidden: "byDefault",
				onRemove: () => Date.now(),
			},
		},

		scopes: {

			// attachment the not deleted addons.attachments
			notDeleted: { deletedAt: null }
		},

		defaultScopes: ["notDeleted"]
	},

	/**
	 * Actions
	 */

	actions: {
		getSize: {
			description: "Add members to the addon",
			params: {
				name: { type: "string", optional: false },
			},
			async handler(ctx) {
				const { name } = Object.assign({}, ctx.params);

				let res = await this.findEntity(null, {
					query: { name },
				});
				if (!res) {
					res = await this.findEntity(ctx, {
						query: { _id: this.decodeID(name) },
					});
				}

				return res
			}
		},
		async seedDB() {
			const sizes = [];
			let memBase = 25;
			let cpuBase = 25;

			// for (let i = 1; i < 20; i++) {

			// 	let cpuCount = cpuBase * i;
			// 	let memoryCount = memBase * i;
			// 	sizes.push({
			// 		name: `S${i}`,
			// 		group: 'C',
			// 		memory: memoryCount,
			// 		swap: 1,
			// 		memoryReservation: memoryCount - (10 / 100) * memoryCount,
			// 		cpu: cpuCount,
			// 		cpuReservation: cpuCount - (10 / 100) * cpuCount,
			// 		ioBandwidth: 10,
			// 		iops: 10,
			// 		oomKillDisable: true,
			// 		default: true
			// 	})
			// }

			// memBase = 256;
			// cpuBase = 500;
			// for (let i = 1; i < 20; i++) {

			// 	let cpuCount = cpuBase * i;
			// 	let memoryCount = memBase * i;
			// 	sizes.push({
			// 		name: `N${i}`,
			// 		group: 'N',
			// 		memory: memoryCount,
			// 		swap: 1,
			// 		memoryReservation: memoryCount - (10 / 100) * memoryCount,
			// 		cpu: cpuCount,
			// 		cpuReservation: cpuCount - (10 / 100) * cpuCount,
			// 		ioBandwidth: 10,
			// 		iops: 10,
			// 		oomKillDisable: true,
			// 		default: true
			// 	})
			// }

			memBase = 512;
			cpuBase = 250;
			for (let i = 1; i < 20; i++) {

				let cpuCount = cpuBase * i;
				let memoryCount = memBase * i;
				sizes.push({
					name: `A${i}`,
					group: 'A',
					memory: memoryCount,
					swap: 1,
					memoryReservation: memoryCount - (10 / 100) * memoryCount,
					cpu: cpuCount,
					cpuReservation: cpuCount - (10 / 100) * cpuCount,
					ioBandwidth: 10,
					iops: 10,
					oomKillDisable: true,
					default: true
				})
			}

			return Promise.all(sizes.map((entity) => this.actions.create(entity)))
		},
	},

	/**
	 * Events
	 */
	events: {

	},

	/**
	 * Methods
	 */
	methods: {

	},

	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	started() { },


	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() { }
};
