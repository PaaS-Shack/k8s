"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");
const Lock = require("../lib/lock");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "events",
	version: 1,

	mixins: [
		DbService({}),
		Cron,
		Membership({
			permissions: 'events'
		})
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
		rest: "/v1/events/",

		fields: {

			name: {
				type: "string",
				required: true,
			},
			namespace: {
				type: "string",
				required: true,
			},
			uid: {
				type: "string",
				required: true,
			},
			involvedObject: {
				kind: {
					type: "string",
					required: true,
				},
				namespace: {
					type: "string",
					required: true,
				},
				name: {
					type: "string",
					required: true,
				},
				uid: {
					type: "string",
					required: true,
				},
				resourceVersion: {
					type: "number",
					convert: true,
					required: true,
				}
			},
			reason: {
				type: "string",
				required: false,
			},
			message: {
				type: "string",
				required: false,
			},
			source: {
				type: "object",
			},
			firstTimestamp: {
				type: "string",
				required: false,
			},
			lastTimestamp: {
				type: "string",
				required: false,
			},
			count: {
				type: "number",
				required: false,
			},
			type: {
				type: "string",
				required: true,
			},
			cluster: {
				type: "string",
				required: true,
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
			...Membership.FIELDS,
		},
		defaultPopulates: [],

		scopes: {
			notDeleted: { deletedAt: null },
			...Membership.SCOPE,
		},

		defaultScopes: ["notDeleted", ...Membership.DSCOPE]
	},

	crons: [
		{
			name: "Starting all services",
			cronTime: "*/30 * * * *",
			onTick: {
				//action: "v1.services.startAll"
			}
		}
	],
	/**
	 * Actions
	 */

	actions: {

		create: {
			permissions: ['namespaces.create'],
		},
		list: {
			permissions: ['namespaces.list'],
			params: {
				//domain: { type: "string" }
			}
		},

		find: {
			rest: "GET /find",
			permissions: ['namespaces.find'],
			params: {
				//domain: { type: "string" }
			}
		},

		count: {
			rest: "GET /count",
			permissions: ['namespaces.count'],
			params: {
				//domain: { type: "string" }
			}
		},

		get: {
			needEntity: true,
			permissions: ['namespaces.get'],
		},

		update: {
			needEntity: true,
			permissions: ['namespaces.update'],
		},

		replace: false,

		remove: {
			needEntity: true,
			permissions: ['namespaces.remove'],

		},
		clean: {
			params: {},
			async handler(ctx) {
				const entities = await this.findEntities(ctx, { scope: false })
				console.log(entities)
				return Promise.allSettled(entities.map((entity) =>
					this.removeEntity(ctx, { scope: false, id: entity.id })))
			}
		},

		resolveName: {
			params: {
				name: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const namespace = await this.findEntity(null, {
					query: { name: params.name },
					//scopes: false
				});

				return namespace
			}
		},


	},

	/**
	 * Events
	 */
	events: {

		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const name = namespace.name

		},
		async "kube.events.added"(ctx) {
			const event = ctx.params;
			await this.onEvent(ctx, event)
		},
		async "kube.events.modified"(ctx) {
			const event = ctx.params;
			await this.onEvent(ctx, event)
		},
		async "kube.events.deleted"(ctx) {
			const event = ctx.params;
			await this.onEvent(ctx, event)
		},
	},

	/**
	 * Methods
	 */
	methods: {
		async lookupEvent(uid) {
			return this.findEntity(null, {
				query: { uid },
				scope: false
			});
		},
		formatEvent(event) {
			return {
				name: event.metadata.name,
				namespace: event.metadata.namespace,
				uid: event.metadata.uid,
				resourceVersion: event.metadata.resourceVersion,
				creationTimestamp: event.metadata.creationTimestamp,
				involvedObject: {
					kind: event.involvedObject.kind,
					namespace: event.involvedObject.namespace,
					name: event.involvedObject.name,
					uid: event.involvedObject.uid,
					resourceVersion: event.involvedObject.resourceVersion
				},
				reason: event.reason,
				message: event.message,
				source: event.source,
				firstTimestamp: event.firstTimestamp,
				lastTimestamp: event.lastTimestamp,
				count: event.count,
				type: event.type,
				cluster: event.cluster,
			}
		},

		async onEvent(ctx, event) {

			await this.lock.acquire(event.metadata.uid)
			const data = this.formatEvent(event)

			const namesapce = await ctx.call('v1.namespaces.resolveName', { name: data.namespace })
			const options = { meta: { userID: 'mN7zNRpMY0hMPPp4g68l' } }
			if (namesapce) {
				options.meta.userID = namesapce.owner;
			}

			const found = await this.lookupEvent(event.metadata.uid);

			if (found) {
				const ev = await ctx.call('v1.events.update', {
					id: found.id,
					...data,
					scope:false
				}, options).catch(() => null)
				if(ev){
					this.logger.info(`Event updated ${ev.id} ${ev.type} ${ev.reason} ${ev.involvedObject.kind}`)
				}else{
					this.logger.info(`Event updated failed ${found.id} ${found.type} ${data.reason} ${data.involvedObject.kind}`)
				}
			} else {
				const ev = await ctx.call('v1.events.create', {
					...data,
				}, options)
				this.logger.info(`Event created ${ev.id} ${ev.type} ${ev.reason} ${ev.involvedObject.kind}`)
			}
			await this.lock.release(event.metadata.uid)

		}
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.lock = new Lock()
	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
		//this.actions.startAll().catch(() => null)
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};
