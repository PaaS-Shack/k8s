"use strict";






const C = {
	STATUS_ACTIVE: 1,
	STATUS_INACTIVE: 0,
	STATUS_DELETED: -1,

	ROLE_SYSTEM: "$system",
	ROLE_EVERYONE: "$everyone",
	ROLE_AUTHENTICATED: "$authenticated",
	ROLE_MEMBER: "$member",
	ROLE_OWNER: "$owner",
	ROLE_APP_MEMBER: "$app-member",
	ROLE_APP_OWNER: "$app-owner",
	ROLE_ADDON_MEMBER: "$addon-member",
	ROLE_ADDON_OWNER: "$addon-owner",
	ROLE_ADMINISTRATOR: "administrator",
	ROLE_USER: "user",

	VISIBILITY_PRIVATE: "private",
	VISIBILITY_PROTECTED: "protected",
	VISIBILITY_PUBLIC: "public",
	VISIBILITY_PUBLISHED: "published",

	TOKEN_TYPE_VERIFICATION: "verification",
	TOKEN_TYPE_PASSWORDLESS: "passwordless",
	TOKEN_TYPE_PASSWORD_RESET: "password-reset",
	TOKEN_TYPE_API_KEY: "api-key"
};

const hook = {
	type: 'object',
	required: false, optional: true,
	default: {},
	props: {
		step: {
			type: 'enum',
			values: ["ready", "queue", "dequeue", "attach", "commit", "copy", "create"
				, "destroy", "detach", "die", "exec_create", "exec_detach", "exec_die"
				, "exec_start", "export", "health_status", "kill", "oom", "pause"
				, "rename", "resize", "restart", "start", "stop", "top", "unpause", "update"
				, "push", "pull", "tag", "commit"],
			required: false
		},
		params: { type: "object", default: {}, required: false, optional: true },
		priority: { type: 'number', default: 5, required: false, optional: true },
		critical: { type: 'boolean', default: false, required: false, optional: true },
		port: { type: 'boolean', default: false, required: false, optional: true },
		caller: { type: 'string', empty: false, required: true, optional: false }
	}
}

const probe = {
	type: 'object',
	required: false, optional: true,
	default: {},
	props: {
		exec: {
			type: 'object',
			required: false, optional: true,
			props: {
				command: { type: 'array', items: 'string', default: [], required: false, optional: true },
			}
		},
		httpGet: {
			type: 'object',
			required: false, optional: true,
			props: {
				host: { type: 'string', required: false, optional: true },
				httpHeaders: {
					type: 'array',
					required: false, optional: true,
					default: [],
					items: {
						type: 'object',
						props: {
							name: { type: 'string', required: true, optional: false },
							value: { type: 'string', required: true, optional: false },
						}
					}
				},
				path: { type: 'string', required: false, optional: true },
				port: { type: 'number', required: false, optional: true },
			}
		},
		tcpSocket: {
			type: 'object',
			required: false, optional: true,
			props: {
				host: { type: 'string', required: false, optional: true },
				port: { type: 'number', required: false, optional: true },
			}
		},
		failureThreshold: { type: 'number', default: 3, required: true, optional: false },
		initialDelaySeconds: { type: 'number', default: 1, required: true, optional: false },
		periodSeconds: { type: 'number', default: 120, required: true, optional: false },
		successThreshold: { type: 'number', default: 1, required: true, optional: false },
		terminationGracePeriodSeconds: { type: 'number', default: 3, required: true, optional: false },
		timeoutSeconds: { type: 'number', default: 1, required: true, optional: false },
	}
}
const env = {
	type: 'object',
	props: {
		key: { type: 'string', empty: false, required: true, optional: false },
		value: [
			{ type: 'string', required: false, optional: true },
			{ type: 'number', required: false, optional: true },
			{ type: 'boolean', required: false, optional: true }
		],
		type: {
			type: 'enum',
			values: ['secret', 'username', 'team', 'application', 'provided', 'provision', 'as', 'route', 'map'],
			default: 'as',
			required: true
		},
		caller: { type: "string", required: false, optional: true },
		index: { type: "number", default: 0, required: false, optional: true },
		scope: { type: 'enum', values: ['RUN_TIME', 'BUILD_TIME', 'RUN_AND_BUILD_TIME'], default: 'RUN_TIME', required: false, optional: true }
	}
}

module.exports = {
	...C,

	TOKEN_TYPES: [
		C.TOKEN_TYPE_VERIFICATION,
		C.TOKEN_TYPE_PASSWORDLESS,
		C.TOKEN_TYPE_PASSWORD_RESET,
		C.TOKEN_TYPE_API_KEY
	],

	DEFAULT_LABELS: [
		{ id: 1, name: "Low priority", color: "#fad900" },
		{ id: 2, name: "Medium priority", color: "#ff9f19" },
		{ id: 3, name: "High priority", color: "#eb4646" }
	],

	TIMESTAMP_FIELDS: {
		createdAt: {
			type: "number",
			readonly: true,
			onCreate: () => Date.now(),
			graphql: { type: "Long" }
		},
		updatedAt: {
			type: "number",
			readonly: true,
			onUpdate: () => Date.now(),
			graphql: { type: "Long" }
		},
		deletedAt: {
			type: "number",
			readonly: true,
			hidden: "byDefault",
			onRemove: () => Date.now(),
			graphql: { type: "Long" }
		}
	},

	ARCHIVED_FIELDS: {
		archived: { type: "boolean", readonly: true, default: false },
		archivedAt: { type: "number", readonly: true, graphql: { type: "Long" } }
	},

	OWNER_MEMBER_FIELDS: {
		members: {
			type: "array",
			items: { type: "string", empty: false },
			readonly: true,
			onCreate: ({ ctx }) => (ctx.meta.userID ? [ctx.meta.userID] : []),
			validate: "validateMembers",
			populate: {
				action: "v1.accounts.resolve",
				params: {
					fields: ["id", "username", "fullName", "avatar"]
				}
			}
		},
	},

	probe,

	cmd: { type: 'array', items: 'string', default: [], required: false, optional: true },

	ports: {
		type: 'array',
		required: true, optional: false,
		default: [],
		items: {
			type: 'object',
			props: {
				name: { type: 'string', required: false, optional: true },
				subdomain: { type: 'string', required: false, optional: true },
				external: { type: 'number', default: 0, required: false, optional: true },
				internal: { type: 'number', required: true, optional: false },
				type: { type: 'enum', values: ['tcp', 'udp', 'http', 'https'], default: 'tcp', required: true, optional: false },
				//probe
			}
		}
	},

	env: env,
	envs: {
		type: 'array',
		required: false,
		optional: true,
		default: [],
		items: env
	},

	hook,
	hooks: {
		type: 'array',
		required: false, optional: true,
		default: [],
		items: hook
	},

	links: {
		type: 'array',

		items: {
			type: 'object',
			props: {
				as: { type: 'string', empty: false, required: true, optional: false },
				source: {
					type: 'string', empty: false, required: true, optional: false
				},
				size: {
					type: 'string', empty: false, required: false, optional: true
				}
			}
		},
		default: [],

		required: false
	},
	remote: {
		type: "object",
		props: {
			path: { type: "string", empty: false, required: false, optional: true },
			branch: { type: "string", empty: false, required: false, optional: true },
			commit: { type: "string", empty: false, required: false, optional: true },
		}
	},
	config: {
		type: "object",
		required: false, optional: true,
		default: {},
		props: {
			Cmd: { type: 'array', items: "string", required: false, optional: true },
			WorkingDir: { type: "string", empty: false, required: false, optional: true },
			StopSignal: { type: "string", empty: false, required: false, optional: true },
			NetworkDisabled: { type: "boolean", default: false, required: false, optional: true },
			OomKillDisable: { type: "boolean", default: false, required: false, optional: true },
			Privileged: { type: "boolean", default: false, required: false, optional: true },
			ReadonlyRootfs: { type: "boolean", default: false, required: false, optional: true },
			StopTimeout: { type: "number", default: 10, required: false, optional: true },
			OomScoreAdj: { type: "number", required: false, optional: true },
		}
	},
}