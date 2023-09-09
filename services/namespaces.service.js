"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const FIELDS = require("../fields");

/**
 * attachments of addons service
 */
module.exports = {
	name: "k8s.namespaces",
	version: 1,

	mixins: [
		DbService({
			permissions: 'k8s.namespaces'
		}),
		Membership({
			permissions: 'k8s.namespaces'
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
		rest: "/v1/k8s/namespaces/",

		fields: {
			...FIELDS.NAMESPACE_FIELDS.properties,


			...DbService.FIELDS,// inject dbservice fields
			...Membership.FIELDS,// inject membership fields
		},
		defaultPopulates: ['quota', 'status'],

		scopes: {
			...DbService.SCOPE,
			...Membership.SCOPE,
		},

		defaultScopes: [...DbService.DSCOPE, ...Membership.DSCOPE]
	},

	/**
	 * Actions
	 */

	actions: {


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
					scope: ["-membership"],
					fields: ['id', 'name', 'owner', 'members', 'uid', 'createdAt', 'updatedAt'],
				});

				return namespace
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		async "k8s.namespaces.created"(ctx) {
			const namespace = ctx.params.data;

			this.logger.info(`Creating namespace ${namespace.name} on cluster ${namespace.cluster}`);
			await this.createNamespace(ctx, namespace);

		},
		async "k8s.namespaces.removed"(ctx) {
			const namespace = ctx.params.data;

			this.logger.info(`Deleting namespace ${namespace.name} on cluster ${namespace.cluster}`);
			await this.deleteNamespace(ctx, namespace);

		},
		async "kube.namespaces.added"(ctx) {
			const resource = ctx.params;
			// k8s resource watcher will trigger this event

			//if no annotation, ignore
			if (!resource.metadata.annotations)
				return;

			// namespace id is stored in annotation
			const id = resource.metadata.annotations['k8s.one-host.ca/id'];

			// if no id, ignore
			if (!id)
				return;

			// find namespace by id	
			await this.updateUid(ctx, { id }, resource.metadata.uid);
			this.logger.info(`Kube has created namespace ${resource.metadata.name} on cluster ${resource.metadata.cluster} ${resource.metadata.uid}`)

		},
		async "kube.namespaces.deleted"(ctx) {
			const resource = ctx.params;
			// k8s resource watcher will trigger this event

			//if no annotation, ignore
			if (!resource.metadata.annotations)
				return;

			// namespace id is stored in annotation
			const id = resource.metadata.annotations['k8s.one-host.ca/id'];

			// if no id, ignore
			if (!id)
				return;

			await this.updateUid(ctx, { id }, null);
			this.logger.info(`Kube has deleted namespace ${resource.metadata.name} on cluster ${resource.metadata.cluster} ${resource.metadata.uid}`)
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Create k8s namespace
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise} 
		 */
		async createNamespace(ctx, namespace) {

			const name = namespace.name;

			// generate annotations
			const annotations = await this.generateAnnotations(ctx, namespace);
			// generate labels
			const labels = await this.generateLabels(ctx, namespace);

			// naamespace schema
			const Namespace = {
				apiVersion: "v1",
				kind: "Namespace",
				metadata: {
					name,
					annotations,
					labels
				}
			};

			// create namespace
			return ctx.call('v1.kube.createNamespace', { body: Namespace, cluster: namespace.cluster });
		},

		/**
		 * Delete k8s namespace
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise} 
		 */
		async deleteNamespace(ctx, namespace) {
			const name = namespace.name;

			// delete namespace
			return ctx.call('v1.kube.deleteNamespace', {
				name,
				cluster: namespace.cluster
			});
		},

		/**
		 * generate namespace annotations
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Object}
		 */
		async generateAnnotations(ctx, namespace) {
			const annotations = {
				'k8s.one-host.ca/owner': namespace.owner,
				'k8s.one-host.ca/name': namespace.name,
				'k8s.one-host.ca/id': namespace.id,
			};

			// loop over namespace annotations
			for (const [key, value] of Object.entries(namespace.annotations)) {
				annotations[key] = value;
			}

			return annotations;
		},

		/**
		 * Generate namespace lables
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Object}
		 */
		async generateLabels(ctx, namespace) {
			const labels = {
				name: namespace.name
			};

			// loop over namespace labels
			for (const [key, value] of Object.entries(namespace.labels)) {
				labels[key] = value;
			}

			return labels;
		},

		/**
		 * find namespace by name
		 * 
		 * @param {String} name - namespace name
		 */
		async findByName(name) {
			return this.findEntity(null, {
				query: { name },
				scope: ["-membership"],
			});
		},

		/**
		 * find namespace by id
		 * 
		 * @param {String} id - namespace id
		 */
		async findById(id) {
			return this.findEntity(null, {
				query: { id },
				scope: ["-membership"],
			});
		},

		/**
		 * update namespace k8s uid
		 * 
		 * @param {Object} ctx - context
		 * @param {Object} namespace - namespace entity
		 * @param {String} uid - k8s uid
		 */
		async updateUid(ctx, namespace, uid) {
			return this.updateEntity(ctx, {
				id: namespace.id,
				uid,
				scope: false,
			}).catch((err) => {
				// if not found ignore
				if (err.code == 404)
					return;
				throw err;
			});
		},

		async validateDomain({ ctx, value, params, id, entity }) {
			return ctx.call("v1.domains.resolve", { id: params.domain })
				.then((res) => res ? true : `No permissions '${value} not found'`)
		},
		async validateName({ ctx, value, params, id, entity }) {
			return ctx.call("v1.namespaces.find", {
				query: { name: params.name },
				scope: '-membership'
			}).then((res) => res.length ? `Name already used` : true)
		},
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	async started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
