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

		/**
		 * Action to deploy a image to a namespace
		 * 
		 * @actions
		 * @param {String} id - image id
		 * @param {String} namespace - namespace id
		 * @param {String} name - name of the deployment
		 * @param {String} routes - routes to expose (default: image name)
		 * @param {String} replicas - number of replicas (default: 0)
		 * 
		 * @requires {Promise} - returns deployment
		 */
		deploy: {
			rest: {
				method: "POST",
				path: "/:id/deploy"
			},
			permissions: ['k8s.images.deploy'],
			params: {
				id: { type: "string", optional: false },
				namespace: { type: "string", optional: false },
				name: { type: "string", optional: false },
				routes: { type: "array", default: [], optional: true },
				replicas: { type: "number", default: 0, optional: true },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const id = params.id;
				const namespace = params.namespace;
				const name = params.name;
				const routes = params.routes;
				const replicas = params.replicas;

				// check if image exists
				const image = await this.resolveEntities(null, {
					id
				});

				if (!image) {
					throw new MoleculerClientError(
						`No image found with id '${id}'`,
						404,
						"ERR_NO_IMAGE",
						{ id }
					);
				}

				// check if namespace exists
				const ns = await ctx.call('v1.k8s.namespaces.resolve', { id: namespace });

				if (!ns) {
					throw new MoleculerClientError(
						`No namespace found with id '${namespace}'`,
						404,
						"ERR_NO_NAMESPACE",
						{ namespace }
					);
				}

				// check if deployment exists
				const deployment = await ctx.call('v1.k8s.deployments.resolve', { id: name, namespace });

				if (deployment) {
					throw new MoleculerClientError(
						`Deployment '${name}' already exists`,
						400,
						"ERR_DEPLOYMENT_ALREADY_EXISTS",
						{ name }
					);
				}

				// if routes is empty add default route
				if (routes.length === 0) {
					const domain = await ctx.call('v1.domains.resolve', { id: ns.domain });

					routes.push(`${name}.${domain.domain}`);

					this.logger.info(`No routes specified, using default route '${routes[0]}'`);
				}

				// create deployment
				const created = await this.createDeployment(image, ns, name, routes, replicas);

				// return deployment
				return created;
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
		/**
		 * Create deployment from image
		 * 
		 * @param {Object} image - image template
		 * @param {Object} namespace - namespace object
		 * @param {String} name - name of the deployment
		 * @param {Array} vHosts - routes to expose
		 * @param {Number} replicas - number of replicas
		 * 
		 * @requires {Promise} - returns deployment
		 */
		async createDeployment(image, namespace, name, vHosts, replicas) {
			//create deployment from image

			const Deployment = {
				name,
				namespace: namespace.id,
				image: image.id,
				replicas,
				routes: [],// add routes later
			}

			// create routes from vHosts
			for (let i = 0; i < vHosts.length; i++) {
				const vHost = vHosts[i];

				//create route object
				const route = await ctx.call('v1.routes.create', {
					vHost
				}).catch((err) => {
					// if route already exists return it
					if (err.code === 400 && err.type === 'ERR_ROUTE_ALREADY_EXISTS') {// TODO: update route to error ERR_ROUTE_ALREADY_EXISTS
						return ctx.call('v1.routes.resolveRoute', { vHost });
					} else {
						throw err;
					}
				});

				// add route to deployment
				Deployment.routes.push(route.id);
			}

			// create deployment
			const created = await ctx.call('v1.k8s.deployments.create', Deployment);

			return created;
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
