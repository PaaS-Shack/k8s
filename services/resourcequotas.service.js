"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "resourcequotas",
	version: 1,

	mixins: [
		DbService({
			cache: {

			},
		}),
		ConfigLoader(['resourcequotas.**'])
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
		rest: "/v1/resourcequotas/",

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
			"requests.cpu": {
				type: "number",
				required: true
			},
			"requests.memory": {
				type: "number",
				required: true
			},
			"requests.storage": {
				type: "number",
				required: true
			},
			"limits.cpu": {
				type: "number",
				required: true
			},
			"limits.memory": {
				type: "number",
				required: true
			},
			"pods": {
				type: "number",
				required: true
			},
			"secrets": {
				type: "number",
				required: true
			},
			"persistentvolumeclaims": {
				type: "number",
				required: true
			},
			"services.loadbalancers": {
				type: "number",
				required: true
			},
			"services.nodeports": {
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
		pack: {
			description: "Add members to the addon",
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				return this.resolveEntities(null, {
					id: params.id
				}).then((res) => this.flattenObj({
					...res,
					createdAt: undefined,
					updatedAt: undefined,
					id: undefined
				}));
			}
		},
		async seedDB() {
			const sizes = [];
			let memBase = 25;
			let cpuBase = 50;

			for (let i = 1; i < 15; i++) {

				let cpuCount = cpuBase * i;
				let memoryCount = memBase * i;
				let name = `S${i}`
				let group = 'C'
				if (i > 9) {
					name = `L${i - 9}`
					group = 'A'
				}
				sizes.push({
					name,
					group,
					"requests.cpu": Number((cpuBase * (Math.pow(i, 0.7)) * i).toFixed()),
					"requests.memory": Number((memBase * (Math.pow(i, 0.7)) * i).toFixed()),
					"limits.cpu": Number((cpuBase * (Math.pow(i, 0.9)) * i).toFixed()),
					"limits.memory": Number((memBase * (Math.pow(i, 0.9)) * i).toFixed()),
					pods: 2 * i,
					secrets: 2 * i,
					persistentvolumeclaims: 5 * i,
					"requests.storage": 1024 * 10 * i,
					"services.loadbalancers": 0,
					"services.nodeports": 0
				})
			}

			//return sizes
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
		mapValues(obj) {
			const keys = Object.keys(obj)
			const res = {}
			for (let index = 0; index < keys.length; index++) {
				const key = keys[index];
				switch (key) {
					case 'cpu':
						res[key] = `${obj[key]}m`
						break;
					case 'memory':
					case 'storage':
						res[key] = `${obj[key]}Mi`
						break;
					default:
						res[key] = `${obj[key]}`
						break;
				}
			}

			return res;
		},
		flattenObj(obj, parent, res = {}) {
			for (let key in obj) {
				let propName = parent ? parent + '.' + key : key;
				if (key == 'name' || key == 'group')
					continue;
				if (typeof obj[key] == 'object') {
					this.flattenObj(obj[key], propName, res);
				} else if (obj[key] != undefined) {
					res[propName] = obj[key];
					switch (key) {
						case 'cpu':
							res[propName] = `${obj[key]}m`
							break;
						case 'memory':
						case 'storage':
							res[propName] = `${obj[key]}Mi`
							break;
						default:
							res[propName] = `${obj[key]}`
							break;
					}
				}
			}
			return res;
		}
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
