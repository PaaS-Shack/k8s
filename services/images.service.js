"use strict";

const C = require("../constants");


const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const fs = require('fs').promises;

/**
 * attachments of addons service
 */
module.exports = {
	name: "images",
	version: 1,

	mixins: [
		DbService({
			cache: {

			},
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
		rest: "/v1/images",

		fields: {
			id: {
				type: "string",
				primaryKey: true,
				secure: true,
				columnName: "_id"
			},
			name: {
				type: "string",
				empty: false,
				required: true
			},
			imageName: {
				type: "string",
				empty: false,
				required: true
			},
			tag: {
				type: "string",
				empty: false,
				required: true
			},
			namespace: {
				type: "string",
				empty: false,
				required: true
			},
			registry: {
				type: "string",
				default: null,
				nullable: true,
				required: false
			},
			dockerFile: {
				type: "string",
				required: true
			},
			source: {
				type: "string",
				empty: false,
				required: true
			},
			process: {
				type: "string",
				empty: false,
				required: true
			},
			pullPolicy: {
				type: 'enum',
				values: ['IfNotPresent', 'Always', 'Never'],
				default: 'IfNotPresent',
				required: false
			},
			description: {
				type: "string",
				default: null,
				nullable: true,
				required: false
			},
			repo: {
				type: "boolean",
				default: false,
				required: false
			},
			size: {
				type: "string",
				required: true,
				populate: {
					action: "v1.sizes.resolve",
					params: {
						//fields: ["id", "username", "fullName", "avatar"]
					}
				},
				onCreate: ({ ctx }) => ctx.call('v1.sizes.getSize', { name: ctx.params.size }).then((res) => res.id),
				onUpdate: ({ ctx }) => ctx.call('v1.sizes.getSize', { name: ctx.params.size }).then((res) => res.id),
				validate: "validateSize"
			},

			config: C.config,

			ports: C.ports,
			envs: C.envs,
			links: C.links,
			remote: C.remote,

			volumes: {
				type: 'array',

				items: {
					type: 'object',
					props: {
						local: { type: 'string', empty: false, required: true, optional: false },
						type: { type: 'string', empty: false, required: true, optional: false },
						files: {
							type: 'array',

							items: {
								type: 'object',
								props: {
									path: { type: 'string', empty: false, optional: false },
									source: { type: 'string', empty: false, optional: true },
									cp: { type: 'string', empty: false, optional: true },
									cmd: { type: 'string', empty: false, optional: true }
								}
							},
							default: [],

							required: false
						},
					}
				},
				default: [],

				required: false
			},



			options: { type: "object" },
			...C.TIMESTAMP_FIELDS
		},

		scopes: {
			// Return addons.attachments of a given addon where the logged in user is a member.


			// attachment the not deleted addons.attachments
			notDeleted: { deletedAt: null }
		},

		defaultScopes: ["notDeleted"]
	},

	/**
	 * Actions
	 */

	actions: {
		create: {
			permissions: ['images.create'],
		},
		list: {
			permissions: ['images.list'],
		},

		find: {
			rest: "GET /find",
			permissions: ['images.find'],
		},

		count: {
			rest: "GET /count",
			permissions: ['images.count'],
		},

		get: {
			needEntity: true,
			permissions: ['images.get']
		},

		update: {
			needEntity: true,
			permissions: ['images.update']
		},

		replace: false,

		remove: {
			needEntity: true,
			permissions: ['images.remove']
		},

		clean: {
			async handler(ctx) {
				const entities = await this.findEntities(ctx, {})
				console.log(entities)
				return Promise.allSettled(entities.map((entity) =>
					this.removeEntity(ctx, { id: entity.id })))
			}
		},
		getImage: {
			description: "Add members to the addon",
			params: {
				name: { type: "string", optional: false },
			},
			async handler(ctx) {
				const { name } = Object.assign({}, ctx.params);
				let res = await this.findEntity(ctx, {
					query: { deletedAt: null, name },
					scope: false
				});
				if (!res) {
					return this.resolveEntities(ctx, {
						id: name
					});
				}
				return res
			}
		},

		build: {
			cache: false,
			params: {
				id: { type: "string", optional: false },
				nodeID: { type: "string", optional: false },
			},
			permissions: ['teams.create'],
			auth: "required",
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const nodeID = params.nodeID


				let image = await this.resolveEntities(ctx, {
					id: params.id
				});
				const tag = `${image.registry}/${image.namespace}/${image.name}:${image.tag}`
				const cwd = `/tmp/${image.namespace}/${image.name}`
				this.logger.info(`Building image ${tag} on node ${params.nodeID}`)

				const isRepo = await ctx.call('v1.node.git.checkIsRepo', {
					cwd
				}, { nodeID })

				if (!isRepo) {
					await ctx.call('v1.node.fs.mkdir', {
						path: cwd,
						recursive: true
					}, { nodeID });
					await ctx.call('v1.node.git.addRemote', {
						cwd,
						path: image.remote.path
					}, { nodeID });
				}

				await ctx.call('v1.node.git.checkout', {
					cwd,
					branch: image.remote.branch
				}, { nodeID });


				this.logger.info(`Build cwd ${cwd} for image ${tag}`)

				const build = await ctx.call('v1.docker.build', {
					dockerfile: image.dockerFile,
					tag: tag,
					path: cwd,
					wait: true
				}, {
					nodeID: params.nodeID,
					timeout: 10 * 60 * 1000
				})
				this.logger.info(`Building finished ${tag} pushing...`, build)
				const push = await ctx.call('v1.docker.push', {
					repoTag: tag,
					wait: true
				}, {
					nodeID: params.nodeID,
					timeout: 10 * 60 * 1000
				})
				this.logger.info(`Building push ${tag} finished`, push)
			}
		},

		loadImages: {
			params: {

			},
			permissions: ['images.loadImages'],
			async handler(ctx) {
				const results = []

				const dirname = './images';

				const files = await fs.readdir(dirname)


				for (let index = 0; index < files.length; index++) {
					const filename = files[index];

					const fileContent = await fs.readFile(`${dirname}/${filename}`, 'utf-8')


					const schema = JSON.parse(fileContent)

					const found = await ctx.call('v1.images.find', {
						query: {
							name: schema.name
						}
					}).then((res) => res.shift())

					if (found) {

						results.push(await ctx.call('v1.images.update', {
							...schema,
							id: found.id
						}).catch((err) => {
							console.log(err)

							return err
						}))
					} else {
						results.push(await ctx.call('v1.images.create', schema).catch((err) => {
							console.log(err)

							return err
						}))
					}
					console.log(fileContent, JSON.parse(fileContent))
				}

				return results
			}
		},

		seedDB: {
			cache: false,
			params: {

			},
			permissions: ['teams.create'],
			auth: "required",
			async handler(ctx) {

				let results = []
				for (let index = 0; index < imageConfig.length; index++) {
					const schema = imageConfig[index]

					const found = await ctx.call('v1.images.find', {
						query: {
							name: schema.name
						}
					}).then((res) => res.shift())

					if (found) {





						results.push(await ctx.call('v1.images.update', {
							...imageConfig[index],
							id: found.id
						}).catch((err) => {
							console.log(err)

							return err
						}))
					} else {
						results.push(await ctx.call('v1.images.create', imageConfig[index]).catch((err) => {
							console.log(err)

							return err
						}))
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
		async "images.created"(ctx) {
			const image = ctx.params.data;
			//await this.actions.build({ id: image.id, nodeID: 'devbox-125039' })
		},
	},

	/**
	 * Methods
	 */
	methods: {
		async validateHasimagePermissions(query, ctx, params) {
			// Adapter init
			if (!ctx) return query;

			if (params.image) {
				const res = await ctx.call("v1.images.getimage", {
					id: params.image, member: ctx.meta.userID
				});

				if (res) {
					query.image = params.image;
					return query;
				}
				throw new MoleculerClientError(
					`You have no right for the image '${params.image}'`,
					403,
					"ERR_NO_PERMISSION",
					{ image: params.image }
				);
			}
			if (ctx.action.params.image && !ctx.action.params.image.optional) {
				throw new MoleculerClientError(`image is required`, 422, "VALIDATION_ERROR", [
					{ type: "required", field: "image" }
				]);
			}
		},


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
