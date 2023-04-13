"use strict";

const C = require("../constants");


const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

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
			permissions: ['domains.records.create'],
		},
		list: {
			permissions: ['domains.records.list'],
		},

		find: {
			rest: "GET /find",
			permissions: ['domains.records.find'],
		},

		count: {
			rest: "GET /count",
			permissions: ['domains.records.count'],
		},

		get: {
			needEntity: true,
			permissions: ['domains.records.get']
		},

		update: {
			needEntity: true,
			permissions: ['domains.records.update']
		},

		replace: false,

		remove: {
			needEntity: true,
			permissions: ['domains.records.remove']
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

		seedDB: {
			cache: false,
			params: {

			},
			permissions: ['teams.create'],
			auth: "required",
			async handler(ctx) {
				const wordpress = {
					name: 'wordpress:latest',
					imageName: 'wordpress',
					namespace: 'library',
					tag: 'latest',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker-library/wordpress.git',
						branch: 'master',
						commit: 'c705336b1dfe75c82fce00bb8aa7143755981747',
					},
					dockerFile: '/latest/php8.2/fpm-alpine/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S1',
					ports: [{
						internal: 80,
						type: 'http',
					}],
					links: [],
					envs: [
						{
							key: 'mysql',
							value: 'vx4YmOBm8YHM43YxBrEY',
							type: 'provision'
						}, {
							key: 'WORDPRESS_DB_HOST',
							value: 'MYSQL_HOST,MYSQL_PORT',
							type: 'map'
						}, {
							key: 'WORDPRESS_DB_USER',
							value: 'MYSQL_USERNAME',
							type: 'map'
						}, {
							key: 'WORDPRESS_DB_PASSWORD',
							value: 'MYSQL_PASSWORD',
							type: 'map'
						}, {
							key: 'WORDPRESS_DB_NAME',
							value: 'MYSQL_DATABASE',
							type: 'map'
						}
					],
					volumes: [{
						type: 'local',
						local: '/var/www/html'
					}]
				}
				const registry = {
					name: 'registry',
					imageName: 'registry',
					namespace: 'library',
					tag: '2',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker/distribution-library-image.git',
						branch: 'master',
						commit: '0be0d08b29d56bb1ef0fab93c751ca92d6976a19',
					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S1',
					ports: [{
						internal: 5000,
						type: 'http',
					}],
					links: [],
					envs: [

					],
					volumes: [{
						type: 'replica',
						local: '/var/lib/registry'
					}]
				}
				const matomo = {
					name: 'matomo',
					imageName: 'matomo',
					namespace: 'bitnami',
					tag: 'latest',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker/distribution-library-image.git',
						branch: 'master',
						commit: '0be0d08b29d56bb1ef0fab93c751ca92d6976a19',
					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S3',
					ports: [{
						internal: 80,
						type: 'http',
					}],
					links: [],
					envs: [
						{
							key: 'mysql',
							value: 'JGwP7rbJ4KtdZ1gEANrQ',
							type: 'provision'
						}, {
							key: 'MYSQL_CLIENT_DATABASE_HOST',
							value: 'MYSQL_HOST',
							type: 'map'
						}, {
							key: 'MATOMO_DATABASE_NAME',
							value: 'MYSQL_DATABASE',
							type: 'map'
						}, {
							key: 'MATOMO_DATABASE_USER',
							value: 'MYSQL_USERNAME',
							type: 'map'
						}, {
							key: 'MATOMO_DATABASE_PASSWORD',
							value: 'MYSQL_PASSWORD',
							type: 'map'
						}, {
							key: 'MATOMO_ENABLE_PROXY_URI_HEADER',
							value: 'yes'
						}, {
							key: 'MATOMO_ENABLE_ASSUME_SECURE_PROTOCOL',
							value: 'yes'
						}, {
							key: 'MYSQL_CLIENT_FLAVOR',
							value: 'mysql'
						}
					],
					volumes: [{
						type: 'local',
						local: '/bitnami'
					}]
				}
				const minio = {
					name: 'minio',
					imageName: 'minio',
					namespace: 'minio',
					tag: 'latest',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker/distribution-library-image.git',
						branch: 'master',
						commit: '0be0d08b29d56bb1ef0fab93c751ca92d6976a19',
					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S1',
					ports: [{
						internal: 9000,
						type: 'http',
						name: 'frontend',
					}, {
						internal: 9001,
						type: 'http',
						name: 'backend',
						subdomain: 'console',
					}],
					links: [],
					envs: [{
						key: 'MINIO_ROOT_USER',
						type: 'secret',
						scope: 'RUN_TIME'
					}, {
						key: 'MINIO_ROOT_PASSWORD',
						type: 'secret',
						scope: 'RUN_TIME'
					}, {
						key: 'MINIO_BROWSER_REDIRECT_URL',
						type: 'route',
						index: 1,
						value: '${VHOST}',
						scope: 'RUN_TIME'
					}],
					config: {
						Cmd: ['server', '--console-address', ':9001', '/data']
					},
					volumes: [{
						type: 'local',
						local: '/data'
					}]
				}
				const gitea = {
					name: 'gitea',
					imageName: 'gitea',
					namespace: 'gitea',
					tag: '1.17.4',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker/distribution-library-image.git',
						branch: 'master',
						commit: '0be0d08b29d56bb1ef0fab93c751ca92d6976a19',
					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S2',
					ports: [{
						internal: 3000,
						type: 'http',
						name: 'frontend',
					}],
					links: [],
					envs: [{
						key: 'mysql',
						value: 'JGwP7rbJ4KtdZ1gEANrQ',
						type: 'provision'
					}, {
						key: 'GITEA__database__DB_TYPE',
						value: 'mysql'
					}, {
						key: 'GITEA__database__HOST',
						value: 'MYSQL_HOST',
						type: 'map'
					}, {
						key: 'GITEA__database__NAME',
						value: 'MYSQL_DATABASE',
						type: 'map'
					}, {
						key: 'GITEA__database__USER',
						value: 'MYSQL_USERNAME',
						type: 'map'
					}, {
						key: 'GITEA__database__PASSWD',
						value: 'MYSQL_PASSWORD',
						type: 'map'
					}],
					volumes: [{
						type: 'replica',
						local: '/data'
					}]
				}

				const devNodeJS = {
					name: 'dev-nodejs',
					imageName: 'dev-nodejs',
					namespace: 'onehost',
					tag: '0.0.1',
					registry: 'git.one-host.ca',
					remote: {

					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S10',
					ports: [{
						internal: 8080,
						type: 'http',
					}],
					links: [],
					envs: [],
					volumes: [{
						type: 'replica',
						local: '/mnt/replica'
					}, {
						type: 'local',
						local: '/mnt/local'
					}, {
						type: 'network',
						local: '/mnt/network'
					}]
				}

				const vscode = {
					name: 'vscode-server',
					imageName: 'docker-code-server',
					namespace: 'paas-shack',
					tag: 'master',
					registry: 'ghcr.io',
					remote: {

					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "code-server",
					size: 'S10',
					ports: [{
						internal: 8080,
						type: 'http',
					}, {
						internal: 8081,
						subdomain: 'dev-8444',
						type: 'http',
					}, {
						internal: 8082,
						subdomain: 'dev-8445',
						type: 'http',
					}],
					links: [],
					envs: [{
						key: 'PASSWORD',
						type: 'secret',
						scope: 'RUN_TIME'
					}, {
						key: 'SUDO_PASSWORD',
						type: 'secret',
						scope: 'RUN_TIME'
					}],
					volumes: [{
						type: 'local',
						local: '/mnt/workspace'
					}, {
						type: 'replica',
						local: '/config'
					}]
				}

				const uptimekuma = {
					name: 'uptime-kuma',
					imageName: 'uptime-kuma',
					namespace: 'louislam',
					tag: '1',
					registry: 'docker.io',
					remote: {

					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S5',
					ports: [{
						internal: 3001,
						type: 'http',
					}],
					links: [],
					envs: [],
					volumes: [{
						type: 'replica',
						local: '/app/data'
					}]
				}
				const nextcloud = {
					name: 'nextcloud',
					imageName: 'nextcloud',
					namespace: 'library',
					tag: 'fpm',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker/distribution-library-image.git',
						branch: 'master',
						commit: '0be0d08b29d56bb1ef0fab93c751ca92d6976a19',
					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S3',
					ports: [{
						internal: 80,
						type: 'http',
					}],
					links: [],
					envs: [
						{
							key: 'mysql',
							value: 'JGwP7rbJ4KtdZ1gEANrQ',
							type: 'provision'
						}, {
							key: 'MATOMO_DATABASE_NAME',
							value: 'MYSQL_DATABASE',
							type: 'map'
						}, {
							key: 'MYSQL_USER',
							value: 'MYSQL_USERNAME',
							type: 'map'
						}, {
							key: 'VIRTUAL_HOST',
							value: '${VHOST}',
							type: 'route'
						}
					],
					volumes: [{
						type: 'local',
						local: '/var/www/html'
					}]
				}
				const mysql = {
					name: 'mysql:8.0.28-debian',
					imageName: 'mysql',
					namespace: 'library',
					tag: '8.0.28-debian',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker-library/mysql.git',
						branch: 'master',
						commit: 'e4b225b3eed5c774fa11799f04832e0ad351da62',
					},
					dockerFile: '/Dockerfile',
					source: "database",
					process: "mysql",
					size: 'N5',
					ports: [{
						internal: 3306,
						type: 'tcp',
					}],
					envs: [{
						key: 'MYSQL_ROOT_PASSWORD',
						type: 'secret'
					}],
					volumes: [{
						local: '/var/lib/mysql',
						type: 'replica'
					}]
				}
				const microweber = {
					name: 'microweber',
					imageName: 'microweber',
					namespace: 'microweber',
					tag: '1.4',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker/distribution-library-image.git',
						branch: 'master',
						commit: '0be0d08b29d56bb1ef0fab93c751ca92d6976a19',
					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S3',
					ports: [{
						internal: 80,
						type: 'http',
					}],
					links: [],
					envs: [
						{
							key: 'mysql',
							value: 'JGwP7rbJ4KtdZ1gEANrQ',
							type: 'provision'
						}, {
							key: 'MATOMO_DATABASE_NAME',
							value: 'MYSQL_DATABASE',
							type: 'map'
						}, {
							key: 'MYSQL_USER',
							value: 'MYSQL_USERNAME',
							type: 'map'
						}, {
							key: 'APP_URL',
							value: 'https://${VHOST}/',
							type: 'route'
						}
					],
					volumes: []
				}
				const prestashop = {
					name: 'prestashop',
					imageName: 'prestashop',
					namespace: 'prestashop',
					tag: 'latest',
					registry: 'docker.io',
					remote: {
						path: 'https://github.com/docker/distribution-library-image.git',
						branch: 'master',
						commit: '0be0d08b29d56bb1ef0fab93c751ca92d6976a19',
					},
					dockerFile: '/Dockerfile',
					source: "frontend",
					process: "web",
					size: 'S3',
					ports: [{
						internal: 80,
						type: 'http',
					}],
					links: [],
					envs: [
						{
							key: 'mysql',
							value: 'JGwP7rbJ4KtdZ1gEANrQ',
							type: 'provision'
						}, {
							key: 'DB_SERVER',
							value: 'MYSQL_HOST,MYSQL_PORT',
							type: 'map'
						}, {
							key: 'DB_NAME',
							value: 'MYSQL_DATABASE',
							type: 'map'
						}, {
							key: 'DB_USER',
							value: 'MYSQL_USERNAME',
							type: 'map'
						}, {
							key: 'DB_PASSWD',
							value: 'MYSQL_PASSWORD',
							type: 'map'
						}, {
							key: 'PS_DOMAIN',
							value: 'https://${VHOST}/',
							type: 'route'
						}, {
							key: 'PS_INSTALL_AUTO',
							value: '1'
						}, {
							key: 'PS_INSTALL_DB',
							value: '1'
						}, {
							key: 'PS_FOLDER_INSTALL',
							value: 'install_renamed'
						}, {
							key: 'PS_FOLDER_ADMIN',
							value: 'admin_ps'
						}
					],
					volumes: [{
						type: 'replica',
						local: '/var/www/html'
					}]
				}

				let imageConfig = [
					wordpress,
					registry,
					matomo,
					minio,
					gitea,
					devNodeJS,
					uptimekuma,
					nextcloud,
					mysql,
					vscode,
					microweber,
					prestashop,
				]
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
