/**
 * This is the definition of the linuxserver-deluge image.
 * 
 * lscr.io/linuxserver/deluge:latest
 * 
 * Parameter	Function
-p 8112	Port for webui
-p 6881	Inbound torrent traffic (See App Setup)
-p 6881/udp	Inbound torrent traffic (See App Setup)
-e PUID=1000	for UserID - see below for explanation
-e PGID=1000	for GroupID - see below for explanation
-e TZ=Etc/UTC	specify a timezone to use, see this list.
-e DELUGE_LOGLEVEL=error	set the loglevel output when running Deluge, default is info for deluged and warning for delgued-web
-v /config	deluge configs
-v /downloads	torrent download directory
 */

const FIELDS = require("../fields");

module.exports = {
    name: "linuxserver-deluge",
    namespace: "linuxserver",
    tag: "latest",
    digest: "sha256:2c5c2d6a0a2e3e6f1e4e2a1b9b2d5e7b8b4f4b9a8e3b9d0b3f4e9b2f4b9a8e3b",
    image: "lscr.io/linuxserver/deluge:latest",
    registry: "lscr.io",
    repository: "linuxserver/deluge",
    description: "Deluge is a lightweight, Free Software, cross-platform BitTorrent client.",
    imagePullPolicy: "IfNotPresent",
    imagePullSecrets: [],
    ports: [
        {
            name: "http",
            port: 8112,
            protocol: "HTTP"
        },
        {
            name: "dht",
            port: 6881,
            protocol: "UDP"
        },
        {
            name: "data",
            port: 6881,
            protocol: "TCP"
        }
    ],
    env: [
        {
            key: "PUID",
            value: "1000"
        },
        {
            key: "PGID",
            value: "1000"
        },
        {
            key: "TZ",
            value: "Etc/UTC"
        },
        {
            key: "DELUGE_LOGLEVEL",
            value: "error"
        }
    ],
    volumes: [
        {
            name: "config",
            type: "persistentVolumeClaim",
            mountPath: "/config"
        },
        {
            name: "downloads",
            type: "persistentVolumeClaim",
            mountPath: "/downloads"
        }
    ],
    resources: {
        requests: {
            cpu: 100,
            memory: 128
        },
        limits: {
            cpu: 100,
            memory: 128
        }
    },
    labels:[
        {
            "key": "app",
            "value": "linuxserver-deluge"
        },
        {
            "key": "tier",
            "value": "backend"
        }
    ]
}