"use strict";

const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const fs = require('fs').promises;

const FIELDS = require('../fields');

/**
 * Docker image catalog service for managing images
 */
module.exports = {

	/**
	 * Service name
	 */
	name: "k8s.images",

	/**
	 * Service version
	 */
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [
		DbService({
			permissions: 'k8s.images'
		}),
		ConfigLoader(['images.**'])
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
		rest: "/v1/k8s/images",

		fields: {
			...FIELDS.IMAGE_FIELDS.properties,

			...DbService.FIELDS,// inject dbservice fields
		},

		// default database populates
		defaultPopulates: [],

		// database scopes
		scopes: {
			...DbService.SCOPE,// inject dbservice scope
		},

		// default database scope
		defaultScopes: [...DbService.DSCOPE],// inject dbservice dscope

		// default init config settings
		config: {

		}
	},

	/**
	 * Actions
	 */

	actions: {
		/**
		 * remove all images from the database
		 * 
		 * @actions
		 * 
		 * @requires {Promise} - returns removed images
		 */
		clean: {
			async handler(ctx) {
				const entities = await this.findEntities(ctx, {});

				return Promise.allSettled(entities.map((entity) =>
					this.removeEntity(ctx, { id: entity.id })))
			}
		},

		/**
		 * Get a image by name
		 * 
		 * @actions
		 * @param {String} name - image name
		 * 
		 * @requires {Promise} - returns image
		 */
		getImage: {
			description: "Get a image by name",
			params: {
				name: { type: "string", optional: false },
			},
			permissions: ['k8s.images.get'],
			async handler(ctx) {
				const { name } = Object.assign({}, ctx.params);
				// check if image exists
				const found = await this.findEntity(ctx, {
					query: { deletedAt: null, name },
					scope: false
				});

				// if not found throw error
				if (!found) {
					throw new MoleculerClientError(
						`No image found with name '${name}'`,
						404,
						"ERR_NO_IMAGE",
						{ name }
					);
				}

				// return image
				return found;
			}
		},

		/**
		 * build a image on a node
		 * 
		 * 
		 * @actions
		 * @param {String} id - image id
		 * @param {String} nodeID - node id
		 * 
		 * @requires {Promise} - returns image
		 */
		build: {
			params: {
				id: { type: "string", optional: false },
				nodeID: { type: "string", optional: false },
			},
			permissions: ['k8s.images.build'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const nodeID = params.nodeID;
				const id = params.id;

				const image = await this.resolveEntities(ctx, {
					id
				});

				// check if image exists
				if (!image) {
					throw new MoleculerClientError(
						`No image found with id '${id}'`,
						404,
						"ERR_NO_IMAGE",
						{ id }
					);
				}

				// check if node exists
				const node = await ctx.call('v1.k8s.nodes.resolve', { id: nodeID });

				if (!node) {
					throw new MoleculerClientError(
						`No node found with id '${nodeID}'`,
						404,
						"ERR_NO_NODE",
						{ nodeID }
					);
				}

				// check if image is already built
				if (image.built) {
					throw new MoleculerClientError(
						`Image '${image.name}' is already built`,
						400,
						"ERR_IMAGE_ALREADY_BUILT",
						{ id }
					);
				}

				// check if image is already building
				if (image.building) {
					throw new MoleculerClientError(
						`Image '${image.name}' is already building`,
						400,
						"ERR_IMAGE_ALREADY_BUILDING",
						{ id }
					);
				}

			}

		},


		/**
		 * load image schemas from file
		 * 
		 * @actions
		 * 
		 * @requires {Promise} - list of images loaded
		 */
		loadImages: {
			params: {},
			permissions: ['images.loadImages'],
			async handler(ctx) {
				const results = []

				const dirname = './images';

				// read all files in the directory
				const files = await fs.readdir(dirname);

				// iterate over all files
				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					
					// parse file content
					const schema = require(`.${dirname}/${file}`);

					// check if image exists
					const found = await this.findEntity(null, {
						query: {
							name: schema.name
						}
					});

					// if not found create image
					if (!found) {
						results.push(await this.createEntity(ctx, { ...schema }));
					} else {
						results.push(await this.updateEntity(ctx, { id: found.id, ...schema }));
					}
				}

				return results;
			}
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

		async validateSize({ ctx, value, params, id, entity }) {
			return ctx.call("v1.sizes.resolve", { id: value })
				.then((res) => res ? true : `No size '${value} not found'`)
		},
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
