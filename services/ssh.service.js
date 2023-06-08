"use strict";

const fs = require('fs');
const readline = require('readline');
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const Streams = require('stream')

const { MoleculerClientError } = require("moleculer").Errors;
const { utils, Server, Client } = require('ssh2');

let privateKey = fs.readFileSync(process.env.PRIVATE_KEY || '/home/ubuntu/.ssh/id_ecdsa')
/**
 * attachments of addons service
 */
module.exports = {
    name: "ssh",
    version: 1,

    mixins: [
        DbService({}),
        ConfigLoader(['ssh.**'])
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
        rest: "/v1/ssh/",
        fields: {
            node: {
                type: "string",
                required: true,
            },
            network: {
                type: "string",
                required: true,
                populate: {
                    action: "v1.networks.resolve",
                    params: {}
                },
            },
            username: {
                type: "string",
                required: true
            },
            port: {
                type: "number",
                default: 22,
                required: false
            },

        },
        defaultPopulates: [],

        scopes: {

        },

        defaultScopes: []
    },

    /**
     * Actions
     */

    actions: {
        create: {
            permissions: ['domains.create'],
            params: {}
        },
        list: {
            permissions: ['domains.list'],
            params: {}
        },
        find: {
            rest: "GET /find",
            permissions: ['domains.find'],
            params: {}
        },
        count: {
            rest: "GET /count",
            permissions: ['domains.count'],
            params: {}
        },
        get: {
            needEntity: true,
            permissions: ['domains.get'],
            params: {}
        },
        update: {
            needEntity: true,
            permissions: ['domains.update'],
            params: {}
        },
        replace: false,
        remove: {
            needEntity: true,
            permissions: ['domains.remove'],
            params: {}
        },
        createClient: {
            params: {
                id: { type: "string", optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const host = await ctx.call('v1.ssh.resolve', { id: params.id, populate: ['network'] })
                return this.createClient(host)
            }
        },
        exec: {
            params: {
                id: { type: "string", optional: false },
                cmd: { type: "string", optional: false },
            },
			permissions: ['ssh.exec'],
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                const host = await ctx.call('v1.ssh.resolve', { id: params.id, populate: ['network'] })
                const conn = await this.createClient(host)
                return new Promise((resolve, reject) => {
                    conn.exec(params.cmd, (err, stream) => {
                        if (err) return reject(err);

                        const lines = []

                        readline.createInterface(stream).on('line', (line) => {
                            lines.push(line);
                        });
                        readline.createInterface(stream.stderr).on('line', (line) => {
                            lines.push(line);
                        });

                        stream.on('close', (code, signal) => {
                            resolve({ code, signal, lines })
                        })
                    });
                })
            }
        },
        shell: {
			permissions: ['ssh.shell'],
            async handler(ctx) {
                const host = await ctx.call('v1.ssh.resolve', { id: ctx.meta.id, populate: ['network'] })
                const conn = await this.createClient(host)
                return new Promise((resolve, reject) => {
                    conn.shell((err, shellStream) => {
                        if (err) return reject(err);

                        console.log(' conn.shell', ctx.meta)

                        ctx.params.pipe(shellStream)

                        ctx.params.on('error', (error) => {
                            console.log('error', error)
                        });
                        ctx.params.on('close', () => {
                            console.log('close')
                            shellStream.close()
                        });


                        resolve(shellStream)
                    });
                })
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
        createClient(host) {

            if (this.clients.has(host.id)) {
                return this.clients.get(host.id)
            }

            return new Promise((resolve, reject) => {
                const conn = new Client();
                this.clients.set(host.id, conn)
                conn.on('ready', async () => {
                    resolve(conn)
                }).on('close', () => {
                    this.clients.delete(host.id)
                    console.log(`ssh reconnect ${host.id}`)
                    this.createClient(host)
                }).on('error', (error) => {
                    console.log('error', host.network.node, error.message)
                    this.clients.delete(host.id)
                    resolve()
                }).connect({
                    host: host.network.address,
                    port: host.port || 22,
                    username: host.username,
                    readyTimeout: 15000,
                    privateKey
                });
            })
        }
    },

    /**
     * Service created lifecycle event handler
     */
    created() {
        this.clients = new Map()
    },

    /**
     * Service started lifecycle event handler
     */
    started() { },


    /**
     * Service stopped lifecycle event handler
     */
    async stopped() {
        for (const [name, client] of this.clients) {
            await client.end();
        }
    }
};
